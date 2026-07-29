# BhashaFix architecture

## Principle

The Next.js application is a product surface, not the engine. The CLI, MCP
server, web routes, and CI workflow call shared TypeScript packages.

```text
apps / fixtures                  packages
AtlasPay target ───────────────► core
Next.js web ───────────────────► crawler + extractor
CLI ───────────────────────────► locale + linguistic + visual engines
MCP ───────────────────────────► repair engine + verifier
GitHub Actions ────────────────► report exporters
```

## Package boundaries

- `shared`: strict Zod contracts for scans, issues, repairs, and verification.
- `locale-engine`: BCP 47 canonicalisation and `Intl`-backed locale profiles.
- `linguistic-engine`: placeholders, ICU, glossary, memory, and pseudo-locales.
- `crawler`: URL/redirect/DNS policy and bounded fetching.
- `extractor`: contextual visible strings, stable IDs, and redaction.
- `visual-engine`: generic deterministic predicates and measurements.
- `core`: discovery and scan orchestration.
- `repair-engine`: plan/apply/rollback within the allowlist.
- `verifier`: identical predicates plus source-locale regression.
- `report`: JSON, HTML, SARIF, JUnit, and CSV.
- `providers`: provider-independent interface and no-model implementation.
- `cli` and `mcp`: protocol adapters over the same core.

## Canonical proof

The baseline is read from real JSON fixture files. Predicates evaluate their
measured state and generate stable issues. A repair plan maps explicit issue IDs
to exact allowlisted operations and emits a unified diff. Verification evaluates
the same predicates against the applied state, checks the source locale and new
blocking issues, and rejects out-of-policy diffs.

Replay JSON and screenshots are generated from that completed run and are
clearly labelled. The web interface imports the artifacts; it does not invent
scan success at request time.

## Trust zones

Public URL input is untrusted and passes through crawler policy. Extracted text
is untrusted and redacted. Repository paths are untrusted and resolved against
the project root. MCP input is untrusted and Zod-validated. Provider output is
untrusted and cannot satisfy a deterministic predicate.

## Storage

The local MVP uses `.bhashafix/` files and JSON artifacts. There is no mandatory
database, cloud account, authentication service, or paid dependency.
