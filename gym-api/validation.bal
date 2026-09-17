// Input validation for the two "create" operations the contract gives a 400
// to (`POST /me/meals`, `POST /me/workouts`, `PUT /me/targets`). The edit
// operations (`PUT /me/meals/{id}`, `PUT /me/workouts/{id}`) declare no 400
// in openapi.yaml — only 404/401 — so a malformed edit payload is left to
// surface as the generic `error` the framework maps to a 500, exactly the
// "upstream failure the contract never modelled" case (`ballerina` skill).

function validateMacros(int caloriesKcal, int proteinG, int carbsG, int fatG) returns string? {
    if caloriesKcal < 0 || proteinG < 0 || carbsG < 0 || fatG < 0 {
        return "calories and macro grams must not be negative";
    }
    return ();
}

function validateMealInput(MealLogInput input) returns string? {
    if input.name.trim() == "" {
        return "name must not be empty";
    }
    if !isValidDate(input.loggedDate) {
        return "loggedDate must be a valid date";
    }
    return validateMacros(input.caloriesKcal, input.proteinG, input.carbsG, input.fatG);
}

function validateWorkoutInput(WorkoutLogInput input) returns string? {
    if !isValidDate(input.loggedDate) {
        return "loggedDate must be a valid date";
    }
    if input.'type == "strength" {
        ExerciseEntry[] exercises = input?.exercises ?: [];
        if exercises.length() == 0 {
            return "a strength workout needs at least one exercise";
        }
        foreach ExerciseEntry exercise in exercises {
            if exercise.sets <= 0 || exercise.reps <= 0 || exercise.weightKg < 0d {
                return "exercise sets and reps must be positive and weightKg must not be negative";
            }
        }
        return ();
    }
    int? cardioDurationMin = input?.cardioDurationMin;
    if cardioDurationMin is () || cardioDurationMin < 0 {
        return "a cardio workout needs a non-negative cardioDurationMin";
    }
    return ();
}

function validateCoachLinkInput(CoachLinkInput input) returns string? {
    if input.coachEmailOrUsername.trim() == "" {
        return "coachEmailOrUsername must not be empty";
    }
    return ();
}
