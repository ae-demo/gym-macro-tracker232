import { useEffect, useState, type JSX } from "react";
import { PageContent, PageTitle, TextField, Stack, Button, Chip, Alert, ListingTable } from "@wso2/oxygen-ui";
import { gymApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/gym-api";
import { formatDateTime } from "../lib/format";

type CoachLink = components["schemas"]["CoachLink"];

const STATUS_COLOR: Record<CoachLink["status"], "warning" | "success" | "default"> = {
  pending: "warning",
  accepted: "success",
  revoked: "default",
};

export function CoachAccessPage(): JSX.Element {
  const [links, setLinks] = useState<CoachLink[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(): Promise<void> {
    const res = await gymApi.GET("/me/coach-links", {});
    if (res.data) setLinks(res.data.data);
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendInvite(): Promise<void> {
    if (!email.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await gymApi.POST("/me/coach-links", { body: { coachEmailOrUsername: email.trim() } });
      if (res.error) {
        setError("Could not send the invite — check the address and try again.");
        return;
      }
      setEmail("");
      await load();
    } catch {
      setError("Could not send the invite — check the address and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(): Promise<void> {
    const accepted = links.find((l) => l.status === "accepted");
    if (!accepted) return;
    setBusy(true);
    try {
      await gymApi.POST("/me/coach-links/{linkId}/revoke", { params: { path: { linkId: accepted.id } } });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const hasAccepted = links.some((l) => l.status === "accepted");

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>Coach access</PageTitle.Header>
      </PageTitle>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Coach email or username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Can op="POST /me/coach-links">
          <Button variant="contained" onClick={() => void sendInvite()} disabled={busy}>
            Send invite
          </Button>
        </Can>
      </Stack>

      <ListingTable.Container disablePaper>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Coach</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
              <ListingTable.Cell>Invited</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {links.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={3}>
                  <ListingTable.EmptyState title="No coach invited yet" description="Send an invite above." />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              links.map((l) => (
                <ListingTable.Row key={l.id}>
                  <ListingTable.Cell>{l.coachEmailOrUsername}</ListingTable.Cell>
                  <ListingTable.Cell>
                    <Chip label={l.status} size="small" color={STATUS_COLOR[l.status]} />
                  </ListingTable.Cell>
                  <ListingTable.Cell>{formatDateTime(l.invitedAt)}</ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>

      <Can op="POST /me/coach-links/{linkId}/revoke">
        <Stack direction="row" sx={{ mt: 2 }}>
          <Button variant="outlined" color="error" onClick={() => void revoke()} disabled={busy || !hasAccepted}>
            Revoke access
          </Button>
        </Stack>
      </Can>
    </PageContent>
  );
}
