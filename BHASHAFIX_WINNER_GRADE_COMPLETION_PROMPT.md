# BhashaFix winner-grade completion and release contract

This document is authoritative for completion and release work in this
repository. Preserve verified work. Do not rebuild working systems merely to
match an example architecture.

## 1. Product truth

BhashaFix is an open-source global localisation engineering platform.

> BhashaFix supports Unicode content and user-selected BCP 47 locales through a
> provider-independent localisation pipeline. Deterministic engineering checks
> are authoritative. Linguistic judgements include confidence levels and
> human-review gates.

BhashaFix is the verification harness between generated translations and
production software. It discovers content, checks locale behaviour, records
browser and deterministic evidence, prepares bounded repository repairs,
reruns identical checks, and produces portable proof.

It must never claim universal native-language perfection.

## 2. Current verified vertical slice

The bundled AtlasPay target contains ten canonical localisation defects:

1. Devanagari tall-glyph clipping.
2. German CTA expansion overflow.
3. Arabic wrong direction.
4. Hebrew icon order.
5. Japanese raw translation key.
6. Simplified Chinese font coverage.
7. Thai line breaking.
8. French placeholder corruption.
9. Mexican Spanish glossary inconsistency.
10. English source-locale metadata.

The release proof is:

`10 verified failures -> bounded repair -> 0 blocking failures -> en-GB PASS`

Do not change that canonical count merely to make a test pass.

## 3. Global locale architecture

The engine accepts arbitrary valid BCP 47 identifiers through `Intl` rather
than language-specific condition chains. The representative release registry
must cover:

- Latin.
- Cyrillic.
- Arabic.
- Hebrew.
- Persian.
- Devanagari.
- Bengali.
- Tamil.
- Ethiopic.
- Simplified Chinese.
- Traditional Chinese.
- Japanese.
- Korean.
- Thai.
- Vietnamese.
- Indonesian.

## 4. Product surfaces

One shared TypeScript engine powers:

- Next.js web application.
- `@bhashafix/cli`.
- `@bhashafix/mcp`.
- GitHub Actions CI.

The web application includes URL/repository scan configuration, route and
locale evidence, linguistic and visual review, glossary and memory surfaces,
bounded repairs, proof reports, downloads, documentation, and a synthetic
localisation preview.

## 5. Public URL truth

Hosted public-URL scans validate URLs, block SSRF and metadata destinations,
revalidate redirects, limit response size and time, extract visible strings,
and report deterministic findings.

The Vercel product has two bounded public paths: a same-origin static-HTML crawl
of up to five routes with robots-policy handling, and a real Chromium quick scan
for one route, up to three locales and one viewport. The browser path revalidates
every redirect and subrequest against the hosted network policy. Full matrices
and authenticated scans run locally or in a dedicated containerised scanner
worker. Public scans diagnose only; they never claim to modify a website without
repository access.

## 6. Synthetic localisation preview

When a target locale is not present, BhashaFix may generate a temporary
pseudo-localised specimen, preserve placeholders and protected terms, and
render it in an isolated sandboxed browser frame.

Every such result must be labelled:

`Synthetic localisation preview — not the production website.`

## 7. Repository repair truth

Repository repairs require:

- Explicit scan ID.
- Explicit issue IDs.
- An allowlisted path.
- Symlink and traversal rejection.
- A visible unified diff.
- Exact diff confirmation before mutation.
- Rollback material.
- Identical-predicate verification.
- Source-locale regression protection.

Public website scans never mutate remote websites.

## 8. CLI contract

The packaged `bhashafix` binary exposes:

- `init`
- `doctor`
- `inspect`
- `locales`
- `crawl`
- `extract`
- `scan`
- `translate-preview`
- `issues`
- `repair --dry-run`
- `repair --apply`
- `verify`
- `report`
- `ci`
- `mcp`

Compatibility aliases may remain. Human output, JSON output, stable exit codes,
no-AI mode, dry-run mode, and clean temporary-project package execution are
mandatory.

## 9. MCP contract

The local STDIO server exposes at least:

- `bhashafix_inspect_project`
- `bhashafix_list_locales`
- `bhashafix_create_scan`
- `bhashafix_run_scan`
- `bhashafix_get_scan`
- `bhashafix_list_issues`
- `bhashafix_get_issue`
- `bhashafix_check_translation`
- `bhashafix_generate_virtual_preview`
- `bhashafix_prepare_repair`
- `bhashafix_apply_repair`
- `bhashafix_verify_repair`
- `bhashafix_generate_report`

Compatibility tools may remain. Inputs use strict schemas and dangerous calls
retain the repository repair constraints.

Verification must invoke the built STDIO server through:

- The official MCP Inspector CLI.
- The official TypeScript MCP client over a spawned STDIO process.
- `mcpc`, the independent universal MCP command-line client.

In-memory handler tests are useful but are not sufficient evidence alone.

## 10. Design contract

The design system is the Living Language System:

- Dark and light themes.
- Near-black, violet, purple, cream and saffron-yellow palette.
- Script-aware typography and fallbacks.
- Editorial layouts and evidence ledgers.
- Route-locale matrices and annotated screenshots.
- An original linguistic SVG mark.
- State-driven scan, diff and verification motion.
- Reduced-motion alternatives.
- No generic chatbot, fake testimonial, fabricated metric or decorative layer
  that blocks interaction.

## 11. Hosted architecture truth

The web experience is deployed to Vercel. A bounded quick scan may execute real
Chromium within the serverless time and memory ceiling. Heavy browser matrices
belong in local mode or a Dockerised Playwright worker connected through an
explicitly configured job store. The current release must not imply that Vercel
executes arbitrary full-browser jobs.

## 12. Security contract

Required controls include URL validation, DNS and redirect checks, private and
metadata network blocking, response and timeout limits, path confinement,
symlink rejection, allowlisted mutation, secret redaction, HTML escaping,
rollback, audit logs and truthful provider fallback.

## 13. Submission package

`submission/` contains:

- `BhashaFix-Hackathon-Deck.pptx`
- `FINAL_SUBMISSION_FORM.md`
- `ONE_LINE_PITCH.txt`
- `PROJECT_DESCRIPTION.md`
- `DEMO_SCRIPT_90_SECONDS.md`
- `PITCH_SCRIPT_3_MINUTES.md`
- `TECHNICAL_ARCHITECTURE.md`
- `CODEX_USAGE_EVIDENCE.md`
- `MCP_MCPC_EVIDENCE.md`
- `EVAL_RESULTS.md`
- `MARKET_POSITIONING.md`
- `JUDGING_CHECKLIST.md`
- `RELEASE_MANIFEST.json`
- `repair-proof.json`
- `repair.patch`
- `screenshots/`

The deck uses real screenshots and real proof. Never invent public links,
customers, revenue, benchmarks, stars, partnerships or submission
confirmation.

## 14. Required commands

The following commands must exist and pass:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm test:cli
pnpm test:mcp
pnpm build
pnpm verify
pnpm pack:verify
pnpm demo:reset
pnpm demo:scan
pnpm demo:repair
pnpm demo:prove
pnpm mcp:inspect
pnpm mcpc:smoke
pnpm submission:prepare
```

## 15. Prohibited completion shortcuts

Do not:

- Replace real checks with mocked success.
- Present replay as live.
- Use fake progress or `setTimeout` scan events.
- Hard-code the expected final count in a verifier.
- Weaken assertions or disable tests.
- Suppress TypeScript or lint errors.
- Mark provider failure as verification success.
- Leak secrets.
- Commit `.env` credentials.
- Claim remote mutation for a public URL.
- Claim universal linguistic perfection.

## 16. External boundaries

When GitHub, package publication or an organiser dashboard requires unavailable
authentication, finish every local artifact and record exact manual commands in
`MANUAL_AUTH_REQUIRED.md`. Do not invent success.

## 17. Release narrative

> AI systems can generate translations, but they cannot see every clipped
> button, broken RTL layout, corrupted placeholder, glossary violation or
> accessibility regression. BhashaFix provides the specialised testing
> harness. It combines deterministic browser evidence, locale-aware
> constraints, linguistic review, bounded repair and identical-test
> verification. Developers use it through the web, terminal, CI or MCP.

## 18. Package release rules

The CLI and MCP tarballs must install into a clean temporary project without
access to monorepo workspace packages. Their binaries must execute help,
locale-registry, doctor and MCP capability operations from the installed
tarballs.

## 19. Evidence rules

Every evidence document distinguishes:

- Live execution.
- Genuine replay generated by an earlier live execution.
- Deterministic result.
- Model-assisted recommendation.
- Human review requirement.
- Unverified roadmap capability.

## 20. Browser release matrix

Mandatory release inspection covers:

- 390 x 844.
- 1440 x 900.
- Dark mode.
- Light mode.
- Reduced motion.
- Keyboard access.
- Accessibility.
- Console and hydration errors.
- Report and patch downloads.

Chromium is mandatory. Firefox and WebKit are tested where the installed
environment permits and otherwise remain an honest limitation.

## 21. Completion workflow

Preserve valid work, inspect the current repository, close the highest-risk
release gaps, run narrow tests after each change, then run the entire gate.
Commit only verified increments.

## 22. No routine clarification

Choose the simplest safe implementation consistent with this contract. Ask
only for external authentication, a secret controlled by the user, or a
material product decision not answered here.

## 23. Mandatory release contract

Completion requires:

- Clean install: PASS.
- Production build: PASS.
- Security tests: PASS.
- Browser E2E: PASS.
- Real scanner: PASS.
- Real screenshots: PASS.
- Global locale registry: PASS.
- Guided demo scan: PASS.
- Real patch: PASS.
- Final blocking demo defects: 0.
- Source-language regression: PASS.
- CLI packaged execution: PASS.
- MCP real invocation: PASS.
- MCPC real invocation: PASS.
- Dark mode: PASS.
- Light mode: PASS.
- Reduced motion: PASS.
- Mobile layout: PASS.
- Desktop layout: PASS.
- Reports and downloads: PASS.
- PowerPoint validation: PASS.
- Fake claims or URLs: 0.
- Console errors: 0.
- Hydration errors: 0.

## 24. Hostile final audit

Before release:

1. Inspect Git status, diff and log.
2. Search for fake progress, hard-coded counts, replay presented as live, dead
   controls, hydration failures, unsupported language claims, secret leakage,
   SSRF/path traversal gaps, placeholder URLs, disabled tests, weakened
   assertions, absolute machine paths and uncommitted generated artifacts.
3. Run `pnpm verify`.
4. Run `pnpm pack:verify`.
5. Run the genuine reset, scan, repair and proof sequence.
6. Run the official Inspector flow through the built MCP server.
7. Run `pnpm mcpc:smoke`.
8. Run `pnpm submission:prepare`.
9. Validate every report and download.
10. Render and inspect the PowerPoint.
11. Commit verified fixes.
12. Deploy and smoke-test authenticated public surfaces.

If any mandatory local requirement fails, continue repairing it.

## 25. Required final evidence

The final evidence report contains:

- Command and exit code.
- Relevant output.
- What was genuinely tested.
- Baseline and final issue counts.
- Source-locale regression result.
- Packaged CLI evidence.
- MCP Inspector evidence.
- MCPC evidence.
- Tested routes, themes and viewports.
- Changed files.
- Commit history.
- Local run instructions.
- Real deployment and repository URLs.
- Submission artifact paths.
- Honest limitations and actual organiser-submission status.

If any mandatory local requirement remains unverified, state:

`NOT COMPLETE — remaining issue: [specific issue]`
