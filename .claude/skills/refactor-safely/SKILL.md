---
name: refactor-safely
description: Refactor a file or module in small, verified steps — maps every caller first, writes a plan with what must not change, waits for approval, then changes one step at a time and runs typecheck/lint/tests after each. Only run when the user explicitly invokes /refactor-safely.
argument-hint: "<path-to-file-or-folder>"
disable-model-invocation: true
---

# Refactor safely

Target: `$ARGUMENTS`

The goal is a cleaner target with **identical public API and behavior**. Every step must
leave the checks green. If no target was given, ask for one and stop.

## Steps

1. **Map the target and its callers.**
   - Read the whole target (every file, if it's a folder).
   - List its exports. For each export, Grep the repo for imports and usages (named
     imports, default imports, re-exports, dynamic `import()`, string references in tests
     and mocks). Record `caller file:line → export used`.
   - Read the existing tests for the target, if any.
2. **Detect the checks.** Read `package.json` `scripts` (and the lockfile to pick
   `npm`/`yarn`/`pnpm`). Map: typecheck (`typecheck`, `type-check`, `tsc`), lint (`lint`),
   tests (`test`). If a check has no script, say "not available" — do not invent one or
   install anything. Run all available checks once now to get a **baseline**. If the
   baseline is already red, report which checks fail and ask whether to continue.
3. **Write the plan** in this format, then **STOP and wait for the user's approval**:

   ```
   ## Refactor plan: <target>

   **Callers:** <n> files — <file:line → export, one per line or grouped>
   **Checks:** typecheck: `<cmd>` | lint: `<cmd or not available>` | tests: `<cmd or not available>` — baseline: <green/red>

   **Will change**
   1. <step — one small, independently verifiable change>
   2. …

   **Must not change**
   - <exported names and signatures>
   - <observable behavior incl. edge cases: null/empty/0 handling, error messages, rounding>

   **Risks**
   - <what could break and how the step guards against it>

   **Test gap:** <behavior the existing tests don't cover; propose adding a characterization test as step 1 if so>

   Reply "go" to start, or tell me what to change.
   ```

   Do not edit anything before the user approves. If they ask for changes, revise the
   plan and stop again.
4. **Execute one step at a time.** Make only the change described in that step. Prefer
   pure moves and renames inside the module; keep exported names and signatures.
5. **Check after every step.** Run every available check from step 2. Report one line:
   `Step <n>: <what changed> — typecheck ✅ lint ✅ tests ✅ (12 passed)`.
6. **Never move on red.** If a check fails: fix it within the scope of the same step, or
   revert that step's edits and report why. After two failed fix attempts, revert the step
   and stop to ask the user. Never disable, skip or loosen a test or lint rule to get green.
7. **Summarize** at the end:

   ```
   ## Refactor summary: <target>

   **Changed:** <bullets, one per step>
   **Unchanged (verified):** public API <list>; checks green: <list>
   **Line count:** <before> → <after>
   **Test manually:** <concrete things checks cannot prove, e.g. a screen or call path>
   **Remaining risks:** <anything not covered by tests, or "none known">
   ```

## Do not

- Do not edit before step 3 is approved.
- Do not change exported names, signatures, return shapes, thrown error types/messages, or
  side effects unless the approved plan says so explicitly.
- Do not change behavior "while you're there" — report suspected bugs in the summary
  instead of fixing them.
- Do not batch several plan steps into one edit, and do not continue with failing checks.
- Do not edit tests to make them pass, except adding new characterization tests from the plan.
- Do not install, upgrade or remove dependencies, or change config (tsconfig, eslint, CI).
- Do not commit, push, or run destructive git commands (`reset --hard`, `checkout .`,
  `clean`); revert a step by re-applying the previous content with the edit tool.
