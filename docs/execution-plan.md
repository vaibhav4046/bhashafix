# BhashaFix execution plan

This plan is the release ledger for the global localisation engineering platform.
It is intentionally ordered around verified product risk rather than visual
completeness.

## Product contract

BhashaFix is the verification harness between AI-generated translations and
production software. Deterministic engineering checks are authoritative.
Linguistic judgements carry confidence and human-review gates.

The implementation remains provider-independent and locale-agnostic. Locale
behaviour comes from BCP 47 tags, Unicode properties, `Intl`, configuration and
test fixtures rather than per-language product branches.

## Milestone 0 — preserve the working proof

- Keep the existing five-to-zero Zariya proof runnable while the new platform
  is built.
- Retain its real screenshots, patches and command receipts as legacy evidence.
- Do not weaken its assertions or replace the browser predicates with static
  success data.

Exit gate: the existing release verification remains green.

## Milestone 1 — shared workspace and contracts

- Convert the repository to a pnpm workspace.
- Add shared issue, scan, locale, repair, report and provider contracts.
- Add a locale engine based on `Intl.Locale`, `Intl.PluralRules` and Unicode
  script metadata.
- Add deterministic translation checks, pseudo-localisation, glossary and
  translation-memory support.
- Add security primitives for URL policy, path confinement, redaction and
  command allowlisting.

Exit gate: unit tests cover locale validation, direction, placeholders, ICU,
glossary, memory, pseudo-localisation, SSRF and repair boundaries.

## Milestone 2 — AtlasPay proof target

- Add a five-route startup product fixture.
- Seed ten independently detectable defects across ten locales and scripts.
- Record stable issue identifiers, evidence and owning source files.
- Restrict repairs to a documented allowlist and generate a unified patch plus
  rollback data.

Exit gate: baseline scan detects the expected ten issues; identical verification
after repair produces zero blocking issues and source-locale regression PASS.

## Milestone 3 — CLI, MCP, reports and CI

- Ship `@bhashafix/cli` with all documented commands, structured output and
  stable exit codes.
- Ship a strict local STDIO `@bhashafix/mcp` server with the required tools,
  resources and prompts.
- Generate JSON, HTML, SARIF, JUnit, CSV, patch and screenshot manifests.
- Add a GitHub Actions workflow with browser installation, scan execution,
  artifacts and severity-aware failure.

Exit gate: CLI scan and verify pass; MCP tools/list, scan and verify invocations
pass; reports validate against their schemas.

## Milestone 4 — complete web product

- Replace the proof-only shell with the Living Language System.
- Add landing, new-scan wizard, live scan workspace, issue explorer, linguistic
  review, visual review, repairs, report, glossary, memory, integrations, docs
  and playground routes.
- Provide live public-URL inspection through the shared URL policy and a clearly
  labelled deterministic replay for AtlasPay.
- Support dark, light, mobile, desktop and reduced-motion experiences.

Exit gate: the required routes render, interactions are keyboard accessible,
both themes pass, 390×844 and 1440×900 pass, and production browser consoles
remain clean.

## Milestone 5 — open-source and submission release

- Add the licence, contribution, conduct, security, architecture, roadmap,
  changelog and agent guidance files.
- Refresh the screenshot-backed ten-slide deck and all submission documents.
- Produce the release manifest and reproducible proof artifacts.
- Publish the verified production build.

Exit gate: `pnpm verify` passes every mandatory local check and the release
contract is recorded with actual command exit codes.

## Deliberate P2 boundaries

The release will document, not imitate, multi-tenant accounts, billing,
enterprise SSO, remote MCP hosting, automatic arbitrary-repository mutation,
browser extensions, cloud-scale scan orchestration and a translator
marketplace.
