import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type CoachLinkPage record {|
    CoachLink[] items;
    int total;
|};

# `coach_links` as stored — `status` is plain TEXT, converted to the
# contract's string-literal union by `toLinkStatus`. Timestamps are cast to
# RFC 3339 text in SQL rather than round-tripped through `time:Utc`, so the
# row shape already matches the wire shape.
type CoachLinkRow record {|
    string id;
    string traineeId;
    string? coachId;
    string coachEmailOrUsername;
    string status;
    string invitedAt;
    string? respondedAt;
|};

// A `sql:ParameterizedQuery` fragment with no `${}` placeholders of its own —
// reusable raw SQL text, composed with `sql:queryConcat` rather than spliced
// in through string interpolation (which would bind it as a *parameter*
// value instead of literal SQL).
final sql:ParameterizedQuery COACH_LINK_SELECT = `SELECT id, trainee_id AS "traineeId", coach_id AS "coachId",
    coach_email_or_username AS "coachEmailOrUsername", status,
    to_char(invited_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "invitedAt",
    CASE WHEN responded_at IS NULL THEN NULL
         ELSE to_char(responded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') END AS "respondedAt"
    FROM coach_links `;

function toCoachLink(CoachLinkRow row) returns CoachLink|error {
    "pending"|"accepted"|"revoked" status = check toLinkStatus(row.status);
    return {
        id: row.id,
        traineeId: row.traineeId,
        coachEmailOrUsername: row.coachEmailOrUsername,
        status: status,
        invitedAt: row.invitedAt,
        respondedAt: row.respondedAt
    };
}

function fetchCoachLinkById(postgresql:Client dbClient, string id) returns CoachLink?|error {
    CoachLinkRow|sql:Error row = dbClient->queryRow(sql:queryConcat(COACH_LINK_SELECT, `WHERE id = ${id}`));
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return check toCoachLink(row);
}

# Creates a `pending` invite addressed to `coachAddress`, resolved later at
# accept-time against the accepting caller's own login name (there is no
# platform directory to look the address up against here). Returns a
# validation message instead of the link when one already active exists.
function createCoachLinkInvite(postgresql:Client dbClient, string traineeId, string coachAddress) returns CoachLink|string|error {
    string normalizedAddress = coachAddress.trim();
    int existingActive = check dbClient->queryRow(`
        SELECT COUNT(*) FROM coach_links
        WHERE trainee_id = ${traineeId} AND lower(coach_email_or_username) = lower(${normalizedAddress})
              AND status IN ('pending', 'accepted')
    `);
    if existingActive > 0 {
        return "a coach link to this address is already active";
    }
    string id = uuid:createRandomUuid();
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO coach_links (id, trainee_id, coach_email_or_username, status)
        VALUES (${id}, ${traineeId}, ${normalizedAddress}, 'pending')
    `);
    CoachLink? link = check fetchCoachLinkById(dbClient, id);
    if link is () {
        return error("coach link not found immediately after insert");
    }
    return link;
}

# The caller's own links, as either side: sent as a trainee, accepted as a
# coach, or still pending against the caller's own login name.
function listMyCoachLinks(postgresql:Client dbClient, GatewayCaller caller, string? status, int 'limit, int offset) returns CoachLinkPage|error {
    sql:ParameterizedQuery whereClause = `WHERE (trainee_id = ${caller.userId} OR coach_id = ${caller.userId}
        OR lower(coach_email_or_username) = lower(${caller.username}))`;
    if status is string {
        whereClause = sql:queryConcat(whereClause, ` AND status = ${status}`);
    }
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT COUNT(*) FROM coach_links `, whereClause));
    stream<CoachLinkRow, sql:Error?> rows = dbClient->query(sql:queryConcat(
        COACH_LINK_SELECT, whereClause, ` ORDER BY invited_at DESC LIMIT ${'limit} OFFSET ${offset}`
    ));
    CoachLink[] links = [];
    check from CoachLinkRow row in rows
        do {
            links.push(check toCoachLink(row));
        };
    check rows.close();
    return {items: links, total: total};
}

# The coach's accepted trainee links only — `/me/clients`' reach.
function listMyClients(postgresql:Client dbClient, string coachId, int 'limit, int offset) returns CoachLinkPage|error {
    sql:ParameterizedQuery whereClause = `WHERE coach_id = ${coachId} AND status = 'accepted'`;
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT COUNT(*) FROM coach_links `, whereClause));
    stream<CoachLinkRow, sql:Error?> rows = dbClient->query(sql:queryConcat(
        COACH_LINK_SELECT, whereClause, ` ORDER BY responded_at DESC LIMIT ${'limit} OFFSET ${offset}`
    ));
    CoachLink[] links = [];
    check from CoachLinkRow row in rows
        do {
            links.push(check toCoachLink(row));
        };
    check rows.close();
    return {items: links, total: total};
}

# Accepts a pending invite addressed to the caller's own login name — never a
# client-supplied trainee id. `()` when no such pending invite exists.
function acceptCoachLink(postgresql:Client dbClient, string linkId, GatewayCaller caller) returns CoachLink?|error {
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE coach_links SET status = 'accepted', coach_id = ${caller.userId}, responded_at = now()
        WHERE id = ${linkId} AND status = 'pending' AND lower(coach_email_or_username) = lower(${caller.username})
    `);
    if (result.affectedRowCount ?: 0) == 0 {
        return ();
    }
    return fetchCoachLinkById(dbClient, linkId);
}

# Revokes a link the caller owns as trainee, cutting off the coach's read and
# feedback access immediately. `()` when no such link (owned by this caller,
# still usable) exists.
function revokeCoachLink(postgresql:Client dbClient, string linkId, string traineeId) returns CoachLink?|error {
    sql:ExecutionResult result = check dbClient->execute(`
        UPDATE coach_links SET status = 'revoked', responded_at = now()
        WHERE id = ${linkId} AND trainee_id = ${traineeId} AND status IN ('pending', 'accepted')
    `);
    if (result.affectedRowCount ?: 0) == 0 {
        return ();
    }
    return fetchCoachLinkById(dbClient, linkId);
}

# The one check every `/me/clients/{traineeId}/...` operation gates on: an
# `accepted` link from this coach to this trainee. `()` (never a 403) is what
# a 404 is built from at the call site.
function findAcceptedLink(postgresql:Client dbClient, string coachId, string traineeId) returns CoachLink?|error {
    CoachLinkRow|sql:Error row = dbClient->queryRow(sql:queryConcat(
        COACH_LINK_SELECT, `WHERE coach_id = ${coachId} AND trainee_id = ${traineeId} AND status = 'accepted'`
    ));
    if row is sql:NoRowsError {
        return ();
    }
    if row is sql:Error {
        return row;
    }
    return check toCoachLink(row);
}
