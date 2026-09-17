import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type MealPage record {|
    MealLog[] items;
    int total;
|};

function listMeals(postgresql:Client dbClient, string traineeId, string? date, int 'limit, int offset) returns MealPage|error {
    sql:ParameterizedQuery whereClause = `WHERE trainee_id = ${traineeId}`;
    if date is string {
        whereClause = sql:queryConcat(whereClause, ` AND logged_date = ${date}::date`);
    }
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT COUNT(*) FROM meal_logs `, whereClause));
    stream<MealLog, sql:Error?> rows = dbClient->query(sql:queryConcat(
        `SELECT id, logged_date::text AS "loggedDate", name, calories_kcal AS "caloriesKcal",
                protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG"
         FROM meal_logs `,
        whereClause,
        ` ORDER BY logged_date DESC, created_at DESC LIMIT ${'limit} OFFSET ${offset}`
    ));
    MealLog[] meals = [];
    check from MealLog meal in rows
        do {
            meals.push(meal);
        };
    check rows.close();
    return {items: meals, total: total};
}

function createMeal(postgresql:Client dbClient, string traineeId, MealLogInput input) returns MealLog|error {
    string id = uuid:createRandomUuid();
    MealLog meal = check dbClient->queryRow(`
        INSERT INTO meal_logs (id, trainee_id, logged_date, name, calories_kcal, protein_g, carbs_g, fat_g)
        VALUES (${id}, ${traineeId}, ${input.loggedDate}::date, ${input.name}, ${input.caloriesKcal}, ${input.proteinG}, ${input.carbsG}, ${input.fatG})
        RETURNING id, logged_date::text AS "loggedDate", name, calories_kcal AS "caloriesKcal",
                  protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG"
    `);
    return meal;
}

function updateMeal(postgresql:Client dbClient, string traineeId, string mealId, MealLogInput input) returns MealLog?|error {
    MealLog|sql:Error result = dbClient->queryRow(`
        UPDATE meal_logs SET logged_date = ${input.loggedDate}::date, name = ${input.name},
            calories_kcal = ${input.caloriesKcal}, protein_g = ${input.proteinG}, carbs_g = ${input.carbsG}, fat_g = ${input.fatG}
        WHERE id = ${mealId} AND trainee_id = ${traineeId}
        RETURNING id, logged_date::text AS "loggedDate", name, calories_kcal AS "caloriesKcal",
                  protein_g AS "proteinG", carbs_g AS "carbsG", fat_g AS "fatG"
    `);
    if result is sql:NoRowsError {
        return ();
    }
    if result is sql:Error {
        return result;
    }
    return result;
}

function deleteMeal(postgresql:Client dbClient, string traineeId, string mealId) returns boolean|error {
    sql:ExecutionResult result = check dbClient->execute(`
        DELETE FROM meal_logs WHERE id = ${mealId} AND trainee_id = ${traineeId}
    `);
    return (result.affectedRowCount ?: 0) > 0;
}

# Sums of a trainee's macro totals actually logged on `date`.
function mealTotalsForDate(postgresql:Client dbClient, string traineeId, string date) returns DailySummary_totals|error {
    DailySummary_totals totals = check dbClient->queryRow(`
        SELECT COALESCE(SUM(calories_kcal), 0)::int AS "caloriesKcal",
               COALESCE(SUM(protein_g), 0)::int AS "proteinG",
               COALESCE(SUM(carbs_g), 0)::int AS "carbsG",
               COALESCE(SUM(fat_g), 0)::int AS "fatG"
        FROM meal_logs WHERE trainee_id = ${traineeId} AND logged_date = ${date}::date
    `);
    return totals;
}
