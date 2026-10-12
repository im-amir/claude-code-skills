---
name: auth0-rbac-check
description: Audit API routes, Next.js route handlers, server actions, middleware and GraphQL operations for missing or wrong authentication and role checks (Auth0 JWTs, Hasura claims). Use when endpoints are added or changed, before merging backend/auth changes, or when the user asks "is this route protected?" or "check auth/RBAC/permissions".
argument-hint: "[path | base-branch]  (default: changes vs main, else whole repo)"
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status) Bash(git rev-parse *) Read Grep Glob
disallowed-tools: Edit Write NotebookEdit
---

# Auth0 / RBAC check

Find server entry points and prove, for each one, that it verifies the caller and checks
the right role or permission on the server. **Do not edit files. Only report.**

Argument: `$ARGUMENTS`

## Steps

1. **Decide the scope.**
   - Argument is an existing path → audit every endpoint under that path.
   - Argument is a branch (or empty and `main` exists) → audit endpoints in files changed by
     `git diff --name-only <base>...HEAD`, plus any endpoint that imports a changed auth helper.
   - Nothing changed / no git → audit the whole repo.
   - State the scope in the report heading.
2. **Find the endpoints.** Use Glob/Grep for:
   - Next.js App Router: `**/app/**/route.{ts,js}` (each exported `GET`/`POST`/`PUT`/`PATCH`/`DELETE`).
   - Server actions: files or functions with `"use server"`.
   - Pages Router: `**/pages/api/**`.
   - Middleware: `middleware.{ts,js}`, `proxy.{ts,js}` and their `matcher`.
   - Express/Fastify/Hono: `router.get(`, `app.post(`, etc.
   - GraphQL: resolvers, and client operations that call privileged mutations.
   One row per method, not per file.
3. **Trace the auth for each endpoint.** Follow imports until you reach the real check.
   Answer, with file:line evidence:
   - Is a token **verified** (signature + issuer + audience + expiry, e.g. `jwtVerify`,
     `getSession`, `withApiAuthRequired`, `express-oauth2-jwt-bearer`)? Decoding without
     verifying (`jwt.decode`, base64 split) is **not** verification.
   - Does middleware actually cover this path (check the `matcher`)? Middleware that only
     redirects pages does not protect API routes.
   - Which role/permission is required, and where does the role come from? It must come
     from the verified token claims (Auth0 `permissions`/roles claim, or
     `https://hasura.io/jwt/claims` → `x-hasura-allowed-roles` / `x-hasura-default-role`),
     never from the body, query, cookies the client can write, or custom headers.
   - Is the user id / org / tenant used for data access taken from the token, and is the
     resource checked to belong to them (no IDOR)?
4. **Check the problems in [checklist.md](checklist.md)** — no auth, frontend-only role
   checks, trusting client-sent role/user_id/org_id, missing tenant check, tokens logged or
   exposed to the client, `x-hasura-role` forwarded from the client, admin secret used for
   user requests.
5. **Verify before reporting.** For every problem, write the concrete request that exploits
   it (e.g. "`GET /api/orders/42` with header `x-user-role: admin` and no token returns any
   order"). If you cannot write one, downgrade or drop it.
6. **Write the report** in the exact format below.

## Output format

```
## Auth/RBAC check — <scope>

| Endpoint | Auth check found? | Role required | Problem | Fix |
|----------|-------------------|---------------|---------|-----|
| GET /api/me (app/api/me/route.ts:8) | ✅ verifies JWT (lib/auth.ts:21) | any signed-in user | — | — |
| DELETE /api/admin/users (app/api/admin/users/route.ts:5) | ❌ none | none (should be `admin`) | Anyone can delete users | Call `requireRole(req, "admin")` before the handler body |

**Summary:** <N> endpoints, <X> with no auth, <Y> with wrong authorization, <Z> OK.
**Fix first:** <the single most dangerous row and why>
```

Column rules:
- `Auth check found?`: ✅ verified (cite where) · ⚠️ partial (decoded but not verified,
  middleware only, wrong matcher) · ❌ none.
- `Role required`: what the code actually enforces; if that is wrong, add "(should be …)".
- `Problem`: the exploit in one sentence; `—` if none.
- `Fix`: concrete — helper to call, claim to read, line to delete.
- Order rows: ❌ first, then ⚠️, then ✅.

## Do not

- Do not edit, create or delete files. Do not run the app or send real requests.
- Do not mark an endpoint safe because a page or component hides the button — UI checks
  are not authorization.
- Do not assume a helper verifies the token because of its name; open it.
- Do not print secrets you find in the code; report "secret found at file:line" instead.
- Do not report generic hardening advice (rate limits, CSP) unless it is a concrete hole.
