# refactor-safely example

`src/utils.ts` is a deliberately messy ~150-line util module: duplicated formatting,
deep nesting, magic numbers, a mutable module-level cache, and mixed concerns (money,
dates, strings, order totals in one file). `src/report.ts` is its only caller and
`tests/utils.test.ts` pins the current behavior.

```bash
cd examples/refactor-safely && npm install
npm run typecheck && npm test     # baseline: both green
```

Then from that folder: `/refactor-safely src/utils.ts`.
The skill stops after its plan; reply `go` to let it execute.
