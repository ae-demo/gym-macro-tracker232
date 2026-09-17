import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

function createDbClient() returns postgresql:Client|error {
    postgresql:Client dbClient = check new (host = dbHost, port = dbPort, database = dbName, username = dbUser, password = dbPassword);
    check ensureSchema(dbClient);
    return dbClient;
}

// Constructed once, at module load, into a union rather than `check`ed
// directly at the top level: a database that is not yet reachable must not
// stop the whole module from initializing here. This package's own `bal
// test` run has no live Postgres beside it, and a `check` here would panic
// module init for every test in the package, including the ones that only
// exercise the gateway-assertion interceptor and touch no data at all. The
// failure instead surfaces as a plain `error` (mapped to a 500 by the http
// module) on the first request that actually needs the database, which in a
// real deployment is provisioned and reachable from the start.
final postgresql:Client|error dbClientResult = createDbClient();

# The shared database client, or the startup error if the database is
# unreachable. Callers `check` this and let a genuine outage become the 500
# the contract never modelled.
#
# + return - the shared client, or the error from construction
function db() returns postgresql:Client|error {
    postgresql:Client|error result = dbClientResult;
    if result is error {
        log:printError("database unavailable", 'error = result);
    }
    return result;
}

function ensureSchema(postgresql:Client dbClient) returns error? {
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS targets (
            id TEXT PRIMARY KEY,
            trainee_id TEXT NOT NULL UNIQUE,
            calories_kcal INT NOT NULL,
            protein_g INT NOT NULL,
            carbs_g INT NOT NULL,
            fat_g INT NOT NULL,
            effective_from DATE NOT NULL
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS meal_logs (
            id TEXT PRIMARY KEY,
            trainee_id TEXT NOT NULL,
            logged_date DATE NOT NULL,
            name TEXT NOT NULL,
            calories_kcal INT NOT NULL,
            protein_g INT NOT NULL,
            carbs_g INT NOT NULL,
            fat_g INT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_meal_logs_trainee_date ON meal_logs (trainee_id, logged_date)
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS workout_logs (
            id TEXT PRIMARY KEY,
            trainee_id TEXT NOT NULL,
            logged_date DATE NOT NULL,
            type TEXT NOT NULL,
            cardio_duration_min INT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_workout_logs_trainee_date ON workout_logs (trainee_id, logged_date)
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS exercise_entries (
            id TEXT PRIMARY KEY,
            workout_log_id TEXT NOT NULL REFERENCES workout_logs (id) ON DELETE CASCADE,
            exercise_name TEXT NOT NULL,
            sets INT NOT NULL,
            reps INT NOT NULL,
            weight_kg NUMERIC NOT NULL
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS coach_links (
            id TEXT PRIMARY KEY,
            trainee_id TEXT NOT NULL,
            coach_id TEXT,
            coach_email_or_username TEXT NOT NULL,
            status TEXT NOT NULL,
            invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            responded_at TIMESTAMPTZ
        )
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_coach_links_trainee ON coach_links (trainee_id)
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE INDEX IF NOT EXISTS idx_coach_links_coach ON coach_links (coach_id)
    `);
    sql:ExecutionResult _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            coach_link_id TEXT NOT NULL REFERENCES coach_links (id) ON DELETE CASCADE,
            author_coach_id TEXT NOT NULL,
            for_date DATE NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    `);
}
