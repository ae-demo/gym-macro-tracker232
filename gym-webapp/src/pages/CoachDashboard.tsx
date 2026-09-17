import { useEffect, useState, type JSX } from "react";
import { useNavigate } from "react-router";
import { PageContent, PageTitle, Typography, Stack, Button, Alert, ListingTable } from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { formatDateTime } from "../lib/format";

type CoachLink = components["schemas"]["CoachLink"];

export function CoachDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [links, setLinks] = useState<CoachLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    try {
      const res = await gymApi.GET("/me/coach-links", {});
      if (res.data) setLinks(res.data.data);
    } catch {
      setError("Could not load your invites and clients.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pending = links.filter((l) => l.status === "pending");
  const accepted = links.filter((l) => l.status === "accepted");

  function goToClient(link: CoachLink): void {
    navigate(`/clients/${link.traineeId}`, { state: { traineeName: link.traineeDisplayName } });
  }

  async function acceptFirstPending(): Promise<void> {
    const first = pending[0];
    if (!first) return;
    setBusy(true);
    try {
      await gymApi.POST("/me/coach-links/{linkId}/accept", { params: { path: { linkId: first.id } } });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Invites</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ListingTable.Container disablePaper sx={{ mb: 3 }}>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Trainee</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {pending.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={2}>
                  <ListingTable.EmptyState title="No pending invites" />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              pending.map((l) => (
                <ListingTable.Row key={l.id} clickable hover onClick={() => goToClient(l)}>
                  <ListingTable.Cell>{l.traineeDisplayName ?? l.traineeId}</ListingTable.Cell>
                  <ListingTable.Cell>Pending</ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>

      <Can op="POST /me/coach-links/{linkId}/accept">
        <Stack direction="row" sx={{ mb: 4 }}>
          <Button variant="contained" onClick={() => void acceptFirstPending()} disabled={busy || pending.length === 0}>
            Accept invite
          </Button>
        </Stack>
      </Can>

      <Typography variant="h6" sx={{ mb: 1 }}>
        Your clients
      </Typography>
      <ListingTable.Container disablePaper>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Trainee</ListingTable.Cell>
              <ListingTable.Cell>Last active</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {accepted.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={2}>
                  <ListingTable.EmptyState title="No clients yet" description="Accept an invite to add one." />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              accepted.map((l) => (
                <ListingTable.Row key={l.id} clickable hover onClick={() => goToClient(l)}>
                  <ListingTable.Cell>{l.traineeDisplayName ?? l.traineeId}</ListingTable.Cell>
                  <ListingTable.Cell>{l.respondedAt ? formatDateTime(l.respondedAt) : "-"}</ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
