import { useEffect, useState, type JSX } from "react";
import { handleCallback } from "../authz/session";

/**
 * The OIDC redirect target, `<origin>/callback`. Calls handleCallback() once
 * on mount, then sends the browser back to the app root — no session read
 * happens above this route, so it stays outside <AuthzProvider>.
 */
export function CallbackPage(): JSX.Element {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await handleCallback();
        if (!cancelled) window.location.assign(window.location.origin);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Sign-in failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Signing you in…</h1>
      {error ? <p>{error}</p> : null}
    </main>
  );
}
