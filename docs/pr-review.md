# pr-review

**Problem.** Self-review before a PR is where cheap bugs should die, but it's easy to skim
your own diff. Generic "review this" prompts produce long, vague essays.

**Design.**
- Reviews `git diff <base>...HEAD` (three dots = only what the branch added), and reads the
  surrounding function and the callers, because most real bugs live at the boundary
  between a hunk and code that didn't change.
- Loads the repo's own rules (`CLAUDE.md`, `AGENTS.md`, `CODING_RULES.md`) so the review
  enforces team conventions, not generic taste.
- A verification step forces every finding to name the input that breaks it; findings
  that can't are dropped. This is what keeps the false-positive rate tolerable.
- Fixed output: one severity-ranked table + a two-line verdict, so it's skimmable and
  diffable between runs.
- `allowed-tools` pre-approves only `git diff/log/status/rev-parse/symbolic-ref`;
  `disallowed-tools` removes Edit/Write so the skill can't "helpfully" fix things.

**Limits.** It doesn't run the code or tests. Severity is judgment. It reviews committed
changes only — uncommitted work is mentioned, not reviewed.

**Try it.** `examples/pr-review/setup-demo-branch.sh`, check out `demo/pr-review`, run
`/pr-review main`. Three bugs are planted (see `examples/pr-review/README.md`).
