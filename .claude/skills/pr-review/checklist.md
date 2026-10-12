# PR review checklist

Work through each section for every changed hunk. A box only matters if the diff touches it.

## Correctness
- Does the code do what the commit message / branch name says?
- Changed function signatures: are all callers updated? Return type still honored?
- Conditionals: inverted logic, `&&` vs `||`, wrong comparison operator, `==` vs `===`.
- Async: missing `await`, unhandled promise, `forEach` with an async callback,
  `Promise.all` where one failure should not cancel the rest.
- Mutation of arguments or shared state that callers don't expect.
- Error handling: swallowed errors (`catch {}`), errors turned into success values.

## Edge cases
- `null` / `undefined` inputs and optional fields.
- Empty string, empty array, empty object (`reduce` without initial value, `arr[0]`, `Math.max(...[])`).
- **`0` vs falsy**: `if (!value)`, `value || default`, `&&` rendering `0` in JSX. Prefer `??` and `== null`.
- `NaN` from `Number()`/`parseInt` on bad input; division by zero.
- Off-by-one in loops, slices, pagination, date ranges (inclusive vs exclusive end).
- Time zones and DST when dates are built or compared.
- Large inputs: unbounded loops, N+1 requests, unpaginated queries.

## Security
- Hard-coded secrets, API keys, tokens, passwords, private URLs — including in tests and fixtures.
- Tokens, cookies, passwords or PII written to logs, error messages or client bundles
  (`NEXT_PUBLIC_*`, props passed to client components).
- Injection: string-built SQL/GraphQL/shell commands, `dangerouslySetInnerHTML`, `eval`,
  unvalidated redirects, path traversal from user input.
- New API routes / server actions / handlers without an auth check, or with authorization
  based on client-sent data (role, user id, org id in body/query/headers).
- CORS widened, CSRF protection removed, cookies missing `httpOnly`/`secure`.

## React
- Lists rendered with `.map` without a stable `key` (or `key={index}` on reorderable lists).
- `useEffect` that subscribes, sets a timer, or fetches without cleanup / `AbortController`
  → leaks, or a slow old response overwriting a newer one (race).
- Missing or wrong dependency arrays; stale closures in callbacks and intervals.
- State set during render; derived state copied into `useState` and never synced.
- Conditional hook calls.

## TypeScript
- New `any` (explicit or implicit), `as` casts that bypass a real type mismatch,
  `as unknown as T`, non-null `!` on values that can be null.
- `@ts-ignore` / `@ts-expect-error` without a reason.
- Widened types (`string` where a union is known), unchecked `JSON.parse` results.

## Hygiene
- `console.log` / `debugger` / commented-out code / TODOs without a ticket.
- Dead code: unused exports, unreachable branches, unused params or imports.
- Duplicated logic that already exists as a helper in the repo (Grep for it).

## Tests
- New logic or a bug fix with no test.
- Tests changed to match new (possibly wrong) behavior instead of the other way round.
- Assertions removed or loosened, tests skipped (`.skip`, `.only` left in).
