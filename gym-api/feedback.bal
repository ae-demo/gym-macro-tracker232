import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type FeedbackPage record {|
    Feedback[] items;
    int total;
|};

# The trainee's own received feedback, across every coach link.
function listMyFeedback(postgresql:Client dbClient, string traineeId, int 'limit, int offset) returns FeedbackPage|error {
    int total = check dbClient->queryRow(`
        SELECT COUNT(*) FROM feedback f JOIN coach_links c ON f.coach_link_id = c.id WHERE c.trainee_id = ${traineeId}
    `);
    stream<Feedback, sql:Error?> rows = dbClient->query(`
        SELECT f.id, f.coach_link_id AS "coachLinkId", f.for_date::text AS "forDate", f.message,
               to_char(f.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
        FROM feedback f JOIN coach_links c ON f.coach_link_id = c.id
        WHERE c.trainee_id = ${traineeId}
        ORDER BY f.created_at DESC
        LIMIT ${'limit} OFFSET ${offset}
    `);
    Feedback[] items = [];
    check from Feedback feedbackItem in rows
        do {
            items.push(feedbackItem);
        };
    check rows.close();
    return {items: items, total: total};
}

# Leaves feedback against `coachLinkId` — already verified `accepted` and
# owned by `authorCoachId` at the call site (`findAcceptedLink`).
function createFeedback(postgresql:Client dbClient, string coachLinkId, string authorCoachId, FeedbackInput input) returns Feedback|error {
    string id = uuid:createRandomUuid();
    Feedback feedback = check dbClient->queryRow(`
        INSERT INTO feedback (id, coach_link_id, author_coach_id, for_date, message)
        VALUES (${id}, ${coachLinkId}, ${authorCoachId}, ${input.forDate}::date, ${input.message})
        RETURNING id, coach_link_id AS "coachLinkId", for_date::text AS "forDate", message,
                  to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
    `);
    return feedback;
}
