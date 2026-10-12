# auth0-rbac-check

**Problem.** The most common real-world authorization bugs aren't crypto failures — they're
a route someone forgot to protect, a role check that only exists in the UI, or a handler
that trusts `role`/`userId` sent by the client.

**Design.**
- Enumerates entry points first (route handlers per HTTP method, server actions,
  middleware matchers, Express routes, GraphQL), so nothing is reviewed by accident or
  skipped by accident.
- Traces each one through imports to the actual check, and distinguishes *verifying* a JWT
  (signature, issuer, audience, expiry) from merely *decoding* it.
- Knows the Hasura claim shape (`https://hasura.io/jwt/claims`,
  `x-hasura-allowed-roles`, `x-hasura-default-role`) and flags client-chosen roles that
  aren't checked against the token.
- Every finding must come with a concrete exploiting request, which filters out
  theoretical noise.
- Read-only: `disallowed-tools: Edit Write NotebookEdit`.

**Limits.** Static analysis only — it can't see gateway/WAF rules or infra-level auth. A
route protected by something outside the repo will be reported as unprotected; that is
deliberate (say so, then ignore).

**Try it.** `/auth0-rbac-check examples/auth0-rbac-check` — one safe route, two broken.

## Planted issues in `examples/auth0-rbac-check`

| Route | Intended rule | State |
|-------|---------------|-------|
| `GET /api/me` | any signed-in user, own profile | correct |
| `GET`/`DELETE /api/admin/users` | `admin` only | no auth check at all |
| `GET /api/orders/[id]` | owner or `admin` | trusts client-sent `x-user-role` / `x-user-id` headers |
