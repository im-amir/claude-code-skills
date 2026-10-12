# hasura-permission-review example

Hasura v2 metadata for two tables, roles `user` and `admin`. JWT claims provide
`X-Hasura-User-Id` and `X-Hasura-Org-Id`.

| Table | State |
|-------|-------|
| `projects` | ✅ correct: rows scoped to the caller's org, owner set from the session |
| `orders` | ❌ planted: `user` select filter is `{}`, and `user_id` is client-writable on insert/update |

Run from the repo root: `/hasura-permission-review`
