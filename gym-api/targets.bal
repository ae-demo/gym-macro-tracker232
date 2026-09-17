import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

# The trainee's own target, or `()` when they have never set one.
#
# + dbClient - the shared database client
# + traineeId - the assertion's `sub` for the trainee whose target this is
# + return - the target, `()` when none is set, or the underlying db error
function fetchTarget(postgresql:Client dbClient, string traineeId) returns Target?|error {
    Target|sql:Error result = dbClient->queryRow(`
        SELECT id, calories_kcal AS "caloriesKcal", protein_g AS "proteinG", carbs_g AS "carbsG",
               fat_g AS "fatG", effective_from::text AS "effectiveFrom"
        FROM targets WHERE trainee_id = ${traineeId}
    `);
    if result is sql:NoRowsError {
        return ();
    }
    if result is sql:Error {
        return result;
    }
    return result;
}

# Creates the trainee's target if none exists yet, or overwrites the one row
# they may have (`TRAINEE ||--o| TARGET` in the domain model — at most one
# target per trainee), marking it effective from today.
function upsertTarget(postgresql:Client dbClient, string traineeId, int caloriesKcal, int proteinG, int carbsG, int fatG) returns Target|error {
    string id = uuid:createRandomUuid();
    Target target = check dbClient->queryRow(`
        INSERT INTO targets (id, trainee_id, calories_kcal, protein_g, carbs_g, fat_g, effective_from)
        VALUES (${id}, ${traineeId}, ${caloriesKcal}, ${proteinG}, ${carbsG}, ${fatG}, CURRENT_DATE)
        ON CONFLICT (trainee_id) DO UPDATE SET
            calories_kcal = EXCLUDED.calories_kcal,
            protein_g = EXCLUDED.protein_g,
            carbs_g = EXCLUDED.carbs_g,
            fat_g = EXCLUDED.fat_g,
            effective_from = EXCLUDED.effective_from
        RETURNING id, calories_kcal AS "caloriesKcal", protein_g AS "proteinG", carbs_g AS "carbsG",
                  fat_g AS "fatG", effective_from::text AS "effectiveFrom"
    `);
    return target;
}

# A zero-valued placeholder for a trainee (own or a linked client's) who has
# never set a target. Only `/me/targets` itself declares a 404 for this case
# ("No targets set yet"); the coach-facing `/me/clients/{id}/targets` and both
# summary/history views have no such error in openapi.yaml, so they fall back
# to this rather than inventing a status code the contract never declared.
function emptyTarget(string asOfDate) returns Target => {
    id: "",
    caloriesKcal: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    effectiveFrom: asOfDate
};
