import { useState, type JSX } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  PageContent,
  PageTitle,
  TextField,
  Stack,
  Button,
  Alert,
  Grid,
  Form,
} from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { todayIso } from "../lib/format";

type MealLog = components["schemas"]["MealLog"];

export function LogMealPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const editing = (location.state as { meal?: MealLog } | null)?.meal ?? null;

  const [name, setName] = useState(editing?.name ?? "");
  const [date, setDate] = useState(editing?.loggedDate ?? todayIso());
  const [calories, setCalories] = useState(String(editing?.caloriesKcal ?? ""));
  const [protein, setProtein] = useState(String(editing?.proteinG ?? ""));
  const [carbs, setCarbs] = useState(String(editing?.carbsG ?? ""));
  const [fat, setFat] = useState(String(editing?.fatG ?? ""));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    setError(null);
    if (!name.trim() || !date) {
      setError("Meal name and date are required.");
      return;
    }
    const body = {
      loggedDate: date,
      name: name.trim(),
      caloriesKcal: Number(calories) || 0,
      proteinG: Number(protein) || 0,
      carbsG: Number(carbs) || 0,
      fatG: Number(fat) || 0,
    };
    setSaving(true);
    try {
      const res = editing
        ? await gymApi.PUT("/me/meals/{mealId}", {
            params: { path: { mealId: editing.id } },
            body,
          })
        : await gymApi.POST("/me/meals", { body });
      if (res.error) {
        setError("Could not save the meal — check the values and try again.");
        return;
      }
      navigate("/dashboard");
    } catch {
      setError("Could not save the meal — check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent maxWidth={720}>
      <PageTitle>
        <PageTitle.Header>Log a meal</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Form.Section>
        <Form.Stack spacing={2}>
          <TextField label="Meal name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
          <TextField
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Calories (kcal)"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Protein (g)"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Carbs (g)"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                type="number"
                label="Fat (g)"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        </Form.Stack>
      </Form.Section>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button variant="outlined" onClick={() => navigate("/dashboard")}>
          Cancel
        </Button>
        <Can op={editing ? "PUT /me/meals/{mealId}" : "POST /me/meals"}>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            Save meal
          </Button>
        </Can>
      </Stack>
    </PageContent>
  );
}
