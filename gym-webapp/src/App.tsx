// ROUTING STRUCTURE is prescribed by thunder-authentication (see
// App.example.tsx): NoAccess sits ABOVE the shell route and replaces it;
// Forbidden sits INSIDE the shell; /forbidden is wired into authz/client once
// from the router; every gated route is wrapped in <RequireOperation>, taken
// from SCREEN_ROUTES; /callback is routed outside the provider.
import { useEffect, type ReactElement } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router";
import {
  AuthzProvider,
  Forbidden,
  NoAccess,
  RequireOperation,
  useAuthz,
  useScopes,
} from "./authz/gates";
import { SCREEN_ROUTES, reachableScreens } from "./authz/screens";
import { setForbiddenNavigator } from "./authz/client";
import { signIn } from "./authz/session";
import { AppShell } from "./shell/AppShell";
import { CallbackPage } from "./pages/Callback";
import { APP_NAME } from "./appName";
import { TraineeDashboardPage } from "./pages/TraineeDashboard";
import { LogMealPage } from "./pages/LogMeal";
import { LogWorkoutPage } from "./pages/LogWorkout";
import { TargetsSettingsPage } from "./pages/TargetsSettings";
import { WeeklyHistoryPage } from "./pages/WeeklyHistory";
import { CoachAccessPage } from "./pages/CoachAccess";
import { FeedbackInboxPage } from "./pages/FeedbackInbox";
import { CoachDashboardPage } from "./pages/CoachDashboard";
import { ClientProgressPage } from "./pages/ClientProgress";

/** Every screen this app declares — none of them are public. */
const PAGE_BY_KEY: Record<string, ReactElement> = {
  dashboard: <TraineeDashboardPage />,
  logmeal: <LogMealPage />,
  logworkout: <LogWorkoutPage />,
  targets: <TargetsSettingsPage />,
  history: <WeeklyHistoryPage />,
  coachaccess: <CoachAccessPage />,
  feedback: <FeedbackInboxPage />,
  coachdashboard: <CoachDashboardPage />,
  clientprogress: <ClientProgressPage />,
};

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <ForbiddenWiring />
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route
          path="*"
          element={
            <AuthzProvider fallback={<Splash />}>
              <SignedIn />
            </AuthzProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function ForbiddenWiring(): null {
  const navigate = useNavigate();
  useEffect(() => {
    setForbiddenNavigator(() => navigate("/forbidden", { replace: true }));
  }, [navigate]);
  return null;
}

function Splash(): ReactElement {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <p>Checking your session…</p>
    </main>
  );
}

function SignedIn(): ReactElement {
  const { signedIn } = useAuthz();
  const scopes = useScopes();

  useEffect(() => {
    if (!signedIn) void signIn();
  }, [signedIn]);

  if (!signedIn) return <Splash />;

  const reachable = reachableScreens(scopes, signedIn);

  if (reachable.length === 0) return <NoAccess appName={APP_NAME} />;

  const landing = reachable[0].path;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to={landing} replace />} />
        {SCREEN_ROUTES.map((screen) => {
          const page = PAGE_BY_KEY[screen.key];
          if (screen.loads === null) {
            return <Route key={screen.key} path={screen.path} element={page} />;
          }
          return (
            <Route
              key={screen.key}
              element={<RequireOperation op={screen.loads} screen={screen.label} />}
            >
              <Route path={screen.path} element={page} />
            </Route>
          );
        })}
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<Navigate to={landing} replace />} />
      </Route>
    </Routes>
  );
}
