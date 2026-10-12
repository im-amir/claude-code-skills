---
name: hasura-permission-review
description: Review Hasura metadata permissions (select/insert/update/delete per role) for data leaks — open {} filters, missing X-Hasura-User-Id or tenant checks, client-writable user_id/org_id/role columns, exposed secret columns, aggregations on sensitive tables. Use when Hasura metadata, roles or table permissions change, or the user asks "who can read/write this table?".
argument-hint: "[table-name]  (default: all tables)"
allowed-tools: Bash(git diff *) Bash(git status) Read Grep Glob
disallowed-tools: Edit Write NotebookEdit
---

# Hasura permission review

Audit table permissions in Hasura metadata, role by role and operation by operation.
**Do not edit files. Only report.**

Table filter: `$ARGUMENTS`

## Steps

1. **Find the metadata.** Glob `**/metadata/databases/**/tables/*.yaml` (skip
   `node_modules`). Also read each `tables.yaml` to know which tables are tracked. If none
   is found, say so and stop. If a table name was given, review only matching files
   (`public_<table>.yaml` or `table.name: <table>`).
2. **Build the permission matrix.** For each table, read `select_permissions`,
   `insert_permissions`, `update_permissions`, `delete_permissions`, and the relationships
   (`object_relationships`, `array_relationships`). For each role × operation record:
   filter / check, `columns`, `set` presets, `allow_aggregations`, `limit`.
3. **Understand the table.** Infer which columns identify the owner or tenant (`user_id`,
   `owner_id`, `created_by`, `org_id`, `tenant_id`, `company_id`) and which are sensitive
   (see [checklist.md](checklist.md)). If the repo has migrations (`migrations/**.sql`),
   use them to confirm column meaning.
4. **Check every role × operation** against [checklist.md](checklist.md). The core questions:
   - `filter: {}` / `check: {}` — can this role see or touch **every** row? Acceptable only
     for public reference data (countries, currencies) and the `admin` role.
   - Does the filter tie rows to `X-Hasura-User-Id` (directly or through a relationship)
     and, on multi-tenant tables, to the tenant (`X-Hasura-Org-Id` or a membership
     relationship)?
   - Can insert/update set `user_id`, `owner_id`, `org_id`, `tenant_id`, `role`, `is_admin`,
     `status`/`approved` fields? These must be omitted from `columns` and filled by `set`
     from session variables (or DB defaults/triggers).
   - Does update have a `check` (post-update) as well as a `filter`, so a user can't move a
     row to another owner?
   - Are `password`, `password_hash`, `token`, `secret`, `api_key`, `refresh_token`,
     `reset_code` columns in any non-admin `select.columns`?
   - `allow_aggregations: true` on tables with personal or financial data (counts and sums
     leak data even when row columns are limited).
   - Relationships: a well-filtered table can leak rows of a related table whose own
     select permission is `{}`.
5. **Verify.** For each problem, write the GraphQL operation that proves it, e.g.
   `mutation { insert_orders_one(object: {user_id: "<victim>", total: 0}) { id } }` as role
   `user`. Drop anything you can't express this way.
6. **Write the report** in the exact format below.

## Output format

```
## Hasura permission review — <n> tables, <m> roles (<metadata path>)

| Table | Role | Operation | Problem | Fix |
|-------|------|-----------|---------|-----|
| orders | user | select | `filter: {}` — any user reads every order | `filter: {user_id: {_eq: X-Hasura-User-Id}}` |

**Severity summary:** <n> critical (cross-user/tenant read or write), <n> high, <n> low.
**Clean:** <tables/roles with no findings, comma-separated>
**Fix first:** <one line>
```

Rules:
- One row per table × role × operation × problem. Order: cross-user/tenant writes, cross-
  user/tenant reads, secret exposure, aggregation, the rest.
- `Fix` is a YAML fragment or an exact instruction ("remove `user_id` from insert
  `columns`, add `set: {user_id: X-Hasura-User-Id}`").
- If there are no problems, output the heading, `No issues found.`, and the Clean line.

## Do not

- Do not edit metadata, apply migrations, or call the Hasura API / console.
- Do not flag the `admin` role for having full access — that is expected.
- Do not assume a session variable exists; if a filter uses `X-Hasura-Org-Id`, note that
  the JWT claims must provide it, as a low finding only if you can't confirm it.
- Do not report columns as sensitive by name alone when context clearly shows otherwise
  (e.g. `token_count`); say why a column is sensitive.
