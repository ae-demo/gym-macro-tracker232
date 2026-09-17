// The keys the platform actually emits for this component (react-webapp's
// Constraints table) — this app's USER_AUTH_* OIDC keys, and nothing else:
// no sibling API URL (that is same-origin /api), no USER_AUTH_JWKS_URL (the
// browser never validates a token).
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // The OIDC scopes the platform always requests (group/ou singular), plus
  // every handle in the project's catalog — a mock session can hold any of
  // them depending on ?role=, and the real token would carry the full set the
  // resource server offers, narrowed by the signed-in user's roles.
  USER_AUTH_SCOPES:
    "openid profile email group ou " +
    "targets:read targets:set targets:review " +
    "logs:read logs:log logs:edit logs:review " +
    "coach-links:invite coach-links:list coach-links:accept coach-links:revoke " +
    "feedback:create feedback:read",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/gym-macro-tracker",
};
