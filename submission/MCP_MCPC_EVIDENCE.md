# MCP and MCPC evidence

Generated: 2026-07-30T11:12:42.353Z

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
`packages/mcp/dist/server.js`. The in-memory Vitest suite remains an
additional schema and handler test, not the release proof by itself.
