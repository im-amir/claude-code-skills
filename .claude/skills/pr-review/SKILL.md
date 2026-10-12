---
name: pr-review
description: Review the current branch's diff before opening a pull request — finds correctness bugs, edge cases, security holes, React/TypeScript issues, leftover debug code and missing tests, and reports them as a severity-ranked table. Use when the user is about to open a PR, asks "review my changes/branch/diff", or wants a pre-merge check.
argument-hint: "[base-branch]  (default: main)"
allowed-tools: Bash(git diff *) Bash(git log *) Bash(git status) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git rev-list *) Read Grep Glob
disallowed-tools: Edit Write NotebookEdit
---

# PR review

Review the changes on the current branch against a base branch, the way a careful senior
reviewer would, and report findings. **Do not edit files. Only report.**

Base branch argument: `$ARGUMENTS`

## Steps

1. **Pick the base branch.**
   - If an argument was given, use it.
   - Otherwise use `main`. If `git rev-parse --verify main` fails, use the remote default
     (`git symbolic-ref refs/remotes/origin/HEAD`, strip `refs/remotes/origin/`).
   - If no base can be found, stop and ask the user which branch to compare against.
   - **Sanity-check the base, then stop and ask instead of reviewing** if any of these hold:
     - the current branch (`git rev-parse --abbrev-ref HEAD`) *is* the base, or is itself a
       long-lived branch (`main`, `master`, `dev`, `develop`, `release`, `production`,
       `staging`) — there is no feature branch to review;
     - `git rev-list --count <base>..HEAD` is over 50, or `git diff --stat <base>...HEAD`
       touches over 100 files — this is a branch-vs-branch comparison, not a PR.
     Report the branch, base, commit and file counts in 2–3 lines, suggest
     `git checkout <feature-branch>` and `/pr-review <base>`, and end. Do not review.
     If the user passed the base explicitly and still gets a large diff, ask once whether
     they really want a review of that size.
2. **Collect the diff.**
   - `git status` — note uncommitted changes; they are NOT part of the review, mention them
     in the verdict if present.
   - `git log --oneline <base>...HEAD` — what the branch claims to do.
   - `git diff --stat <base>...HEAD`, then `git diff <base>...HEAD`.
   - If the diff is empty, say so and stop.
3. **Load the project's rules.** If any of `CODING_RULES.md`, `CLAUDE.md`, `AGENTS.md`,
   `CONTRIBUTING.md` exist at the repo root (or next to changed files), read them. A
   violation of an explicit project rule is at least **should fix**. Only call something
   a project-rule violation if you read that file in this run and can quote the rule;
   otherwise judge it on its own merits.
4. **Read context, not just hunks.** For every changed file, read the whole function or
   component around each hunk, plus direct callers of anything whose signature or
   behavior changed (use Grep). Skip lockfiles, generated code and binary files.
5. **Check every hunk against [checklist.md](checklist.md).** Main areas:
   correctness · edge cases (null/undefined, empty, `0` vs falsy, off-by-one) · security
   (secrets, injection, missing auth, logging tokens) · React (keys, effect cleanup, stale
   closures, races) · TypeScript (`any`, unsafe `as`, non-null `!`) · dead code and
   `console.log` · missing or weakened tests.
6. **Verify before reporting.** For each candidate finding, re-read the code and confirm
   the failure is real: name the input or sequence that breaks it. Drop anything you
   cannot justify. Do not report style preferences that a formatter/linter would handle.
7. **Rank and write the report** in the exact format below.

## Severity

- **blocker** — wrong result, crash, data loss, security hole, or broken contract for callers.
- **should fix** — real but narrower bug, missing test for new logic, project-rule violation,
  `any`/unsafe cast, debug output left in.
- **nit** — clarity or small cleanup; never more than 5 nits.

## Output format

Exactly this, nothing before the heading:

```
## PR review: <current-branch> → <base> (<N> files, +<added>/-<removed>)
Rules checked: <files read in step 3, or "none found">

| # | Severity | Location | Problem | Suggested fix |
|---|----------|----------|---------|---------------|
| 1 | blocker | src/cart.ts:14 | `if (!qty)` treats a quantity of 0 as "missing" and defaults it to 1 | `if (qty == null)` |

**Verdict:** <one line: ship / ship after fixes / do not ship, and why>
**Next step:** <one line: the single most important thing to do first>
```

Rules for the table:
- Sort blockers first, then should fix, then nit.
- `Location` is `path:line` from the repo root, pointing at the new code.
- `Problem` states the failure, not the category ("returns NaN when list is empty", not
  "edge case issue").
- `Suggested fix` is concrete — a code fragment or a one-line instruction.
- If nothing survives step 6, output the heading, the line `No issues found.`, and the verdict.

## Do not

- Do not edit, create, stage or commit files. Do not run `git checkout`, `git stash`,
  `git reset` or anything that changes the working tree.
- Do not review code outside the diff except to understand it; pre-existing issues may be
  mentioned once in the verdict, not in the table.
- Do not invent line numbers — read the file to get them.
- Do not pad the report with praise, summaries of what the PR does, or generic advice.
- Do not report the same root cause twice; list the first location and say "also at …".
