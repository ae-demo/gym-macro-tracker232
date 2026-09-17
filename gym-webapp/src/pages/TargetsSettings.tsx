import { useEffect, useState, type JSX } from "react";
import { PageContent, PageTitle, TextField, Grid, Stack, Button, Alert, Snackbar } from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import { Can } from "../authz/gates";

export function TargetsSettingsPage(): JSX.Element {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await gymApi.GET("/me/targets", {});
      if (cancelled || !res.data) return;
      setCalories(String(res.data.caloriesKcal));
      setProtein(String(res.data.proteinG));
      setCarbs(String(res.data.carbsG));
      setFat(String(res.data.fatG));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save(): Promise<void> {
    setError(null);
    setSaving(true);
    try {
      const res = await gymApi.PUT("/me/targets", {
        body: {
          caloriesKcal: Number(calories) || 0,
          proteinG: Number(protein) || 0,
          carbsG: Number(carbs) || 0,
          fatG: Number(fat) || 0,
        },
      });
      if (res.error) {
        setError("Could not save targets — check the values and try again.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not save targets — check the values and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContent maxWidth={720}>
      <PageTitle>
        <PageTitle.Header>Daily targets</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={2}>
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
      </Stack>

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 3 }}>
        <Can op="PUT /me/targets">
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            Save targets
          </Button>
        </Can>
      </Stack>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        message="Targets saved"
      />
    </PageContent>
  );
}
