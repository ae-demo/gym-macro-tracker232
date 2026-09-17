import ballerina/sql;
import ballerina/uuid;
import ballerinax/postgresql;

type WorkoutPage record {|
    WorkoutLog[] items;
    int total;
|};

# The workout_logs columns as stored — `type` is plain TEXT, converted to the
# contract's string-literal union by `toWorkoutType` rather than trusted to
# the SQL binding.
type WorkoutLogRow record {|
    string id;
    string loggedDate;
    string 'type;
    int? cardioDurationMin;
|};

type ExerciseRow record {|
    string exerciseName;
    int sets;
    int reps;
    decimal weightKg;
|};

function fetchExerciseEntries(postgresql:Client dbClient, string workoutLogId) returns ExerciseEntry[]|error {
    stream<ExerciseRow, sql:Error?> rows = dbClient->query(`
        SELECT exercise_name AS "exerciseName", sets, reps, weight_kg AS "weightKg"
        FROM exercise_entries WHERE workout_log_id = ${workoutLogId} ORDER BY id
    `);
    ExerciseEntry[] entries = [];
    check from ExerciseRow entryRow in rows
        do {
            entries.push({exerciseName: entryRow.exerciseName, sets: entryRow.sets, reps: entryRow.reps, weightKg: entryRow.weightKg});
        };
    check rows.close();
    return entries;
}

function insertExerciseEntry(postgresql:Client dbClient, string workoutLogId, ExerciseEntry exercise) returns error? {
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO exercise_entries (id, workout_log_id, exercise_name, sets, reps, weight_kg)
        VALUES (${uuid:createRandomUuid()}, ${workoutLogId}, ${exercise.exerciseName}, ${exercise.sets}, ${exercise.reps}, ${exercise.weightKg})
    `);
}

function toWorkoutLog(WorkoutLogRow row, ExerciseEntry[] exercises) returns WorkoutLog|error {
    "strength"|"cardio" workoutType = check toWorkoutType(row.'type);
    return {
        id: row.id,
        loggedDate: row.loggedDate,
        'type: workoutType,
        cardioDurationMin: row.cardioDurationMin,
        exercises: exercises
    };
}

function listWorkouts(postgresql:Client dbClient, string traineeId, string? date, int 'limit, int offset) returns WorkoutPage|error {
    sql:ParameterizedQuery whereClause = `WHERE trainee_id = ${traineeId}`;
    if date is string {
        whereClause = sql:queryConcat(whereClause, ` AND logged_date = ${date}::date`);
    }
    int total = check dbClient->queryRow(sql:queryConcat(`SELECT COUNT(*) FROM workout_logs `, whereClause));
    stream<WorkoutLogRow, sql:Error?> rows = dbClient->query(sql:queryConcat(
        `SELECT id, logged_date::text AS "loggedDate", type, cardio_duration_min AS "cardioDurationMin"
         FROM workout_logs `,
        whereClause,
        ` ORDER BY logged_date DESC, created_at DESC LIMIT ${'limit} OFFSET ${offset}`
    ));
    WorkoutLogRow[] workoutRows = [];
    check from WorkoutLogRow workoutRow in rows
        do {
            workoutRows.push(workoutRow);
        };
    check rows.close();
    WorkoutLog[] workouts = [];
    foreach WorkoutLogRow workoutRow in workoutRows {
        ExerciseEntry[] exercises = workoutRow.'type == "strength" ? check fetchExerciseEntries(dbClient, workoutRow.id) : [];
        workouts.push(check toWorkoutLog(workoutRow, exercises));
    }
    return {items: workouts, total: total};
}

function createWorkout(postgresql:Client dbClient, string traineeId, WorkoutLogInput input) returns WorkoutLog|error {
    string id = uuid:createRandomUuid();
    int? cardioDurationMin = input?.cardioDurationMin;
    WorkoutLogRow row = check dbClient->queryRow(`
        INSERT INTO workout_logs (id, trainee_id, logged_date, type, cardio_duration_min)
        VALUES (${id}, ${traineeId}, ${input.loggedDate}::date, ${input.'type}, ${cardioDurationMin})
        RETURNING id, logged_date::text AS "loggedDate", type, cardio_duration_min AS "cardioDurationMin"
    `);
    ExerciseEntry[] exercises = row.'type == "strength" ? (input?.exercises ?: []) : [];
    foreach ExerciseEntry exercise in exercises {
        check insertExerciseEntry(dbClient, id, exercise);
    }
    return toWorkoutLog(row, exercises);
}

function updateWorkout(postgresql:Client dbClient, string traineeId, string workoutId, WorkoutLogInput input) returns WorkoutLog?|error {
    int? cardioDurationMin = input?.cardioDurationMin;
    WorkoutLogRow|sql:Error result = dbClient->queryRow(`
        UPDATE workout_logs SET logged_date = ${input.loggedDate}::date, type = ${input.'type}, cardio_duration_min = ${cardioDurationMin}
        WHERE id = ${workoutId} AND trainee_id = ${traineeId}
        RETURNING id, logged_date::text AS "loggedDate", type, cardio_duration_min AS "cardioDurationMin"
    `);
    if result is sql:NoRowsError {
        return ();
    }
    if result is sql:Error {
        return result;
    }
    WorkoutLogRow row = result;
    sql:ExecutionResult _ = check dbClient->execute(`DELETE FROM exercise_entries WHERE workout_log_id = ${workoutId}`);
    ExerciseEntry[] exercises = row.'type == "strength" ? (input?.exercises ?: []) : [];
    foreach ExerciseEntry exercise in exercises {
        check insertExerciseEntry(dbClient, workoutId, exercise);
    }
    return toWorkoutLog(row, exercises);
}

function deleteWorkout(postgresql:Client dbClient, string traineeId, string workoutId) returns boolean|error {
    sql:ExecutionResult result = check dbClient->execute(`
        DELETE FROM workout_logs WHERE id = ${workoutId} AND trainee_id = ${traineeId}
    `);
    return (result.affectedRowCount ?: 0) > 0;
}
