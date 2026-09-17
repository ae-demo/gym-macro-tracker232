import ballerinax/postgresql;

# `date`'s logged totals against the trainee's current target. A trainee (or
# their linked coach) who has never set one sees a zero-valued target rather
# than an error — see `emptyTarget`.
function computeDailySummary(postgresql:Client dbClient, string traineeId, string date) returns DailySummary|error {
    Target? target = check fetchTarget(dbClient, traineeId);
    Target effectiveTarget = target ?: emptyTarget(date);
    DailySummary_totals totals = check mealTotalsForDate(dbClient, traineeId, date);
    return {
        date: date,
        target: effectiveTarget,
        totals: totals
    };
}

# The trailing 7 days (today and the 6 before it), oldest first.
function weeklyHistory(postgresql:Client dbClient, string traineeId) returns WeeklyHistory|error {
    string today = todayDate();
    DailySummary[] days = [];
    foreach int daysAgo in int:range(6, -1, -1) {
        string day = check dateOffset(today, -daysAgo);
        days.push(check computeDailySummary(dbClient, traineeId, day));
    }
    return {days: days};
}
