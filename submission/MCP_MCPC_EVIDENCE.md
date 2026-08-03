# MCP and MCPC evidence

Generated: 2026-08-03T06:34:26.976Z

The 10-to-0 repair sequence below is explicitly scoped to the bundled AtlasPay
fixture. It proves that external MCP clients can drive the guarded fixture
workflow over the built STDIO server; it does not claim arbitrary-project
source repair. Project inspection, schemas and transport checks exercise the
general MCP surface separately.

| Client | Transport | Tools | Baseline | Final | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Official MCP Inspector | STDIO built package | 18 | 10 | n/a | PASS |
| Official TypeScript client | Spawned STDIO built package | 18 | 10 | 0 | verified |
| @apify/mcpc | Persistent STDIO session | 18 | 10 | n/a | PASS |

Executed commands:

```text
pnpm mcp:inspect
pnpm mcpc:smoke
```

The Inspector and MCPC receipts were produced by external clients against
`packages/mcp/dist/bin.js`. The in-memory Vitest suite remains an
additional schema and handler test, not the release proof by itself. Every
baseline and final count in this table is AtlasPay fixture evidence.
