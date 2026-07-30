# BhashaFix winner-grade execution plan

This plan extends the verified `5e8cd36` baseline without discarding its working
architecture or genuine AtlasPay proof. Exit gates require execution evidence,
not appearance.

## Product contract

BhashaFix is the verification harness between AI-generated translations and
production software. Deterministic engineering checks are authoritative.
Linguistic judgements carry confidence and human-review gates.

The implementation remains provider-independent and locale-agnostic. Locale
behaviour comes from BCP 47 tags, Unicode properties, `Intl`, configuration and
test fixtures rather than per-language product branches.

## P0.1 — establish and preserve truth

- Commit the baseline audit and exact product truth matrix.
- Add the locked origin taxonomy to scan, issue and report schemas.
- Make every live, local, guided, replay and synthetic surface show its origin.
- Keep replay artifacts visibly separate from user-controlled scans.

Exit gate: schemas reject unsupported origins and all existing proof still
passes.

## P0.2 — complete the web information architecture

- Add overview, routes and accessibility scan views.
- Add `/demo`, AtlasPay demo/report, integration-detail, trust and motion-lab
  routes while preserving legacy URLs.
- Replace the landing hero with the locked comprehension copy and move AtlasPay
  proof into a visually separate guided-proof section.
- Create the complete scalable SVG brand asset family.

Exit gate: every locked route returns 200 or an intentional redirect and has no
console/hydration error.

## P0.3 — make records and user-owned data real

- Persist completed public scans locally with target, origin, status, routes,
  locales, issue counts and report link.
- Add retry, delete and duplicate-configuration actions.
- Implement glossary CRUD, search, locale filter, validation, import/export and
  local persistence.
- Implement translation-memory import, search, filter, approval, export and
  local persistence.

Exit gate: data survives navigation/reload; browser tests exercise create,
edit, delete, import and export.

## P0.4 — acceptance fixtures and per-scan reports

- Add clean, deliberately broken and unreachable fixture definitions with
  exact expected outcomes.
- Ensure hosted/static findings use the locked issue schema without fabricated
  source hints or screenshots.
- Produce genuine per-scan JSON, HTML, CSV, SARIF and JUnit downloads; provide a
  screenshots ZIP only when real screenshots exist.
- Expose truthful loading, completed, warning and failure/retry states.

Exit gate: clean is 0 blockers, broken matches the six exact rules and
unreachable produces no fake report.

## P0.5 — external CLI and MCP proof

- Run packed CLI help, doctor and fixture scan from a clean consumer directory.
- Save commands, output and exit codes in submission evidence.
- Externally invoke MCP inspect, create/run scan, issue list, report generation,
  repair dry run and verification.
- Save redacted structured outputs under `submission/mcp-output/`.

Exit gate: all calls run through packaged/STDIO boundaries, not internal
handlers.

## P0.6 — motion, accessibility and hostile release audit

- Add `/motion-lab` and reduced-motion-safe motion primitives.
- Derive replay console rows and CI summary from generated receipts.
- Expand browser tests for locked routes, motion remounts, pointer behavior,
  keyboard access, persistence and downloads.
- Run the hostile searches, clean install, full verification, pack verification,
  demo proof, MCP proof and submission preparation.
- Redeploy Vercel, open the production URL at required viewports and record
  console/network results.

Exit gate: the completion contract has command receipts and no mandatory gap is
silently labelled complete.

## Preserved foundation — working proof

- Keep the existing five-to-zero Zariya proof runnable while the new platform
  is built.
- Retain its real screenshots, patches and command receipts as legacy evidence.
- Do not weaken its assertions or replace the browser predicates with static
  success data.

Exit gate: the existing release verification remains green.

## Preserved foundation — shared workspace and contracts

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

## Preserved foundation — AtlasPay proof target

- Add a five-route startup product fixture.
- Seed ten independently detectable defects across ten locales and scripts.
- Record stable issue identifiers, evidence and owning source files.
- Restrict repairs to a documented allowlist and generate a unified patch plus
  rollback data.

Exit gate: baseline scan detects the expected ten issues; identical verification
after repair produces zero blocking issues and source-locale regression PASS.

## Preserved foundation — CLI, MCP, reports and CI

- Ship `@bhashafix/cli` with all documented commands, structured output and
  stable exit codes.
- Ship a strict local STDIO `@bhashafix/mcp` server with the required tools,
  resources and prompts.
- Generate JSON, HTML, SARIF, JUnit, CSV, patch and screenshot manifests.
- Add a GitHub Actions workflow with browser installation, scan execution,
  artifacts and severity-aware failure.

Exit gate: CLI scan and verify pass; MCP tools/list, scan and verify invocations
pass; reports validate against their schemas.

## Preserved foundation — web product

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

## Preserved foundation — open-source and submission release

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

## Preserved foundation — real-user trust hardening

- Make the first action a real public-site scan instead of a demo-first wizard.
- Crawl up to five bounded same-origin HTML routes with SSRF and redirect
  validation plus available robots-policy handling.
- Show each fetched route, static string count, language/direction metadata,
  measured issue evidence and the exact checks that did and did not run.
- Keep JavaScript rendering, screenshots, axe, authentication and source repair
  explicitly local until a dedicated browser worker exists.
- Reject conservative-predicate false positives such as dotted product brands
  being mistaken for translation keys.

Exit gate: focused scanner regressions, production build, browser E2E, a real
five-route public-product scan, the full release gate and production smoke all
pass without console errors or unsupported coverage claims.
