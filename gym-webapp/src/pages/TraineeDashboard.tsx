import { useCallback, useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router";
import {
  PageContent,
  PageTitle,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Alert,
  Skeleton,
  ListingTable,
  IconButton,
  Tooltip,
} from "@wso2/oxygen-ui";
import { Pencil, Trash2 } from "@wso2/oxygen-ui-icons-react";
import { BarChart } from "@wso2/oxygen-ui-charts-react";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { formatDate } from "../lib/format";

type DailySummary = components["schemas"]["DailySummary"];
type MealLog = components["schemas"]["MealLog"];
type WorkoutLog = components["schemas"]["WorkoutLog"];

interface Entry {
  id: string;
  type: "Meal" | "Workout";
  item: string;
  date: string;
  macros: string;
  meal?: MealLog;
  workout?: WorkoutLog;
}

export function TraineeDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, mealsRes, workoutsRes] = await Promise.all([
        gymApi.GET("/me/summary", {}),
        gymApi.GET("/me/meals", { params: { query: { limit: 5 } } }),
        gymApi.GET("/me/workouts", { params: { query: { limit: 5 } } }),
      ]);
      if (summaryRes.data) setSummary(summaryRes.data);
      const meals: MealLog[] = mealsRes.data?.data ?? [];
      const workouts: WorkoutLog[] = workoutsRes.data?.data ?? [];
      const merged: Entry[] = [
        ...meals.map((m) => ({
          id: `meal-${m.id}`,
          type: "Meal" as const,
          item: m.name,
          date: m.loggedDate,
          macros: `${m.caloriesKcal} kcal`,
          meal: m,
        })),
        ...workouts.map((w) => ({
          id: `workout-${w.id}`,
          type: "Workout" as const,
          item:
            w.type === "cardio"
              ? "Cardio"
              : (w.exercises?.[0]?.exerciseName ?? "Strength"),
          date: w.loggedDate,
          macros: "-",
          workout: w,
        })),
      ]
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 5);
      setEntries(merged);
    } catch {
      setError("Could not load today's summary.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function editEntry(e: Entry): void {
    if (e.meal) navigate("/log-meal", { state: { meal: e.meal } });
    else if (e.workout) navigate("/log-workout", { state: { workout: e.workout } });
  }

  async function deleteEntry(e: Entry): Promise<void> {
    if (e.meal) {
      await gymApi.DELETE("/me/meals/{mealId}", { params: { path: { mealId: e.meal.id } } });
    } else if (e.workout) {
      await gymApi.DELETE("/me/workouts/{workoutId}", { params: { path: { workoutId: e.workout.id } } });
    }
    await load();
  }

  const stats: { label: string; value: number; target: number; unit: string }[] = summary
    ? [
        { label: "Calories", value: summary.totals?.caloriesKcal ?? 0, target: summary.target.caloriesKcal, unit: "kcal" },
        { label: "Protein", value: summary.totals?.proteinG ?? 0, target: summary.target.proteinG, unit: "g" },
        { label: "Carbs", value: summary.totals?.carbsG ?? 0, target: summary.target.carbsG, unit: "g" },
        { label: "Fat", value: summary.totals?.fatG ?? 0, target: summary.target.fatG, unit: "g" },
      ]
    : [];

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Today</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Skeleton variant="rounded" height={96} />
              </Grid>
            ))
          : stats.map((s) => (
              <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="overline" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h5">
                      {s.value.toLocaleString()} / {s.target.toLocaleString()} {s.unit}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
      </Grid>

      {summary && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Today vs target
            </Typography>
            <BarChart
              data={stats.map((s) => ({ metric: s.label, Actual: s.value, Target: s.target }))}
              xAxisDataKey="metric"
              bars={[{ dataKey: "Actual", name: "Actual" }, { dataKey: "Target", name: "Target" }]}
              legend={{ show: true, align: "center", verticalAlign: "top" }}
              height={260}
              width={600}
              grid={{ show: false }}
            />
          </CardContent>
        </Card>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" onClick={() => navigate("/log-meal")}>
          Log a meal
        </Button>
        <Button variant="outlined" onClick={() => navigate("/log-workout")}>
          Log a workout
        </Button>
      </Stack>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Recent entries
      </Typography>
      <ListingTable.Container disablePaper>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Type</ListingTable.Cell>
              <ListingTable.Cell>Item</ListingTable.Cell>
              <ListingTable.Cell>Date</ListingTable.Cell>
              <ListingTable.Cell>Macros</ListingTable.Cell>
              <ListingTable.Cell align="right">Actions</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {entries.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>
                  <ListingTable.EmptyState
                    title="No entries yet"
                    description="Log a meal or a workout to see it here."
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              entries.map((e) => (
                <ListingTable.Row key={e.id}>
                  <ListingTable.Cell>{e.type}</ListingTable.Cell>
                  <ListingTable.Cell>{e.item}</ListingTable.Cell>
                  <ListingTable.Cell>{formatDate(e.date)}</ListingTable.Cell>
                  <ListingTable.Cell>{e.macros}</ListingTable.Cell>
                  <ListingTable.Cell align="right">
                    <Can op={e.meal ? "PUT /me/meals/{mealId}" : "PUT /me/workouts/{workoutId}"}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => editEntry(e)}>
                          <Pencil size={16} />
                        </IconButton>
                      </Tooltip>
                    </Can>
                    <Can op={e.meal ? "DELETE /me/meals/{mealId}" : "DELETE /me/workouts/{workoutId}"}>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => void deleteEntry(e)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Can>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
