screen TraineeDashboard "Today's macro summary against targets"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Today"
  row
    card "Calories | 1,450 / 2,200 kcal"
    card "Protein | 90 / 160 g"
    card "Carbs | 140 / 220 g"
    card "Fat | 45 / 70 g"
  chart "Today vs target" 600x260
  row
    button "Log a meal" primary -> LogMeal
    button "Log a workout" -> LogWorkout
  heading "Recent entries"
  table "Type | Item | Time | Macros"
    row "Meal | Chicken & rice | 12:30 | 620 kcal"
    row "Workout | Strength - Legs | 07:15 | -"

screen LogMeal "Manually record a meal's calories and macros"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Log a meal"
  input "Meal name"
  input "Date"
  row
    input "Calories (kcal)"
    input "Protein (g)"
  row
    input "Carbs (g)"
    input "Fat (g)"
  row
    right
      button "Cancel" -> TraineeDashboard
      button "Save meal" primary -> TraineeDashboard

screen LogWorkout "Manually record a strength or cardio workout"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Log a workout"
  select "Type: Strength | Cardio"
  input "Date"
  card "Strength exercises"
    table "Exercise | Sets | Reps | Weight (kg)"
      row "Squat | 4 | 8 | 80"
    button "Add exercise"
  input "Cardio duration (min)"
  row
    right
      button "Cancel" -> TraineeDashboard
      button "Save workout" primary -> TraineeDashboard

screen TargetsSettings "Set or update daily calorie and macro targets"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Daily targets"
  row
    input "Calories (kcal)"
    input "Protein (g)"
  row
    input "Carbs (g)"
    input "Fat (g)"
  row
    right
      button "Save targets" primary // saves in place, stays on this page

screen WeeklyHistory "The trailing 7-day nutrition and workout history"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Last 7 days"
  chart "Calories vs target, by day" 600x260
  table "Day | Calories | Protein | Carbs | Fat"
    row "Mon | 2,150 | 155 | 210 | 68"
    row "Tue | 2,300 | 160 | 230 | 72"

screen CoachAccess "Invite a coach and manage their access"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Coach access"
  row
    input "Coach email or username"
    button "Send invite" primary // creates the invite in place, list below updates
  table "Coach | Status | Invited"
    row "coach.jane@example.com | Pending | Today"
    row "coach.alex@example.com | Accepted | Last week"
  button "Revoke access" danger // revokes the accepted link in place

screen FeedbackInbox "Feedback the linked coach has left"
  navbar "Gym Macro Tracker"
  sidebar "Dashboard -> TraineeDashboard | Log Meal -> LogMeal | Log Workout -> LogWorkout | Targets -> TargetsSettings | History -> WeeklyHistory | Coach -> CoachAccess | Feedback -> FeedbackInbox"
  heading "Feedback from your coach"
  list "Sep 15: Great consistency this week, keep protein steady | Sep 12: Try adding a second cardio session"

screen CoachDashboard "Pending invites and accepted trainees"
  navbar "Gym Macro Tracker"
  sidebar "Clients -> CoachDashboard"
  heading "Invites"
  table "Trainee | Status" -> ClientProgress
    row "Sam Rivera | Pending"
  heading "Your clients"
  table "Trainee | Last active" -> ClientProgress
    row "Priya Nair | Today"
    row "Jordan Lee | Yesterday"
  button "Accept invite" primary // accepts the selected pending invite in place

screen ClientProgress "A linked trainee's targets, logs and history, read-only"
  navbar "Gym Macro Tracker"
  sidebar "Clients -> CoachDashboard"
  heading "Priya Nair"
  row
    card "Calories | 1,450 / 2,200 kcal"
    card "Protein | 90 / 160 g"
    card "Carbs | 140 / 220 g"
    card "Fat | 45 / 70 g"
  chart "Trailing 7 days" 600x260
  table "Day | Calories | Workouts"
    row "Mon | 2,150 | Strength - Legs"
    row "Tue | 2,300 | Cardio 30 min"
  textarea "Leave feedback for this trainee"
  row
    right
      button "Send feedback" primary // posts feedback in place

flow "Trainee tracking"
  role "Trainee"
  description "A trainee sets targets, logs meals and workouts, and reviews progress"
  TraineeDashboard
  LogMeal
  LogWorkout
  TargetsSettings
  WeeklyHistory
  CoachAccess
  FeedbackInbox

flow "Coach review"
  role "Coach"
  description "A coach accepts invites, reviews a client's progress and leaves feedback"
  CoachDashboard
  ClientProgress
