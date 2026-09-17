// mock/handlers.ts — the SERVICE half of mock mode (mock/authz/gateway.ts is
// the gateway half; see its header for the split). State lives in module
// scope, reset on every full page load — a create/edit/delete persists across
// in-app navigation only. See react-webapp's mock-mode.md.
//
// This mock stands in for ONE browser session that can act as either a
// Trainee or a Coach (via ?role= on mock/authz/session.ts), so it keeps two
// independent seed sets rather than one fully relational store: the
// Trainee's own resources (targets/meals/workouts/feedback, and the coaches
// THEY invited), and the Coach's own resources (the trainees who invited
// THEM). Both match the wireframes' own demo data
// (`wireframes` skill's scripts/seed.mjs), so the numbers on screen agree
// with the tables by construction. Which of the two a `/me/coach-links` call
// sees is inferred from the caller's OTHER scopes (logs:log/coach-links:invite
// = Trainee, logs:review/coach-links:accept = Coach) — a mock-only heuristic;
// production resolves it from the caller's sub, which this harness has no
// need to simulate.
import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/gym-api";
import { scopesFromToken } from "./authz/gateway";

type Target = components["schemas"]["Target"];
type MealLog = components["schemas"]["MealLog"];
type WorkoutLog = components["schemas"]["WorkoutLog"];
type CoachLink = components["schemas"]["CoachLink"];
type Feedback = components["schemas"]["Feedback"];
type DailySummary = components["schemas"]["DailySummary"];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function scopesOf(request: Request): string[] {
  return scopesFromToken(request.headers.get("authorization"));
}

/** Mock-only heuristic: which side of the shared coach-links resource is this
 *  caller on? See the file header — production resolves this from `sub`. */
function callerIsCoach(request: Request): boolean {
  const scopes = scopesOf(request);
  return scopes.includes("coach-links:accept") || scopes.includes("logs:review");
}

// --- Trainee's own resources (the "me" seen by Trainee-flavored calls) -----

let target: Target = {
  id: "target-1",
  caloriesKcal: 2200,
  proteinG: 160,
  carbsG: 220,
  fatG: 70,
  effectiveFrom: isoDaysAgo(30),
};

let meals: MealLog[] = [
  {
    id: "meal-1",
    loggedDate: isoDaysAgo(0),
    name: "Chicken & rice",
    caloriesKcal: 620,
    proteinG: 55,
    carbsG: 40,
    fatG: 18,
  },
  {
    id: "meal-2",
    loggedDate: isoDaysAgo(0),
    name: "Oatmeal & fruit",
    caloriesKcal: 830,
    proteinG: 35,
    carbsG: 100,
    fatG: 27,
  },
];

let workouts: WorkoutLog[] = [
  {
    id: "workout-1",
    loggedDate: isoDaysAgo(0),
    type: "strength",
    cardioDurationMin: null,
    exercises: [{ exerciseName: "Strength - Legs", sets: 4, reps: 8, weightKg: 80 }],
  },
];

// The coaches THIS trainee invited — CoachAccess's own table.
let outgoingLinks: CoachLink[] = [
  {
    id: "link-jane",
    traineeId: "trainee-1",
    traineeDisplayName: "Alex Trainee",
    coachEmailOrUsername: "coach.jane@example.com",
    status: "pending",
    invitedAt: `${isoDaysAgo(0)}T09:00:00Z`,
    respondedAt: null,
  },
  {
    id: "link-alex",
    traineeId: "trainee-1",
    traineeDisplayName: "Alex Trainee",
    coachEmailOrUsername: "coach.alex@example.com",
    status: "accepted",
    invitedAt: `${isoDaysAgo(7)}T09:00:00Z`,
    respondedAt: `${isoDaysAgo(6)}T09:00:00Z`,
  },
];

const feedbackForMe: Feedback[] = [
  {
    id: "fb-1",
    coachLinkId: "link-alex",
    forDate: isoDaysAgo(2),
    message: "Great consistency this week, keep protein steady",
    createdAt: `${isoDaysAgo(2)}T18:00:00Z`,
  },
  {
    id: "fb-2",
    coachLinkId: "link-alex",
    forDate: isoDaysAgo(5),
    message: "Try adding a second cardio session",
    createdAt: `${isoDaysAgo(5)}T18:00:00Z`,
  },
];

function weeklyHistoryFor(): { date: string; caloriesKcal: number; proteinG: number; carbsG: number; fatG: number }[] {
  const base = [
    { off: 6, caloriesKcal: 2150, proteinG: 155, carbsG: 210, fatG: 68 },
    { off: 5, caloriesKcal: 2300, proteinG: 160, carbsG: 230, fatG: 72 },
    { off: 4, caloriesKcal: 2050, proteinG: 148, carbsG: 200, fatG: 64 },
    { off: 3, caloriesKcal: 2250, proteinG: 158, carbsG: 225, fatG: 70 },
    { off: 2, caloriesKcal: 2100, proteinG: 150, carbsG: 205, fatG: 66 },
    { off: 1, caloriesKcal: 2180, proteinG: 152, carbsG: 215, fatG: 69 },
    { off: 0, caloriesKcal: 1450, proteinG: 90, carbsG: 140, fatG: 45 },
  ];
  return base.map((d) => ({
    date: isoDaysAgo(d.off),
    caloriesKcal: d.caloriesKcal,
    proteinG: d.proteinG,
    carbsG: d.carbsG,
    fatG: d.fatG,
  }));
}

// --- Coach's own resources (the "me" seen by Coach-flavored calls) --------

const COACH_EMAIL = "coach@example.test";

let incomingLinks: CoachLink[] = [
  {
    id: "link-sam",
    traineeId: "trainee-sam",
    traineeDisplayName: "Sam Rivera",
    coachEmailOrUsername: COACH_EMAIL,
    status: "pending",
    invitedAt: `${isoDaysAgo(0)}T08:00:00Z`,
    respondedAt: null,
  },
  {
    id: "link-priya",
    traineeId: "trainee-priya",
    traineeDisplayName: "Priya Nair",
    coachEmailOrUsername: COACH_EMAIL,
    status: "accepted",
    invitedAt: `${isoDaysAgo(10)}T08:00:00Z`,
    respondedAt: `${isoDaysAgo(0)}T08:00:00Z`,
  },
  {
    id: "link-jordan",
    traineeId: "trainee-jordan",
    traineeDisplayName: "Jordan Lee",
    coachEmailOrUsername: COACH_EMAIL,
    status: "accepted",
    invitedAt: `${isoDaysAgo(10)}T08:00:00Z`,
    respondedAt: `${isoDaysAgo(1)}T08:00:00Z`,
  },
];

// Per-client review data — only for ACCEPTED links; "trainee-sam" is deliberately
// absent, so opening it (from the still-pending invite row) walks the "no
// accepted link yet" empty state ClientProgress must show.
const clientTargets: Record<string, Target> = {
  "trainee-priya": { id: "target-priya", caloriesKcal: 2200, proteinG: 160, carbsG: 220, fatG: 70, effectiveFrom: isoDaysAgo(20) },
  "trainee-jordan": { id: "target-jordan", caloriesKcal: 2400, proteinG: 170, carbsG: 250, fatG: 75, effectiveFrom: isoDaysAgo(20) },
};

const clientHistory: Record<string, ReturnType<typeof weeklyHistoryFor>> = {
  "trainee-priya": weeklyHistoryFor(),
  "trainee-jordan": weeklyHistoryFor().map((d) => ({ ...d, caloriesKcal: d.caloriesKcal + 100 })),
};

const clientFeedback: Record<string, Feedback[]> = { "trainee-priya": [], "trainee-jordan": [] };

function summaryFrom(days: ReturnType<typeof weeklyHistoryFor>, tgt: Target): DailySummary {
  const today = days[days.length - 1];
  return {
    date: today.date,
    target: tgt,
    totals: {
      caloriesKcal: today.caloriesKcal,
      proteinG: today.proteinG,
      carbsG: today.carbsG,
      fatG: today.fatG,
    },
  };
}

function paged<T>(data: T[]): { count: number; next: null; previous: null; data: T[] } {
  return { count: data.length, next: null, previous: null, data };
}

export const handlers = [
  // --- Targets (Trainee's own) -------------------------------------------
  http.get("/api/me/targets", () => HttpResponse.json(target)),
  http.put("/api/me/targets", async ({ request }) => {
    const body = (await request.json()) as Omit<Target, "id" | "effectiveFrom">;
    target = { ...target, ...body };
    return HttpResponse.json(target);
  }),

  // --- Meals ---------------------------------------------------------------
  http.get("/api/me/meals", ({ request }) => {
    const date = new URL(request.url).searchParams.get("date");
    const rows = date ? meals.filter((m) => m.loggedDate === date) : meals;
    return HttpResponse.json(paged(rows));
  }),
  http.post("/api/me/meals", async ({ request }) => {
    const body = (await request.json()) as Omit<MealLog, "id">;
    const created: MealLog = { ...body, id: `meal-${meals.length + 1}-${Date.now()}` };
    meals = [created, ...meals];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put("/api/me/meals/:mealId", async ({ params, request }) => {
    const body = (await request.json()) as Omit<MealLog, "id">;
    const idx = meals.findIndex((m) => m.id === params.mealId);
    if (idx === -1) return HttpResponse.json({ code: 404, message: "No such meal log" }, { status: 404 });
    meals[idx] = { ...body, id: meals[idx].id };
    return HttpResponse.json(meals[idx]);
  }),
  http.delete("/api/me/meals/:mealId", ({ params }) => {
    const before = meals.length;
    meals = meals.filter((m) => m.id !== params.mealId);
    return meals.length === before
      ? HttpResponse.json({ code: 404, message: "No such meal log" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  // --- Workouts --------------------------------------------------------------
  http.get("/api/me/workouts", ({ request }) => {
    const date = new URL(request.url).searchParams.get("date");
    const rows = date ? workouts.filter((w) => w.loggedDate === date) : workouts;
    return HttpResponse.json(paged(rows));
  }),
  http.post("/api/me/workouts", async ({ request }) => {
    const body = (await request.json()) as Omit<WorkoutLog, "id">;
    const created: WorkoutLog = { ...body, id: `workout-${workouts.length + 1}-${Date.now()}` };
    workouts = [created, ...workouts];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.put("/api/me/workouts/:workoutId", async ({ params, request }) => {
    const body = (await request.json()) as Omit<WorkoutLog, "id">;
    const idx = workouts.findIndex((w) => w.id === params.workoutId);
    if (idx === -1) return HttpResponse.json({ code: 404, message: "No such workout log" }, { status: 404 });
    workouts[idx] = { ...body, id: workouts[idx].id };
    return HttpResponse.json(workouts[idx]);
  }),
  http.delete("/api/me/workouts/:workoutId", ({ params }) => {
    const before = workouts.length;
    workouts = workouts.filter((w) => w.id !== params.workoutId);
    return workouts.length === before
      ? HttpResponse.json({ code: 404, message: "No such workout log" }, { status: 404 })
      : new HttpResponse(null, { status: 204 });
  }),

  // --- Summary & history (Trainee's own) -----------------------------------
  http.get("/api/me/summary", () => {
    const todaysMeals = meals.filter((m) => m.loggedDate === isoDaysAgo(0));
    const totals = todaysMeals.reduce(
      (acc, m) => ({
        caloriesKcal: acc.caloriesKcal + m.caloriesKcal,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
      }),
      { caloriesKcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );
    const summary: DailySummary = { date: isoDaysAgo(0), target, totals };
    return HttpResponse.json(summary);
  }),
  http.get("/api/me/history", () => {
    const days = weeklyHistoryFor().map((d) => ({
      date: d.date,
      target,
      totals: { caloriesKcal: d.caloriesKcal, proteinG: d.proteinG, carbsG: d.carbsG, fatG: d.fatG },
    }));
    return HttpResponse.json({ days });
  }),

  // --- Coach links: shared resource, split by caller (see file header) -----
  http.get("/api/me/coach-links", ({ request }) => {
    const rows = callerIsCoach(request) ? incomingLinks : outgoingLinks;
    const status = new URL(request.url).searchParams.get("status");
    const filtered = status ? rows.filter((l) => l.status === status) : rows;
    return HttpResponse.json(paged(filtered));
  }),
  http.post("/api/me/coach-links", async ({ request }) => {
    const body = (await request.json()) as { coachEmailOrUsername: string };
    const created: CoachLink = {
      id: `link-${outgoingLinks.length + 1}-${Date.now()}`,
      traineeId: "trainee-1",
      traineeDisplayName: "Alex Trainee",
      coachEmailOrUsername: body.coachEmailOrUsername,
      status: "pending",
      invitedAt: new Date().toISOString(),
      respondedAt: null,
    };
    outgoingLinks = [created, ...outgoingLinks];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.post("/api/me/coach-links/:linkId/accept", ({ params }) => {
    const idx = incomingLinks.findIndex((l) => l.id === params.linkId);
    if (idx === -1) return HttpResponse.json({ code: 404, message: "No such pending invite" }, { status: 404 });
    incomingLinks[idx] = { ...incomingLinks[idx], status: "accepted", respondedAt: new Date().toISOString() };
    return HttpResponse.json(incomingLinks[idx]);
  }),
  http.post("/api/me/coach-links/:linkId/revoke", ({ params }) => {
    const idx = outgoingLinks.findIndex((l) => l.id === params.linkId);
    if (idx === -1) return HttpResponse.json({ code: 404, message: "No such link" }, { status: 404 });
    outgoingLinks[idx] = { ...outgoingLinks[idx], status: "revoked", respondedAt: new Date().toISOString() };
    return HttpResponse.json(outgoingLinks[idx]);
  }),

  // --- Feedback (Trainee's own inbox) --------------------------------------
  http.get("/api/me/feedback", () => HttpResponse.json(paged(feedbackForMe))),

  // --- Coach's clients ------------------------------------------------------
  http.get("/api/me/clients", ({ request }) => {
    const status = new URL(request.url).searchParams.get("status") ?? "accepted";
    const rows = incomingLinks.filter((l) => l.status === status);
    return HttpResponse.json(paged(rows));
  }),
  http.get("/api/me/clients/:traineeId/targets", ({ params }) => {
    const tgt = clientTargets[String(params.traineeId)];
    if (!tgt) return HttpResponse.json({ code: 404, message: "No accepted link with this trainee" }, { status: 404 });
    return HttpResponse.json(tgt);
  }),
  http.get("/api/me/clients/:traineeId/summary", ({ params }) => {
    const id = String(params.traineeId);
    const tgt = clientTargets[id];
    const history = clientHistory[id];
    if (!tgt || !history) return HttpResponse.json({ code: 404, message: "No accepted link with this trainee" }, { status: 404 });
    return HttpResponse.json(summaryFrom(history, tgt));
  }),
  http.get("/api/me/clients/:traineeId/history", ({ params }) => {
    const id = String(params.traineeId);
    const tgt = clientTargets[id];
    const history = clientHistory[id];
    if (!tgt || !history) return HttpResponse.json({ code: 404, message: "No accepted link with this trainee" }, { status: 404 });
    return HttpResponse.json({ days: history.map((d) => ({ date: d.date, target: tgt, totals: { caloriesKcal: d.caloriesKcal, proteinG: d.proteinG, carbsG: d.carbsG, fatG: d.fatG } })) });
  }),
  http.post("/api/me/clients/:traineeId/feedback", async ({ params, request }) => {
    const id = String(params.traineeId);
    if (!clientTargets[id]) return HttpResponse.json({ code: 404, message: "No accepted link with this trainee" }, { status: 404 });
    const body = (await request.json()) as { forDate: string; message: string };
    const created: Feedback = {
      id: `fb-${id}-${Date.now()}`,
      coachLinkId: incomingLinks.find((l) => l.traineeId === id)?.id ?? "",
      forDate: body.forDate,
      message: body.message,
      createdAt: new Date().toISOString(),
    };
    clientFeedback[id] = [created, ...(clientFeedback[id] ?? [])];
    return HttpResponse.json(created, { status: 201 });
  }),
];
