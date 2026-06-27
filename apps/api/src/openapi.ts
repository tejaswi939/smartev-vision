export const openapiDocument = {
  openapi: "3.0.3",
  info: { title: "SmartEV Vision API", version: "0.1.0", description: "Phase 0 — auth & users" },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/auth/register": { post: { summary: "Register", responses: { "201": { description: "Created" }, "409": { description: "Email exists" } } } },
    "/auth/login": { post: { summary: "Login", responses: { "200": { description: "OK" }, "401": { description: "Invalid credentials" } } } },
    "/auth/refresh": { post: { summary: "Rotate tokens", responses: { "200": { description: "OK" }, "401": { description: "No/invalid refresh" } } } },
    "/auth/logout": { post: { summary: "Logout", responses: { "200": { description: "OK" } } } },
    "/auth/forgot-password": { post: { summary: "Request reset", responses: { "200": { description: "OK" } } } },
    "/auth/reset-password": { post: { summary: "Reset password", responses: { "200": { description: "OK" }, "400": { description: "Invalid token" } } } },
    "/auth/me": { get: { summary: "Current user", responses: { "200": { description: "OK" }, "401": { description: "Unauthenticated" } } } },
    "/users/me": { patch: { summary: "Update profile", responses: { "200": { description: "OK" } } } },
    "/users": { get: { summary: "List users (admin)", responses: { "200": { description: "OK" }, "403": { description: "Forbidden" } } } },
    "/users/{id}/role": { patch: { summary: "Change role (admin)", responses: { "200": { description: "OK" } } } },
  },
} as const;
