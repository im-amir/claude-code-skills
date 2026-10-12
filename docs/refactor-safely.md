# refactor-safely

**Problem.** AI-assisted refactors fail in a predictable way: a big-bang rewrite that
"looks cleaner", silently changes an edge case, and leaves you to find out in production.

**Design.**
- `disable-model-invocation: true` — Claude never starts a refactor on its own; only the
  user can run `/refactor-safely <path>`.
- Maps every caller of every export *before* planning, so "must not change" is concrete.
- Runs the repo's own checks (detected from `package.json`) to get a baseline first; a red
  baseline stops the run instead of being blamed on the refactor.
- Hard stop after the plan. Nothing is edited until the user says `go`.
- One step = one change = one green check run. On red: fix within the step or revert it;
  after two failed attempts, stop and ask. Tests are never loosened to get green.
- Suspected bugs are reported, not fixed — a refactor that changes behavior isn't one.

**Limits.** Only as safe as the tests. The plan includes a "test gap" line and suggests a
characterization test when coverage is thin.

**Try it.** `cd examples/refactor-safely && npm install`, then `/refactor-safely src/utils.ts`.
