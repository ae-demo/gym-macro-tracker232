import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/gym-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// Same-origin: nginx reverse-proxies /api to the gym-api sibling, through the
// API gateway when one is provisioned. No env.GYM_API_URL is ever read here —
// that address is pod env for nginx, not a browser key.
export const gymApi = createClient<paths>({ baseUrl: "/api" });

// The app's ONE authorization rule (src/authz/client.ts), wired as middleware
// rather than re-implemented: attach the bearer, and let the 401 rule decide
// what a refusal means. No operation-specific logic lives here.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

gymApi.use(authMiddleware);
