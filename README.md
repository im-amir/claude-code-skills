# Claude Code skills

Claude Code skills I use for safer, faster production work.

![/pr-review running on a branch with three planted bugs](docs/assets/pr-review.gif)

<sub>Real, unedited run of `/pr-review main` on the `demo/pr-review` branch — sped up 5× while it thinks (the real run took 23s).</sub>

| Skill | What it does | Edits files? |
|-------|--------------|--------------|
| [`/pr-review`](.claude/skills/pr-review/SKILL.md) | Reviews the branch diff before a PR — bugs, edge cases, security, React/TS issues — as a ranked table | No |
| [`/auth0-rbac-check`](.claude/skills/auth0-rbac-check/SKILL.md) | Traces every API route / server action / middleware to its JWT and role check | No |
| [`/refactor-safely`](.claude/skills/refactor-safely/SKILL.md) | Maps callers, plans, waits for approval, then refactors in small steps with checks after each | Yes — after you approve |
| [`/hasura-permission-review`](.claude/skills/hasura-permission-review/SKILL.md) | Audits Hasura metadata role × operation for row leaks and client-writable ownership columns | No |

## Install

Skills are plain folders — copy them where Claude Code looks for skills:

```bash
git clone https://github.com/im-amir/claude-code-skills.git

# one project
cp -R claude-code-skills/.claude/skills/* /path/to/your-project/.claude/skills/

# every project
mkdir -p ~/.claude/skills && cp -R claude-code-skills/.claude/skills/* ~/.claude/skills/
```

Then type `/` in Claude Code to see them. The three read-only skills can also trigger on
their own when your request matches their description; `/refactor-safely` only runs when
you invoke it (`disable-model-invocation: true`).

## How they're built

- Every `SKILL.md` has numbered steps, a fixed output format, and a **Do not** section;
  long checklists live next to it (`checklist.md`) and load only when needed.
- Read-only skills say "Do not edit files. Only report." **and** set
  `disallowed-tools: Edit Write NotebookEdit`. `allowed-tools` only *pre-approves* tools
  (e.g. `git diff`) — it doesn't restrict anything, so the deny list does the enforcing.
- Every finding must survive a verification step: name the input, request or GraphQL
  operation that breaks it, or drop it. That's what keeps the output short and trustworthy.

Design notes per skill are in [`docs/`](docs/).

## Sample output

Every block below is **real, unedited output** from running the skill on
[`examples/`](examples/) — Claude Code 2.1.283, Claude Opus 5.5, 2026-10-12, run headless with
`claude -p --setting-sources project` so personal `~/.claude` config didn't influence it.
Model output varies between runs; these are single runs, not cherry-picked best-ofs.
What's planted in each example is listed in the matching `docs/` file.

### `/pr-review`

Reviews `git diff <base>...HEAD` plus surrounding code and callers, checks the repo's
`CLAUDE.md` / `AGENTS.md` / `CODING_RULES.md` if present.

```bash
./examples/pr-review/setup-demo-branch.sh && git checkout demo/pr-review
# in Claude Code:
/pr-review main
```

## PR review: demo/pr-review → main (3 files, +8/-11)
Rules checked: none found

| # | Severity | Location | Problem | Suggested fix |
|---|----------|----------|---------|---------------|
| 1 | blocker | examples/pr-review/src/api.ts:2 | Every request now writes the user's bearer token in plain text to the console, so anyone with access to the console or collected logs can steal the session | Delete the line. If a log is needed, log only `url` |
| 2 | blocker | examples/pr-review/src/cart.ts:4 | `if (!item.qty)` treats `qty: 0` the same as a missing qty, so a removed item (qty 0) is charged one full unit and `cartTotal` comes out too high. The old `?? 1` only defaulted on `null` | `const qty = item.qty ?? 1; return qty * item.unitPriceCents;`, or `if (item.qty == null)` |
| 3 | blocker | examples/pr-review/src/useOrders.ts:9 | The `AbortController` and its cleanup were removed. If `customerId` changes from A to B and A's request finishes after B's, the hook shows A's orders under customer B. It also calls `setOrders` after the component unmounts | Restore the controller: pass `{ signal: controller.signal }`, ignore `AbortError` in `.catch`, and `return () => controller.abort();` |
| 4 | should fix | examples/pr-review/src/useOrders.ts:11 | `data: any` replaces the old `Promise<Order[]>` typing, so any response body (an error object, `null`) goes into `orders` and fails later in the consumers with no type error | `.then((res) => res.json() as Promise<Order[]>).then(setOrders)`, or validate the shape before calling `setOrders` |
| 5 | should fix | examples/pr-review/src/cart.ts:3 | `itemTotal` changed behavior with no test, which is how the `qty: 0` regression in #2 got through | Add tests for `itemTotal` with `qty` set to `null`, `0` and `3`, and for `cartTotal([])` |

**Verdict:** Don't ship. It leaks auth tokens to the console, charges for zero-quantity items, and can show one customer's orders to another.
**Next step:** Remove the `console.log` in `api.ts:2` before this branch runs anywhere, and treat any tokens already logged as exposed.

### `/auth0-rbac-check`

Finds route handlers, server actions, middleware and GraphQL entry points; proves each one
verifies the JWT and reads the role from verified claims (Auth0 roles/permissions,
`https://hasura.io/jwt/claims`) rather than from the client.

```
/auth0-rbac-check examples/auth0-rbac-check
```

## Auth/RBAC check — `examples/auth0-rbac-check` (4 endpoints)

| Endpoint | Auth check found? | Role required | Problem | Fix |
|----------|-------------------|---------------|---------|-----|
| DELETE /api/admin/users (app/api/admin/users/route.ts:9) | ❌ none | none (should be `admin`) | `DELETE /api/admin/users` with body `{"id":"<any user id>"}` and no token deletes that user. | Call `await requireRole(req, "admin")` at the start inside a try/catch, and return `toErrorResponse(error)` on failure. |
| GET /api/admin/users (app/api/admin/users/route.ts:4) | ❌ none (the comment at :3 relies on the admin UI login, which is not authorization) | none (should be `admin`) | `GET /api/admin/users` with no token returns every user's id, email and name. | Add a `req: Request` parameter and call `await requireRole(req, "admin")` first. Delete the misleading comment at :3. |
| GET /api/orders/[id] (app/api/orders/[id]/route.ts:3) | ❌ none (it reads the client headers `x-user-role` and `x-user-id` at :5-6) | `admin` or owner, but both come from headers the client sets (should come from the verified token) | `GET /api/orders/42` with header `x-user-role: admin` and no token returns any order. Sending `x-user-id: u1` also passes the ownership check at :11, so the IDOR check is bypassed too. | Use `const session = await requireSession(req)`, then allow access only if `session.roles.includes("admin") \|\| order.userId === session.userId`. Delete lines 5-6. |
| GET /api/me (app/api/me/route.ts:4) | ✅ verifies the JWT with `jwtVerify`, checking JWKS, issuer, audience and RS256 (lib/auth.ts:29-33) | any signed-in user | — | — |

**Notes**
- **No middleware:** there is no `middleware.ts` or `proxy.ts` in this folder, so the only protection any route has is what's in its own handler.
- **No server actions:** I found no `"use server"` code.
- **The auth helpers are sound:** `requireSession` and `requireRole` in `lib/auth.ts` verify the token properly. Roles come from the verified `https://hasura.io/jwt/claims` → `x-hasura-allowed-roles` claim (lib/auth.ts:38-41), and the user id comes from `sub`. The three bad routes just never call them.
- **Config risk, not an exploit:** if `AUTH0_AUDIENCE` is unset, `AUDIENCE` is `undefined` (lib/auth.ts:4), and `jose` then skips the audience check. That would accept tokens issued for other APIs on the same Auth0 tenant. It's worth failing at startup when that variable is missing.

**Summary:** 4 endpoints, 3 with no auth (one of which also bases its role and ownership checks on client headers), 0 with wrong authorization on a verified token, 1 OK.

**Fix first:** `DELETE /api/admin/users`. Anyone on the internet can delete any user account without a token, and the damage is permanent. The two GET leaks expose data but don't destroy it.

### `/hasura-permission-review`

Reads `metadata/databases/**/tables/*.yaml` and checks select/insert/update/delete per role.

```
/hasura-permission-review            # all tables
/hasura-permission-review orders     # one table
```

## Hasura permission review: 2 tables, 1 role (`examples/hasura-permission-review/hasura/metadata/databases/default`)

| Table | Role | Operation | Problem | Fix |
|-------|------|-----------|---------|-----|
| orders | user | insert | `check: {}`, and `user_id` and `org_id` are in `columns`. Any user can create an order for another user or another org: `mutation { insert_orders_one(object: {user_id: "<victim>", org_id: "<other-org>", total_cents: 100}) { id } }` | Remove `user_id` and `org_id` from `columns`. Add `set: {user_id: X-Hasura-User-Id, org_id: X-Hasura-Org-Id}` and `check: {_and: [{user_id: {_eq: X-Hasura-User-Id}}, {org_id: {_eq: X-Hasura-Org-Id}}]}` |
| orders | user | update | `user_id` is in `columns` and `check: null`. A user can move their own order to someone else: `mutation { update_orders_by_pk(pk_columns: {id: "<my-order>"}, _set: {user_id: "<victim>"}) { id } }` | Remove `user_id` from update `columns`. Add `check: {user_id: {_eq: X-Hasura-User-Id}}` |
| orders | user | select | `filter: {}` lets any user read every order from every user and org: `query { orders { id user_id org_id total_cents } }` | `filter: {_and: [{user_id: {_eq: X-Hasura-User-Id}}, {org_id: {_eq: X-Hasura-Org-Id}}]}` |
| orders | user | select | `payment_token` is in `columns`. It is the payment provider's token for the stored card, and `up.sql:15` says it "must never reach clients". Because the filter is `{}`, any user can read every user's tokens: `query { orders { user_id payment_token } }` | Remove `payment_token` from select `columns` |
| orders | user | select | `allow_aggregations: true` on money data with an open filter. Any user can get revenue totals across all orgs: `query { orders_aggregate { aggregate { count sum { total_cents } } } }` | Set `allow_aggregations: false`. Or keep it only after the filter is limited to the caller's own rows |
| orders | user | insert | `status` and `total_cents` are client-writable. A user can create an already-paid order with any amount: `mutation { insert_orders_one(object: {total_cents: 1, status: "paid", …}) { id } }` | Remove `status` and `total_cents` from insert `columns`. Let `status` fall back to the DB default `'pending'` and compute `total_cents` on the server (action or `backend_only: true` insert) |
| orders | user | update | `status` is client-writable. A user can mark their own order as paid: `mutation { update_orders_by_pk(pk_columns: {id: "<my-order>"}, _set: {status: "paid"}) { id } }` | Remove `status` from update `columns`. Change status only through a trusted backend (action or webhook) |

**Severity summary:** 3 critical (cross-user/tenant read or write), 4 high, 0 low.
**Clean:** projects/user (select, insert, update, delete). `X-Hasura-Org-Id` is confirmed as a JWT claim in `examples/hasura-permission-review/README.md:4`.
**Fix first:** Lock down `orders`. Add owner and org filters and checks, take `user_id`/`org_id` out of the writable columns, and remove `payment_token` from select.

### `/refactor-safely`

Run on [`examples/refactor-safely/src/utils.ts`](examples/refactor-safely/src/utils.ts),
a deliberately messy 147-line util module with one caller and 17 tests.

```bash
cd examples/refactor-safely && npm install
# in Claude Code:
/refactor-safely src/utils.ts
```

It stops after the plan. Nothing is edited until you reply `go`.

<details>
<summary><b>1. Plan (before any edit)</b></summary>

## Refactor plan: `src/utils.ts`

**Callers:** 2 files (I checked every tracked file; there are no re-exports, dynamic imports or mocks)
- `src/report.ts:1` uses `clearCache`, `formatDateTime`, `formatMoneyShort`, `orderTotal`, `slug`, `summarize` and `type Order`.
- `tests/utils.test.ts:2-15` uses every export except `LineItem`.

**Checks:** typecheck: `npm run typecheck` (`tsc --noEmit`) | lint: not available | tests: `npm test` (`vitest run`). Baseline: green (17 tests pass).

**Will change**
1. **Add characterization tests** to `tests/utils.test.ts` for the edge cases listed under "Test gap". I'll only add tests, not edit existing ones.
2. **Money:** pull the duplicated thousands-grouping loop and the currency-symbol branching into private helpers (`groupThousands`, `withCurrency`). Both `formatMoney` and `formatMoneyShort` will use them.
3. **Dates:** add a private `pad2` helper. `formatDate` and `formatDateTime` will share the date part instead of duplicating it.
4. **`lineTotal`:** flatten the 3-level nested `if`. Replace the magic `0.25` with a `DEFAULT_TAX_RATE` constant.
5. **`orderTotal`:** replace the magic numbers with `HOME_COUNTRY`, `FOREIGN_DISCOUNT_THRESHOLD` and `FOREIGN_DISCOUNT` constants. Change the cache type from `any` to `Record<string, number>` but keep it a plain object. Use optional chaining for `customer`.
6. **`customerLabel`:** use optional chaining and reuse `truncate(name, 20)` instead of the inline substring.
7. **Modernize the rest of the file:** `var` → `const`/`let`, `==` → `===` where it's safe, and indexed loops → `for…of`/`reduce` in `summarize` and `orderTotal`.

Each step is one edit and is followed by typecheck and tests.

**Must not change**
- Exported names and signatures: `LineItem`, `Order`, `formatMoney(cents, currency?)`, `formatMoneyShort(cents, currency?)`, `lineTotal(item)`, `orderTotal(order)`, `clearCache()`, `formatDate(iso)`, `formatDateTime(iso)`, `customerLabel(order)`, `summarize(orders, currency?)`, `slug(s)`, `truncate(s, n)`. All return types stay inferred as they are now.
- **Currency default:** `null` and `undefined` both mean EUR today (`== undefined`). I'll use `currency ?? "EUR"`, not a default parameter, because a default parameter would stop treating `null` as EUR.
- **Negative amounts:** both money formatters negate before rounding. So `formatMoneyShort(-49)` gives `"-€0"` and `formatMoneyShort(-50)` gives `"-€1"`. `Math.round(-0.5)` would give a different result, so the negate-first order stays.
- **Non-integer cents:** `formatMoney` passes fractional cents straight through (e.g. `150.5` → `"€1.50.5"`).
- **`lineTotal` rules:**
  - A discount that is falsy or ≤ 0 is ignored.
  - A discount in `(0, 1)` is a percentage, with no floor.
  - A discount ≥ 1 (including exactly 1) is an absolute amount, floored at 0.
  - `taxRate` 0 or missing means 25%.
  - The result goes through `Math.round`.
- **`orderTotal` rules:**
  - The cache is keyed by `id` and survives until `clearCache()`.
  - The 500 discount applies only when `country` is set, isn't `"HR"`, and the total is strictly > 10000.
- **Other behavior:**
  - Invalid dates return `""`.
  - Dates use UTC fields.
  - `customerLabel` trims the name and truncates at more than 20 characters with `"…"`.
  - `slug` keeps its replacement order.
  - `summarize`'s output stays exactly the same.

**Risks**
- **Currency lookup through a plain object:** a `{EUR:"€",…}` map would match prototype keys, e.g. `currency = "toString"`. In step 2 I'll use a `switch` or an `Object.hasOwn` check so unknown codes still fall through to `"<amount> <CODE>"`.
- **Cache as a plain object:** `orderTotal` on an order with `id: "toString"` currently returns the inherited function, not a number. That's a suspected bug (see below). Switching to a `Map` would change it, so I'll keep the object and leave it alone.
- **`==` → `===`:** this is only safe where `null` can't occur. I'll keep the null-aware checks (`?? "EUR"`, `!= null` style) wherever the old `==` matched both `null` and `undefined`.
- **Shared date part in `formatDateTime`:** it must still return `""` for invalid input, not `" 00:00"`. The new tests in step 1 pin this.

**Test gap:** the current tests don't cover:
- `formatMoneyShort(-49)` and the `.5` rounding boundary
- fractional cents in `formatMoney`
- `currency: null` (needs a cast)
- discount exactly `1`, and negative discounts
- the foreign-discount boundary: total exactly 10000, country `"HR"`, customer without a country
- a name of exactly 20 characters
- zero-padding of single-digit hours and minutes
- `slug` with only punctuation (should be `""`)

Step 1 adds characterization tests for these.

**Suspected bugs (I won't fix these, just flagging them):**
- `taxRate: 0` is treated as 25%. The existing test calls this "current behavior".
- The cache can return an inherited prototype value when `id` is something like `"toString"`.
- `formatMoney` prints malformed output for fractional cents.

**Out of scope:** splitting the file into `money` / `dates` / `orders` / `strings` modules. If you want that, I'd add it as a final step that keeps `utils.ts` as a re-exporting barrel so imports don't change.

Reply "go" to start, or tell me what to change.

</details>

<details>
<summary><b>2. After replying <code>go</code> — last step + summary</b></summary>

In headless mode only the final message is captured, so the per-step lines for steps 1–6
aren't shown here; interactively you see one `Step n: … typecheck ✅ tests ✅` line per
step. One unrelated line about claude.ai connectors at the very end was removed.

Step 7: replaced `var` with `const`/`let`, switched loops to `for…of`, and condensed `slug` and `truncate` — typecheck ✅ lint n/a tests ✅ (24 passed)

I deliberately left `cache[order.id] != undefined` (line 58) as it was. Changing it gains nothing and only adds risk.

## Refactor summary: `src/utils.ts`

All 7 steps are done. The public API is unchanged and typecheck and tests pass after every step. Two places differ from the plan: step 5 keeps the cache typed as `any`, and the old-vs-new comparison couldn't run (both explained below).

**Changed:**
- **Step 1:** added 7 characterization tests to `tests/utils.test.ts` for the edge cases from the plan. The count went from 17 to 24, and I didn't edit any existing tests.
- **Step 2:** `formatMoney` and `formatMoneyShort` now share the private helpers `groupThousands` and `withCurrency`.
  - I first tried a regex for the thousands grouping, then went back to the original loop. The regex formats `Infinity` and numbers ≥1e21 differently.
  - Currency symbols are looked up with an `Object.hasOwn` check, so a code like `"toString"` still falls through to the plain format.
- **Step 3:** added `pad2` and `datePart` helpers shared by `formatDate` and `formatDateTime`.
- **Step 4:** `lineTotal` is flattened and uses a `DEFAULT_TAX_RATE` constant. The arithmetic is unchanged so floating-point results stay identical.
- **Step 5:** `orderTotal` uses the `HOME_COUNTRY`, `FOREIGN_DISCOUNT_THRESHOLD` and `FOREIGN_DISCOUNT` constants plus optional chaining.
  - **Change from the plan:** the cache is still typed `any`. Retyping it would change `orderTotal`'s public return type from `any` to `number`, which counts as a signature change.
- **Step 6:** `customerLabel` uses optional chaining and reuses `truncate`.
- **Step 7:** `var` became `const`/`let`, loops are `for…of`, and `slug` and `truncate` are shorter.

**Unchanged (verified):**
- Public API: `LineItem`, `Order`, `formatMoney`, `formatMoneyShort`, `lineTotal`, `orderTotal`, `clearCache`, `formatDate`, `formatDateTime`, `customerLabel`, `summarize`, `slug`, `truncate`. Names and parameters are the same, and the inferred return types are the same, including `orderTotal: any`.
- Checks green: typecheck and tests. There is no lint script.

**Line count:** 147 → 122

**Test manually:**
- Call `buildReport` in `src/report.ts` with real data, including foreign customers, orders with discounts, and non-EUR currencies.
- I planned to compare the original and refactored `utils.ts` on several hundred inputs, including NaN, Infinity, huge numbers, `null` currency and odd dates. Running vitest outside the repo needed approval, which this session couldn't give, so it didn't run. The files are in the scratchpad: `old-utils.ts` and `diff.test.ts`. To run them: `npx vitest run --root .. --dir .. diff.test.ts` from `refactor-demo`.

**Remaining risks:** none known for normal inputs. Very unusual inputs (NaN, Infinity, numbers ≥1e21) are only covered by reasoning, because that comparison didn't run.

**Suspected bugs (left as they are, and pinned by tests):**
- `taxRate: 0` is charged the 25% default rate.
- Orders whose `id` matches a built-in object property, like `"toString"`, get back a function from `orderTotal` instead of a number.
- Fractional cents produce malformed output, e.g. `formatMoney(150.5)` gives `"€1.50.5"`.
- `formatMoneyShort(-49)` gives `"-€0"`.

Nothing is committed.


</details>

Independently re-checked after the run: `npm run typecheck` clean, `npm test` 24/24 passing.
The refactored copy isn't committed — `examples/` stays messy so it can be demoed again.

## Repo layout

```
.claude/skills/<skill>/SKILL.md   the skill (+ checklist.md where needed)
examples/                         code to run each skill on
docs/                             design notes + what's planted in each example
```

## Why I built these

I use Claude Code every day on production work. It's fast, but it also writes code that
looks right and is quietly wrong: a missing auth check, a `{}` Hasura filter, a "cleanup"
that changes behavior. These skills are the checks I was already doing by hand, written
down so the agent does them the same way every time, and has to prove each finding before
it reports it.

## License

MIT
