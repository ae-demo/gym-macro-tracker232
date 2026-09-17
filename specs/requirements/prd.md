# Gym Macro Tracker — PRD

## Problem Statement

Trainees who want to manage their nutrition and training in one place today juggle
separate apps or spreadsheets for calorie/macro targets, meal logging, and workout
logging — and have no simple way to let a coach see their progress and leave
feedback without handing over full account access or exporting data manually.

## Solution

A web application where a Trainee signs in with their own platform account, sets
personal daily calorie and macro (protein, carbs, fat) targets, manually logs meals
and workouts, and sees a daily summary against targets plus a weekly history. A
Trainee can invite a Coach to get read-only access to their logs and progress and
to leave feedback; the Trainee controls that access and can revoke it at any time.

## Actors

- **Trainee** — signs in with their own platform account; sets their own daily
calorie/macro targets; logs meals and workouts; views their own daily summary and
weekly history; invites a Coach, views the Coach's feedback, and revokes Coach
access at any time.
- **Coach** — signs in with their own platform account; accepts invites from
Trainees; has read-only access to each accepting Trainee's logs and progress
(targets, meals, workouts, summaries, history); leaves feedback on a Trainee's
progress. Never sets targets or edits a Trainee's logs.

## User Stories

1. As a Trainee, I want to sign in with my own platform account, so that my
 nutrition and workout data is private to me.
2. As a Trainee, I want to set my daily calorie and macro (protein, carbs, fat)
 targets, so that I have a baseline to track against.
3. As a Trainee, I want to update my targets whenever my goals change, so that my
 tracking stays accurate.
4. As a Trainee, I want to manually log a meal with its calories and macros, so
 that I can record what I ate without relying on a food database.
5. As a Trainee, I want to manually log a workout — either strength exercises with
 sets/reps/weight or a cardio duration — so that I can record my training.
6. As a Trainee, I want to edit or delete a meal or workout log entry, so that I
 can correct mistakes.
7. As a Trainee, I want to see a daily summary of my logged calories and macros
 against my targets, so that I know how today is going.
8. As a Trainee, I want to see a weekly history of my nutrition and workout logs,
 so that I can review my progress over time.
9. As a Trainee, I want to invite a Coach by their platform email or username, so
 that they can review my progress.
10. As a Coach, I want to see invites sent to me and accept the ones I want, so
 that I control which Trainees I take on.
11. As a Trainee, I want to revoke a Coach's access at any time, so that I stay in
 control of who can see my data.
12. As a Coach, I want to view an accepting Trainee's targets, logs, daily summary,
 and weekly history (read-only), so that I can assess their progress.
13. As a Coach, I want to leave feedback for a Trainee, so that I can guide their
 nutrition and training.
14. As a Trainee, I want to view feedback my Coach has left, so that I can act on
 their guidance.

## Product Decisions

- Sign-in for both Trainees and Coaches is via the platform identity provider
(Thunder SSO) — no separate account system.
- Nutrition is manually entered only — no external food database, no barcode
scanning, no calorie-lookup integration.
- A workout entry is either strength (exercises with sets/reps/weight) or cardio
(a duration); no other exercise structure is tracked.
- A Trainee has at most one active Coach at a time; a single Coach may be invited
by, and follow, several different Trainees concurrently. *assumed*
- A Trainee invites a Coach by the Coach's existing platform email or username;
the Coach must already hold a platform account. *assumed*
- An invite is pending until the Coach explicitly accepts it; only after
acceptance does the Coach gain read access and the ability to leave feedback.
*assumed*
- Macros are recorded in grams and calories in kcal. *assumed*
- Weekly history shows the trailing 7 days ending today, not a fixed calendar
week. *assumed*
- Coaches have strictly read access to targets, meals, and workouts, plus the
ability to add feedback; they can never set or edit a Trainee's targets or log
entries.

## Out of Scope

- Barcode scanning or any external food/nutrition database integration.
- Body-metric tracking (weight, body-fat %, measurements, progress photos).
- Social feeds, following/discovery, or any public sharing of logs.
- Payments, subscriptions, or billing.
- A Trainee having more than one concurrent active Coach.
- Native mobile apps (web only).

## Open Questions

*(none — outstanding judgment calls above are recorded as decisions and tagged
`*assumed*` where the user has not yet confirmed them)*