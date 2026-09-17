// Typed read of window._env_, mounted at request time by the platform's
// /env-config.js. Never build-time config (no import.meta.env.VITE_*): a
// value the browser needs arrives here, per-environment, at runtime.
//
// This app declares one auth platform-resource dependency, named `user-auth`
// in design.json, so the browser-visible keys are USER_AUTH_*. Note there is
// no USER_AUTH_JWKS_URL here — the platform emits it, but the browser never
// validates a token (the API gateway does), so no asset reads it. There is
// also no sibling API URL key: gym-api is reached same-origin at /api.
type Env = {
  USER_AUTH_CLIENT_ID: string;
  USER_AUTH_ISSUER: string;
  USER_AUTH_SCOPES: string;
  USER_AUTH_RESOURCE: string;
};

declare global {
  interface Window {
    _env_: Env;
  }
}

if (!window._env_) {
  throw new Error(
    "window._env_ not set — /env-config.js failed to load. " +
      "The platform mounts this file; if you see this locally, host " +
      "/env-config.js from your dev server.",
  );
}

export const env: Env = window._env_;
