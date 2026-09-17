import { useEffect, useState, type JSX } from "react";
import { PageContent, PageTitle, Card, CardContent, Typography, ListingTable, Alert } from "@wso2/oxygen-ui";
import { LineChart } from "@wso2/oxygen-ui-charts-react";
import { gymApi } from "../api";
import type { components } from "../generated/gym-api";
import { weekday } from "../lib/format";

type DailySummary = components["schemas"]["DailySummary"];

export function WeeklyHistoryPage(): JSX.Element {
  const [days, setDays] = useState<DailySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await gymApi.GET("/me/history", {});
        if (!cancelled && res.data) setDays(res.data.days);
      } catch {
        if (!cancelled) setError("Could not load the last 7 days.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Last 7 days</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Calories vs target, by day
          </Typography>
          <LineChart
            data={days.map((d) => ({
              day: weekday(d.date),
              Calories: d.totals?.caloriesKcal ?? 0,
              Target: d.target.caloriesKcal,
            }))}
            xAxisDataKey="day"
            lines={[{ dataKey: "Calories", name: "Calories" }, { dataKey: "Target", name: "Target" }]}
            legend={{ show: true, align: "center", verticalAlign: "top" }}
            height={260}
            width={600}
            grid={{ show: false }}
          />
        </CardContent>
      </Card>

      <ListingTable.Container disablePaper>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Day</ListingTable.Cell>
              <ListingTable.Cell>Calories</ListingTable.Cell>
              <ListingTable.Cell>Protein</ListingTable.Cell>
              <ListingTable.Cell>Carbs</ListingTable.Cell>
              <ListingTable.Cell>Fat</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {days.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={5}>
                  <ListingTable.EmptyState title="No history yet" description="Log a few days to see your trend." />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              days.map((d) => (
                <ListingTable.Row key={d.date}>
                  <ListingTable.Cell>{weekday(d.date)}</ListingTable.Cell>
                  <ListingTable.Cell>{d.totals?.caloriesKcal ?? 0}</ListingTable.Cell>
                  <ListingTable.Cell>{d.totals?.proteinG ?? 0}</ListingTable.Cell>
                  <ListingTable.Cell>{d.totals?.carbsG ?? 0}</ListingTable.Cell>
                  <ListingTable.Cell>{d.totals?.fatG ?? 0}</ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
