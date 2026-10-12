# auth0-rbac-check example

A tiny Next.js App Router API. Static code only — nothing to install or run.

| Route | Intended rule | State |
|-------|---------------|-------|
| `GET /api/me` | any signed-in user, own profile | ✅ correct |
| `GET`/`DELETE /api/admin/users` | `admin` role only | ❌ planted: no auth check at all |
| `GET /api/orders/[id]` | owner of the order, or `admin` | ❌ planted: trusts client-sent role and user id |

Run from the repo root: `/auth0-rbac-check examples/auth0-rbac-check`
