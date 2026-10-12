# hasura-permission-review

**Problem.** Hasura permissions are YAML, reviewed rarely, and fail open: `filter: {}` looks
harmless in a diff and exposes every row to every user.

**Design.**
- Builds a role × operation matrix from `metadata/databases/**/tables/*.yaml`, including
  `set` presets, `check` vs `filter`, `allow_aggregations`, and relationships.
- Uses migrations, when present, to confirm what a column means before calling it an owner
  or tenant column or a secret.
- Flags the patterns that actually cause incidents: open filters, missing
  `X-Hasura-User-Id`/tenant checks, client-writable `user_id`/`org_id`/`role`, missing
  post-update `check`, secret columns in `select`, aggregations on sensitive tables, and
  leaks through relationships.
- Each finding must be expressible as a GraphQL operation that demonstrates it.
- Read-only: it never edits metadata or talks to a Hasura instance.

**Limits.** Reads metadata files only, so it reviews what's in git, not what's applied to a
running instance. Database-level RLS, triggers and actions' own handlers are out of scope.

**Try it.** `/hasura-permission-review` from the repo root — `projects` is correct,
`orders` is broken.

## Planted issues in `examples/hasura-permission-review`

- `projects` — correct: rows scoped to the caller's org, `owner_id`/`org_id` set from the session.
- `orders` — `user` select filter is `{}` (and exposes `payment_token`, with aggregations on);
  `user_id` is client-writable on insert and update.
