# pr-review example

`setup-demo-branch.sh` creates a branch `demo/pr-review` with a small diff to review.

```bash
./examples/pr-review/setup-demo-branch.sh    # recreates the branch if it exists
git checkout demo/pr-review
claude   # then: /pr-review main
```

What's planted is listed in [docs/pr-review.md](../../docs/pr-review.md) — kept out of
this folder so the skill can't read the answer key.
