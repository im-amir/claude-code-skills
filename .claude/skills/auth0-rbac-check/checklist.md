# Auth / RBAC checklist

## Authentication
- [ ] Every non-public endpoint verifies a token or session **on the server**.
- [ ] Verification checks signature (JWKS), `iss`, `aud`, `exp` — not just `jwt.decode`.
- [ ] Algorithm is pinned (e.g. `RS256`); `alg: none` or HS/RS confusion is impossible.
- [ ] Middleware `matcher` actually includes the API path; if middleware is the only guard,
      a path outside the matcher is unprotected.
- [ ] Public endpoints are intentionally public (health, webhooks with signature check, login).

## Authorization (roles / permissions)
- [ ] Role or permission comes from verified claims:
      Auth0 RBAC `permissions` array, a namespaced roles claim, or
      `https://hasura.io/jwt/claims` → `x-hasura-allowed-roles` / `x-hasura-default-role`.
- [ ] Never from `req.body.role`, `?role=`, `x-user-role`, `x-hasura-role` sent by the
      browser, `localStorage`, or a non-httpOnly cookie.
- [ ] If a client may pick a role (Hasura `x-hasura-role`), the server checks it is in
      `x-hasura-allowed-roles` of the verified token.
- [ ] Admin-only operations require the admin role, not "any signed-in user".
- [ ] Role checks exist on the server even when the UI also hides the action.

## Ownership / tenancy (IDOR)
- [ ] `user_id` used in queries comes from the token `sub`, not from input.
- [ ] Fetching by id (`/orders/:id`) also checks `owner_id == sub` or `org_id ∈ token orgs`.
- [ ] Multi-tenant: `org_id`/`tenant_id` comes from the token (Auth0 Organizations `org_id`
      claim or a custom claim) and is applied to every query and mutation.
- [ ] Bulk endpoints (list/export) are scoped the same way as single-item ones.

## Token handling
- [ ] Access tokens, ID tokens, refresh tokens, cookies never logged (`console.log`, Sentry
      breadcrumbs, error messages).
- [ ] Tokens not returned in JSON responses or passed as props to client components unless
      the client genuinely needs that token.
- [ ] Management API / Hasura admin secret / service tokens never reach the browser
      (no `NEXT_PUBLIC_` prefix, not in client bundles).
- [ ] Server code does not use the Hasura admin secret to run a request on behalf of a
      user without re-checking that user's permissions.

## Server actions (Next.js)
- [ ] Each `"use server"` function checks the session itself — server actions are public
      POST endpoints, page-level protection does not cover them.
- [ ] Arguments (ids, roles) are treated as untrusted input.
