# pr-review example

`src/` on `main` is correct. `setup-demo-branch.sh` creates branch `demo/pr-review` with
three planted bugs:

1. `cart.ts` — `if (!item.qty)` bills an explicit quantity of `0` as 1 item.
2. `useOrders.ts` — the effect's `AbortController` cleanup is removed (stale response race,
   setState after unmount), and the response is typed `any`.
3. `api.ts` — the bearer token is written to `console.log`.

```bash
./examples/pr-review/setup-demo-branch.sh    # once; recreates the branch if it exists
git checkout demo/pr-review
claude   # then: /pr-review main
```
