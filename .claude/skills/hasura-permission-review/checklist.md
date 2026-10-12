# Hasura permission checklist

## Select
- [ ] `filter` is not `{}` unless the table is public reference data or the role is `admin`.
- [ ] Owner tables: `{user_id: {_eq: X-Hasura-User-Id}}` (or via relationship, e.g.
      `{project: {members: {user_id: {_eq: X-Hasura-User-Id}}}}`).
- [ ] Multi-tenant tables: filter also pins the tenant (`org_id: {_eq: X-Hasura-Org-Id}` or a
      membership relationship). User filter alone is not enough if users can belong to
      several orgs and data must be isolated per org.
- [ ] `columns` excludes secrets: `password`, `password_hash`, `*_token`, `secret`, `api_key`,
      `refresh_token`, `reset_code`, `otp`, `mfa_*`, internal notes, full card/IBAN numbers.
- [ ] `allow_aggregations` is false on tables with PII, money, or per-user data unless the
      filter already limits rows to the caller.
- [ ] `limit` set on large tables exposed to public/anonymous roles.
- [ ] `anonymous` / `public` role can only read what is genuinely public.

## Insert
- [ ] `check` is not `{}` for user roles — it should assert ownership/tenancy of the new row.
- [ ] Ownership/tenancy columns (`user_id`, `owner_id`, `created_by`, `org_id`, `tenant_id`)
      are **not** in `columns`; they come from `set` (`X-Hasura-User-Id`, `X-Hasura-Org-Id`)
      or DB defaults.
- [ ] Privilege columns (`role`, `is_admin`, `verified`, `status`, `approved`, `price`,
      `balance`) are not client-writable.
- [ ] `backend_only: true` for inserts that should only come from trusted servers.

## Update
- [ ] `filter` limits which rows can be updated (pre-update).
- [ ] `check` limits what the row may become (post-update) — without it a user can change
      `user_id`/`org_id` to move a row to someone else (if the column is updatable).
- [ ] `columns` excludes ownership, tenancy and privilege columns.
- [ ] `set` presets used for `updated_by` etc.

## Delete
- [ ] `filter` is not `{}` for user roles.
- [ ] Soft-delete tables: users can't hard-delete; prefer update of `deleted_at`.

## Relationships
- [ ] Every table reachable through a relationship has its own select permission for the
      role — and that permission is not `{}` for private data.
- [ ] Remote relationships / actions do not bypass the table's row filter.

## Roles
- [ ] Role names in metadata match those issued in the JWT
      (`https://hasura.io/jwt/claims` → `x-hasura-allowed-roles`).
- [ ] No role is granted broader access than the next-higher role (e.g. `user` > `manager`).
