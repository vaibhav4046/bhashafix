# Technical architecture

```text
URL / repository / AtlasPay fixture
               │
    Discover → Crawl → Extract
               │
     BCP 47 locale intelligence
               │
 deterministic + confidence-scoped checks
               │
 Playwright render / stress / axe evidence
               │
 stable issue contract (Zod, BF-* IDs)
               │
 explicit scan + issue IDs
               │
 allowlisted repair plan → unified diff
               │
 identical predicates + en-GB regression
               │
 JSON / HTML / SARIF / JUnit / CSV / patch
```

## Shared core

The Next.js app, CLI, MCP server, and GitHub Actions call the same workspace
packages: `core`, `crawler`, `extractor`, `locale-engine`,
`linguistic-engine`, `visual-engine`, `repair-engine`, `verifier`, `report`,
`providers`, `config`, and `shared`.

## Safety boundary

Hosted URL scans enforce protocol, DNS, redirect, private-network,
response-size, timeout, and rate policies. Repairs resolve regular files inside
the project root, reject symlinks and path traversal, require an allowlist, show
the diff before application, keep rollback data, and never commit
automatically.

## Proof boundary

The AtlasPay baseline and final state live in actual JSON files. Generic
predicates evaluate those files. The replay bundle is generated after the real
apply-and-verify run and is labelled. AI output can explain an issue; only the
identical predicate and regression gate can accept a repair.
