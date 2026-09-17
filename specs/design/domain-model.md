# Domain Model

The core entities behind targets, logs, coaching links, and feedback.

```mermaid
erDiagram
    TRAINEE ||--o| TARGET : sets
    TRAINEE ||--o{ MEAL_LOG : logs
    TRAINEE ||--o{ WORKOUT_LOG : logs
    WORKOUT_LOG ||--o{ EXERCISE_ENTRY : contains
    TRAINEE ||--o{ COACH_LINK : has
    COACH ||--o{ COACH_LINK : has
    COACH_LINK ||--o{ FEEDBACK : carries

    TRAINEE {
        string id
        string displayName
        string email
    }
    COACH {
        string id
        string displayName
        string email
    }
    TARGET {
        string id
        string traineeId
        int caloriesKcal
        int proteinG
        int carbsG
        int fatG
        date effectiveFrom
    }
    MEAL_LOG {
        string id
        string traineeId
        date loggedDate
        string name
        int caloriesKcal
        int proteinG
        int carbsG
        int fatG
    }
    WORKOUT_LOG {
        string id
        string traineeId
        date loggedDate
        string type
        int cardioDurationMin
    }
    EXERCISE_ENTRY {
        string id
        string workoutLogId
        string exerciseName
        int sets
        int reps
        number weightKg
    }
    COACH_LINK {
        string id
        string traineeId
        string coachEmailOrUsername
        string status
        datetime invitedAt
        datetime respondedAt
    }
    FEEDBACK {
        string id
        string coachLinkId
        string authorCoachId
        date forDate
        string message
        datetime createdAt
    }
```

A `WORKOUT_LOG` is either strength (one or more `EXERCISE_ENTRY` rows) or cardio
(`cardioDurationMin` set, no exercise entries). `COACH_LINK.status` moves
`pending -> accepted` (or `revoked`); a Coach only reaches a Trainee's data
through an `accepted` link. `FEEDBACK` is always authored by the Coach side of
an accepted `COACH_LINK` and read by the linked Trainee.