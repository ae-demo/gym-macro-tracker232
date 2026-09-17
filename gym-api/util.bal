import ballerina/http;
import ballerina/time;

// ---- Error-response builders -------------------------------------------
//
// Every 4xx the contract declares carries the same `Error` shape
// ({code, message}). The gateway already settled WHETHER a request may
// happen; a handler only ever answers "is this row yours" (404) or "is this
// input usable" (400) — never a 403 (`api-management`).

function toUnauthorized(http:Unauthorized 'unauthorized) returns ErrorUnauthorized => {
    body: {code: 401, message: "not signed in"}
};

function notFound(string message) returns ErrorNotFound => {
    body: {code: 404, message: message}
};

function badRequest(string message) returns ErrorBadRequest => {
    body: {code: 400, message: message}
};

// ---- Pagination ----------------------------------------------------------

function paginationNext(string path, int 'limit, int offset, int count) returns string? {
    int nextOffset = offset + 'limit;
    if nextOffset >= count {
        return ();
    }
    return string `${path}?limit=${'limit}&offset=${nextOffset}`;
}

function paginationPrevious(string path, int 'limit, int offset) returns string? {
    if offset <= 0 {
        return ();
    }
    int previousOffset = offset - 'limit;
    if previousOffset < 0 {
        previousOffset = 0;
    }
    return string `${path}?limit=${'limit}&offset=${previousOffset}`;
}

// ---- Dates -----------------------------------------------------------------
//
// Dates travel as plain `YYYY-MM-DD` strings, matching the OpenAPI `date`
// format exactly, so every query and response uses this representation
// directly rather than a `time:Date` record.

function todayDate() returns string {
    time:Utc now = time:utcNow();
    return civilDateString(time:utcToCivil(now));
}

function civilDateString(time:Civil civil) returns string {
    return string `${civil.year}-${padTwo(civil.month)}-${padTwo(civil.day)}`;
}

function padTwo(int n) returns string => n < 10 ? string `0${n}` : n.toString();

# `date` shifted by `deltaDays` (negative moves into the past).
#
# + date - a `YYYY-MM-DD` date
# + deltaDays - the number of days to add (negative to subtract)
# + return - the shifted `YYYY-MM-DD` date, or an error when `date` does not parse
function dateOffset(string date, int deltaDays) returns string|error {
    time:Civil civil = check time:civilFromString(date + "T00:00:00Z");
    time:Civil shifted = check time:civilAddDuration(civil, {days: deltaDays});
    return civilDateString(shifted);
}

function isValidDate(string date) returns boolean {
    time:Civil|error civil = time:civilFromString(date + "T00:00:00Z");
    return civil is time:Civil;
}

// ---- Enum-shaped text columns ---------------------------------------------
//
// Postgres stores these as plain TEXT; converting the fetched string into the
// contract's string-literal union happens once, here, rather than trusting
// the SQL binding to do it implicitly.

function toWorkoutType(string value) returns "strength"|"cardio"|error {
    if value == "strength" {
        return "strength";
    }
    if value == "cardio" {
        return "cardio";
    }
    return error("unrecognised workout type: " + value);
}

function toLinkStatus(string value) returns "pending"|"accepted"|"revoked"|error {
    if value == "pending" {
        return "pending";
    }
    if value == "accepted" {
        return "accepted";
    }
    if value == "revoked" {
        return "revoked";
    }
    return error("unrecognised coach-link status: " + value);
}
