import { useEffect, useState, type JSX } from "react";
import { PageContent, PageTitle, List, ListItem, ListItemText, Alert, Box, Typography } from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import type { components } from "../generated/gym-api";
import { formatDateTime } from "../lib/format";

type Feedback = components["schemas"]["Feedback"];

export function FeedbackInboxPage(): JSX.Element {
  const [items, setItems] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await gymApi.GET("/me/feedback", {});
        if (!cancelled && res.data) setItems(res.data.data);
      } catch {
        if (!cancelled) setError("Could not load feedback.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageContent maxWidth={720}>
      <PageTitle>
        <PageTitle.Header>Feedback from your coach</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {items.length === 0 ? (
        <Box sx={{ py: 4 }}>
          <Typography color="text.secondary">No feedback yet.</Typography>
        </Box>
      ) : (
        <List>
          {items.map((f) => (
            <ListItem key={f.id} divider>
              <ListItemText primary={f.message} secondary={formatDateTime(f.forDate)} />
            </ListItem>
          ))}
        </List>
      )}
    </PageContent>
  );
}
