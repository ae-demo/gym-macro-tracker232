import { useEffect, useState, type JSX } from "react";
import { useLocation, useParams } from "react-router";
import {
  PageContent,
  PageTitle,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Stack,
  Button,
  Alert,
  ListingTable,
} from "@wso2/oxygen-ui";
import { LineChart } from "@wso2/oxygen-ui-charts-react";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { weekday, todayIso } from "../lib/format";

type DailySummary = components["schemas"]["DailySummary"];

export function ClientProgressPage(): JSX.Element {
  const { traineeId = "" } = useParams<{ traineeId: string }>();
  const location = useLocation();
  const traineeName = (location.state as { traineeName?: string } | null)?.traineeName ?? traineeId;

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [days, setDays] = useState<DailySummary[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [summaryRes, historyRes] = await Promise.all([
          gymApi.GET("/me/clients/{traineeId}/summary", { params: { path: { traineeId } } }),
          gymApi.GET("/me/clients/{traineeId}/history", { params: { path: { traineeId } } }),
        ]);
        if (cancelled) return;
        if (summaryRes.response.status === 404 || historyRes.response.status === 404) {
          setNotFound(true);
          return;
        }
        if (summaryRes.data) setSummary(summaryRes.data);
        if (historyRes.data) setDays(historyRes.data.days);
      } catch {
        if (!cancelled) setError("Could not load this trainee's progress.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [traineeId]);

  async function sendFeedback(): Promise<void> {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await gymApi.POST("/me/clients/{traineeId}/feedback", {
        params: { path: { traineeId } },
        body: { forDate: todayIso(), message: message.trim() },
      });
      if (!res.error) {
        setMessage("");
        setSent(true);
      }
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <PageContent>
        <PageTitle>
          <PageTitle.Header>{traineeName}</PageTitle.Header>
        </PageTitle>
        <Alert severity="info">There is no accepted coaching link with this trainee yet.</Alert>
      </PageContent>
    );
  }

  const stats = summary
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
        <PageTitle.Header>{traineeName}</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s) => (
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

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Trailing 7 days
          </Typography>
          <LineChart
            data={days.map((d) => ({ day: weekday(d.date), Calories: d.totals?.caloriesKcal ?? 0 }))}
            xAxisDataKey="day"
            lines={[{ dataKey: "Calories", name: "Calories" }]}
            legend={{ show: true, align: "center", verticalAlign: "top" }}
            height={260}
            width={600}
            grid={{ show: false }}
          />
        </CardContent>
      </Card>

      {/* The contract's client-history operation returns macro totals only —
          no operation exposes a client's individual workout entries to a
          coach, so the "Workouts" column has no data source. Reported to the
          lead; the Day/Calories columns are built from GET
          /me/clients/{traineeId}/history. */}
      <ListingTable.Container disablePaper sx={{ mb: 3 }}>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Day</ListingTable.Cell>
              <ListingTable.Cell>Calories</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {days.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={2}>
                  <ListingTable.EmptyState title="No history yet" />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              days.map((d) => (
                <ListingTable.Row key={d.date}>
                  <ListingTable.Cell>{weekday(d.date)}</ListingTable.Cell>
                  <ListingTable.Cell>{d.totals?.caloriesKcal ?? 0}</ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>

      <Can op="POST /me/clients/{traineeId}/feedback">
        <TextField
          label="Leave feedback for this trainee"
          multiline
          minRows={3}
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Stack direction="row" justifyContent="flex-end" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => void sendFeedback()} disabled={sending || !message.trim()}>
            Send feedback
          </Button>
        </Stack>
        {sent && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Feedback sent.
          </Alert>
        )}
      </Can>
    </PageContent>
  );
}
