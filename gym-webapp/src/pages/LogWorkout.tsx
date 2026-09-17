import { useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  PageContent,
  PageTitle,
  TextField,
  MenuItem,
  Stack,
  Button,
  Alert,
  Card,
  CardHeader,
  CardContent,
  ListingTable,
} from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { todayIso } from "../lib/format";

type WorkoutLog = components["schemas"]["WorkoutLog"];
type ExerciseEntry = components["schemas"]["ExerciseEntry"];

export function LogWorkoutPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const editing = (location.state as { workout?: WorkoutLog } | null)?.workout ?? null;

  const [type, setType] = useState<"strength" | "cardio">(editing?.type ?? "strength");
  const [date, setDate] = useState(editing?.loggedDate ?? todayIso());
  const [exercises, setExercises] = useState<ExerciseEntry[]>(
    editing?.exercises && editing.exercises.length > 0
      ? editing.exercises
      : [{ exerciseName: "Squat", sets: 4, reps: 8, weightKg: 80 }],
  );
  const [cardioDuration, setCardioDuration] = useState(String(editing?.cardioDurationMin ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateExercise(index: number, patch: Partial<ExerciseEntry>): void {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  }

  function addExercise(): void {
    setExercises((prev) => [...prev, { exerciseName: "", sets: 0, reps: 0, weightKg: 0 }]);
  }

  async function save(): Promise<void> {
    setError(null);
    if (!date) {
      setError("A date is required.");
      return;
    }
    const body =
      type === "strength"
        ? { loggedDate: date, type, exercises }
        : { loggedDate: date, type, cardioDurationMin: Number(cardioDuration) || 0 };
    setSaving(true);
    try {
      const res = editing
        ? await gymApi.PUT("/me/workouts/{workoutId}", {
            params: { path: { workoutId: editing.id } },
            body,
          })
        : await gymApi.POST("/me/workouts", { body });
      if (res.error) {
        setError("Could not save the workout — check the values and try again.");
        return;
      }
      navigate("/dashboard");
    } catch {
      setError("Could not save the workout — check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent maxWidth={720}>
      <PageTitle>
        <PageTitle.Header>Log a workout</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
        <TextField
          select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as "strength" | "cardio")}
          sx={{ maxWidth: 280 }}
        >
          <MenuItem value="strength">Strength</MenuItem>
          <MenuItem value="cardio">Cardio</MenuItem>
        </TextField>

        <TextField
          type="date"
          label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ maxWidth: 280 }}
        />

        {type === "strength" ? (
          <Card variant="outlined">
            <CardHeader title="Strength exercises" />
            <CardContent>
              <ListingTable.Container disablePaper>
                <ListingTable>
                  <ListingTable.Head>
                    <ListingTable.Row>
                      <ListingTable.Cell>Exercise</ListingTable.Cell>
                      <ListingTable.Cell>Sets</ListingTable.Cell>
                      <ListingTable.Cell>Reps</ListingTable.Cell>
                      <ListingTable.Cell>Weight (kg)</ListingTable.Cell>
                    </ListingTable.Row>
                  </ListingTable.Head>
                  <ListingTable.Body>
                    {exercises.map((ex, i) => (
                      <ListingTable.Row key={i}>
                        <ListingTable.Cell>
                          <TextField
                            size="small"
                            value={ex.exerciseName}
                            onChange={(e) => updateExercise(i, { exerciseName: e.target.value })}
                          />
                        </ListingTable.Cell>
                        <ListingTable.Cell>
                          <TextField
                            size="small"
                            type="number"
                            value={ex.sets}
                            onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })}
                            sx={{ width: 90 }}
                          />
                        </ListingTable.Cell>
                        <ListingTable.Cell>
                          <TextField
                            size="small"
                            type="number"
                            value={ex.reps}
                            onChange={(e) => updateExercise(i, { reps: Number(e.target.value) })}
                            sx={{ width: 90 }}
                          />
                        </ListingTable.Cell>
                        <ListingTable.Cell>
                          <TextField
                            size="small"
                            type="number"
                            value={ex.weightKg}
                            onChange={(e) => updateExercise(i, { weightKg: Number(e.target.value) })}
                            sx={{ width: 110 }}
                          />
                        </ListingTable.Cell>
                      </ListingTable.Row>
                    ))}
                  </ListingTable.Body>
                </ListingTable>
              </ListingTable.Container>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={addExercise}>
                Add exercise
              </Button>
            </CardContent>
          </Card>
        ) : (
          <TextField
            type="number"
            label="Cardio duration (min)"
            value={cardioDuration}
            onChange={(e) => setCardioDuration(e.target.value)}
            sx={{ maxWidth: 280 }}
          />
        )}
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/dashboard")}>
          Cancel
        </Button>
        <Can op={editing ? "PUT /me/workouts/{workoutId}" : "POST /me/workouts"}>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            Save workout
          </Button>
        </Can>
      </Stack>
    </PageContent>
  );
}
