// THIS IS THE ONLY FILE THAT KNOWS ABOUT SCREENS. Each row names the screen's
// route and the ONE operation whose answer it renders when it opens — the
// `loads` the gate reads. Order is RAIL ORDER, from wireframes.dsl: the
// Trainee flow's screens first (TraineeDashboard ... FeedbackInbox), then the
// Coach flow's (CoachDashboard, ClientProgress) — matching the DSL's own
// declaration order.
//
// Note (design finding, not a code fix): `coach-links:list` is the single
// scope behind BOTH `GET /me/coach-links` (CoachAccess, a Trainee screen) and
// the "Invites" section of CoachDashboard, and both Trainee and Coach hold it
// (security.json). Gating is purely per-operation, so a caller holding that
// one handle can open both screens' routes; the API's own /me/ resolution is
// what makes each screen show only that caller's own rows. Reported to the
// lead rather than worked around here — screens.ts never widens or narrows a
// contract's scope.

import { canCall } from "./core";
import { OPERATIONS, isOperationKey, type OperationKey } from "./operations.gen";

export interface ScreenRoute {
  readonly key: string;
  readonly label: string;
  readonly path: string;
  readonly loads: OperationKey | null;
  readonly public?: boolean;
}

export const SCREEN_ROUTES: readonly ScreenRoute[] = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", loads: "GET /me/summary" },
  { key: "logmeal", label: "Log Meal", path: "/log-meal", loads: null },
  { key: "logworkout", label: "Log Workout", path: "/log-workout", loads: null },
  { key: "targets", label: "Targets", path: "/targets", loads: "GET /me/targets" },
  { key: "history", label: "History", path: "/history", loads: "GET /me/history" },
  { key: "coachaccess", label: "Coach", path: "/coach-access", loads: "GET /me/coach-links" },
  { key: "feedback", label: "Feedback", path: "/feedback", loads: "GET /me/feedback" },
  { key: "coachdashboard", label: "Clients", path: "/clients", loads: "GET /me/coach-links" },
  {
    key: "clientprogress",
    label: "Client Progress",
    path: "/clients/:traineeId",
    loads: "GET /me/clients/{traineeId}/summary",
  },
];

for (const screen of SCREEN_ROUTES) {
  if (screen.loads !== null && !isOperationKey(screen.loads)) {
    throw new Error(
      `src/authz/screens.ts: screen "${screen.label}" loads "${screen.loads}", which ` +
        `no contract declares. Re-run \`npm run gen\`, or name the operation the ` +
        `way openapi.yaml spells it.`,
    );
  }
}

export function reachableScreens(
  scopes: ReadonlySet<string>,
  signedIn: boolean,
): readonly ScreenRoute[] {
  return SCREEN_ROUTES.filter((screen) => {
    if (screen.public) return true;
    if (screen.loads === null) return signedIn;
    return canCall(OPERATIONS[screen.loads], scopes, signedIn);
  });
}
