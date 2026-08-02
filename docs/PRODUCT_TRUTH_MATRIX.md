# BhashaFix product truth matrix

Re-audited 2026-07-31 from commit `a75aa1f` by independent read-only passes plus
live execution. Every row cites the code or the command output that proves it.
Where a previous entry in this file was contradicted by the code, the correction
is stated explicitly.

Vocabulary: **VERIFIED** (real work, real IO) · **PARTIAL** · **FIXTURE_ONLY**
(returns pre-baked data) · **REPLAY_ONLY** (renders a recorded run) ·
**DOCUMENTED_ONLY** · **BROKEN** · **NOT_IMPLEMENTED**.

## Headline

The hosted HTTP scan, the SSRF policy, the locale engine, the pseudo-localiser,
the repair write/rollback mechanism and the report writers were real and
honestly labelled. The central product promise — *renders every locale in a real
browser* — was **not implemented anywhere**: no package launched a browser, and
the "local Playwright tier" the UI and CLI pointed users to did not exist. That
is the gap this release closes.

## Scan engine

| Capability | Was | Now | Evidence |
| --- | --- | --- | --- |
| Hosted HTTP scan (`POST /api/scan`) | VERIFIED | VERIFIED | `packages/crawler/src/hosted-scan.ts:496`. Live POST returned 3 real routes, 99 strings, honest `notRun[]` |
| URL / SSRF / DNS / redirect policy | VERIFIED | VERIFIED | `packages/crawler/src/policy.ts:43-74` |
| robots.txt handling | VERIFIED | VERIFIED | `hosted-scan.ts:179-224` |
| Locale intelligence (BCP 47, script, direction, plurals) | VERIFIED | VERIFIED | `packages/locale-engine/src/index.ts:46-98`, real `Intl` |
| Pseudo-localisation with token protection | VERIFIED | VERIFIED | `packages/linguistic-engine/src/index.ts:22-37,142-186` |
| **Browser rendering** | **NOT_IMPLEMENTED** — *this file previously said "shared browser engines exist"; they did not* | **VERIFIED** | zero `chromium.launch` existed in `packages/**`. Now `packages/browser/src/index.ts` |
| **Rendered DOM measurement** | **NOT_IMPLEMENTED** (dead code) | **VERIFIED** | `detectElementOverflow` (`packages/visual-engine/src/index.ts:113`) had only test callers; now fed by `packages/browser/src/measure.ts` |
| **Per-issue screenshots** | **NOT_IMPLEMENTED** | **VERIFIED** | was `packages/core/src/index.ts:102` emitting `/evidence/<id>.png` for a directory that does not exist. Now real PNGs per render |
| **axe accessibility in the engine** | NOT_IMPLEMENTED | VERIFIED | `packages/browser/src/index.ts` `runAxe()`; previously axe ran only in the product's own E2E suite |
| Route discovery | FIXTURE_ONLY | VERIFIED | was 5 hardcoded strings at `packages/core/src/index.ts:140`; now `discoverRoutes()` reads same-origin links from the rendered DOM |
| CLI scan of an arbitrary project (`--project`) | FIXTURE_ONLY | FIXTURE_ONLY | `packages/core/src/index.ts:23-28` reads 4 fixture JSON files; verified ENOENT on any other project |
| Extractor selectors | PARTIAL | PARTIAL | `packages/extractor/src/index.ts:47-56` uses a match counter for `nth-of-type`; those selectors do not resolve against a real DOM |
| ICU validation, translation memory | NOT_IMPLEMENTED (unwired) | NOT_IMPLEMENTED | exported from `linguistic-engine` with zero production callers |
| Model providers | NOT_IMPLEMENTED (honest stub) | NOT_IMPLEMENTED | `packages/providers/src/index.ts:42-73`, every method throws |

## Repair and verification

| Capability | Was | Now | Evidence |
| --- | --- | --- | --- |
| Repair write, rollback, audit log | VERIFIED | VERIFIED | `packages/repair-engine/src/index.ts:122-185`; real rollback directories and `audit.log` on disk |
| Path safety (allowlist, confinement, symlink) | VERIFIED | VERIFIED | `repair-engine/src/index.ts:23-51` |
| Source codemod | NOT_IMPLEMENTED | NOT_IMPLEMENTED | JSON-pointer assignment only (`:62-72`). No AST, no CSS, no `.tsx`/`.ts` file can be touched |
| Unified diff | **BROKEN** — *previously listed VERIFIED* | see release notes | `:74-87` emitted `@@ hi-IN.heroLineHeight @@`, which `git apply` and `patch` reject |
| Identical-predicate re-run | PARTIAL | PARTIAL | genuinely re-evaluates (`packages/verifier/src/index.ts:12`), but each predicate's pass value and its repair's `after` value are the same literal, so it cannot fail |
| `consoleErrorDelta`, `accessibilityRegression`, `diffWithinPolicy` | **FIXTURE_ONLY** | see release notes | `verifier/src/index.ts:42-43,49` hardcoded `0`, `false`, `true` |

## Surfaces

| Capability | Was | Now | Evidence |
| --- | --- | --- | --- |
| CLI — 15 of 16 commands do real work | VERIFIED | VERIFIED | dispatch table `packages/cli/src/cli.ts` |
| CLI — `scan --url` real browser scan | did not exist | **VERIFIED** | `packages/cli/src/browser-scan.ts`; live output below |
| CLI — `doctor` browser probe | claimed nothing | **VERIFIED** | launches and closes a real browser, reports engine and local/remote |
| CLI — `translate` | NOT_IMPLEMENTED | NOT_IMPLEMENTED | prints a message and exits 5 |
| CLI — `--verbose` | dead flag | wired to render progress | was parsed at `cli.ts:101` and never read |
| CLI — `--no-ai`, `--changed-only` | dead flags | still dead | parsed at `cli.ts:103-104`, never read. The CI workflow passes `--no-ai`, which no-ops |
| CLI standalone install outside the monorepo | VERIFIED | VERIFIED | `scripts/pack-verify.ts` genuinely packs, installs to a temp dir and executes the resolved entry |
| **CLI `mcp` subcommand** | **BROKEN** | **VERIFIED** | bundling inlined the MCP module's import-time `argv[1]` guard, so a second server started on the same pipe: every JSON-RPC id was answered twice and `apply_repair` executed twice, producing two scan-request files from one call. Fixed by moving the executable entrypoint to `packages/mcp/src/bin.ts`. Regression test: `tests/mcp/stdio-subprocess.test.ts` |
| MCP server — 18 tools over STDIO | VERIFIED | VERIFIED | `packages/mcp/src/server.ts` |
| MCP — remote HTTP transport | NOT_IMPLEMENTED | NOT_IMPLEMENTED | STDIO only |
| MCP — `suggest/generate_translation` | NOT_IMPLEMENTED (honest stub) | unchanged | `server.ts:325-354` |
| MCP test coverage | PARTIAL — in-process only | VERIFIED | `tests/mcp/mcp.test.ts:48` uses `InMemoryTransport`, which is why the double-start defect survived. A real subprocess test now exists |
| Web — hosted scan flow | VERIFIED | VERIFIED | `app/api/scan/route.ts:68` |
| Web — scan persistence | browser `localStorage` only | unchanged | `app/product.tsx:597,625`. Nothing is persisted server-side; the HTTP response is the only copy, so a `/scan/<id>` link is not shareable across browsers or devices |
| Web — hosted rate limit and concurrency cap | PARTIAL | PARTIAL | `app/api/scan/route.ts:18-19` is per-lambda module state; it resets on cold start and is not shared across instances |
| Web — AtlasPay 10 → 0 | REPLAY_ONLY | REPLAY_ONLY | a genuine evaluation of a seeded JSON fixture, correctly labelled `RECORDED_REPLAY`. `browser: "deterministic"`, not chromium |
| GitHub Actions release gate | **BROKEN** — *previously listed PARTIAL* | see release notes | fails deterministically on a clean runner: `scripts/prepare-submission.ts:48` reads a gitignored artifact that `verify` never produces, and `scripts/platform-demo.ts:169` leaves the fixture in its broken state so `bhashafix ci --fail-on blocking` exits 1 |
| GitHub repository publication | DOCUMENTED_ONLY | DOCUMENTED_ONLY | no GitHub remote is configured; the only remote is the Codex sandbox git |

## Fabricated evidence found

Each item asserted a measurement that never happened.

| Location | Claim | Reality |
| --- | --- | --- |
| `packages/core/src/index.ts:102` | `screenshotBefore: /evidence/<id>.png` | `public/evidence/` does not exist; all 10 replay issues carry dangling paths |
| `packages/core/src/index.ts:110` | the scan took 137 ms | `completedAt = startedAt + 137`, a constant |
| `packages/core/src/index.ts:125` | `browsers: ["chromium"]` | no browser was involved |
| `apps/demo-target/data/layout.json:7-8` | `ctaClientWidth: 160`, `ctaScrollWidth: 212` | hand-typed constants driving a rule named `cta-overflow`, reported with `confidence: "verified"` |
| `packages/verifier/src/index.ts:42-43,49` | console-error delta, a11y regression, diff policy | hardcoded `0` / `false` / `true` |
| `scripts/release-receipt.ts:57-84` | 13 commands `"PASS"`, `consoleErrors: 0`, `hydrationErrors: 0` | nothing in the pipeline measures them |
| `scripts/hostile-audit.ts:37,156-162` | finding counters `0` | hardcoded; the auditor also exempted itself from its own rules, including the secret scan |
| `scripts/validate-pptx.ts:65-75` | `inheritedTemplate: true`, `artifactToolInspection: "PASS"` | correspond to no check |
| `scripts/pack-verify.ts:231-240` | `cliHelp/cliDoctor: "PASS"`, `workspaceRuntimeDependencies: 0` | emitted regardless of outcome |
| `app/product.tsx:1887-1911` | console timeline `13:07:12.044 render Chromium · 390×844 · ar-SA` | invented timestamps; no such render occurred |
| `app/product.tsx:1971-1975` | "Serious axe findings 0 PASS" | axe never ran for that data |
| `app/product.tsx:2124-2129` | "Viewport overflow 0px PASS" | rendered beside two iframes that are never measured |
| `app/product.tsx:1041,1062` | viewport / browser / axe / stress controls in `/scan/new` | `defaultChecked` only; no state, never sent, and the API schema is `.strict()` and would reject them |
| `public/replay/screenshots.zip`, `submission/screenshots/` | 8 `.png` files | JPEG magic bytes `ffd8ffe0` |
| `tests/e2e/product.spec.ts:85-200` | "real public scan UI shows exact routes, evidence and honest coverage" | the test intercepts `/api/scan` and asserts on the body it injected; the scanner never runs |

## Live proof of the new engine

Real run against the deployed product, 2026-07-31:

```
$ bhashafix scan --url https://bhashafix.vercel.app --locales en-GB,ar-SA \
    --routes "/,/docs" --viewports mobile --verbose
· Rendering 2 route(s) × 2 locale(s) × 1 viewport(s)
· / · en-GB · mobile → 2 issue(s)
· / · ar-SA · mobile → 4 issue(s)
· /docs · en-GB · mobile → 0 issue(s)
· /docs · ar-SA · mobile → 2 issue(s)
browser-1565b68b-9619-4b51-b8e2-64da2bda6fc5
4 browser render(s) on chromium.
8 measured issue(s) across 2 route(s) and 2 locale(s).
4 screenshot(s) in .bhashafix/scans/browser-1565b68b-9619-4b51-b8e2-64da2bda6fc5
```

The findings are real defects in BhashaFix's own deployed site:

```
BF-LOC-LANG-MISMATCH   [blocking] ar-SA /      html   requested ar-SA, declares en
BF-LOC-DIR-MISSING     [blocking] ar-SA /      html   direction is "ltr"
BF-VIS-TEXT-OVERFLOW-X [blocking] en-GB / …code  "atlaspay.local / checkout / es-MX" is 88px wider than its box
BF-VIS-TEXT-OVERFLOW-X [blocking] en-GB / …code  "bhashafix verify --changed-only" is 15px wider than its box
```

Artifacts written: 4 PNG screenshots (182–357 KB, verified magic `89504e47`),
4 DOM snapshots, `scan.json` and `renders.json`.

## Second pass — verified 2026-08-01

| Capability | Was | Now | Evidence |
| --- | --- | --- | --- |
| Scan persistence | browser `localStorage` only | **VERIFIED for CLI and local runs** | `packages/persistence` with `node:sqlite`. A scan written by one process is read back by another: `bhashafix scans --scan browser-4064c9a4…` returned 8 issues, 8 artifacts, 6 events |
| Artifact ledger | none | VERIFIED | every screenshot and DOM snapshot recorded with byte length and SHA-256 |
| Real-site operability | claimed, unproven | **VERIFIED** | `pnpm scan:real-sites` — 3 targets, 16 renders, 35 issues, receipt in `artifacts/real-site-scans.json` |
| Overflow rule precision on real sites | **BROKEN** | VERIFIED | the 1px visually-hidden pattern produced 64 false positives on en.wikipedia.org; now guarded, findings fell 92 → 16 |
| Accessible-name computation | PARTIAL | VERIFIED | icon-only controls took their name from a descendant `img[alt]` / `svg > title`; previously every one looked unnamed |
| Web scan persistence | localStorage | **unchanged** | the hosted deployment still has no configured database; `UnavailableScanStore` refuses writes rather than pretending |

Cross-corroboration on Wikipedia after the fix: the engine's 4
`BF-A11Y-IMG-ALT-MISSING` and 4 `BF-A11Y-NAME-MISSING` findings sit alongside
axe independently reporting `image-alt` and `link-name` on the same pages. Two
independent implementations agreeing is the strongest available signal that
these are real defects rather than rule artefacts.

## Cross-engine verification — 2026-08-01

`--browsers` was not wired: `browser-scan.ts` never passed an engine and the CLI
had no flag, so Firefox and WebKit were unreachable from every user surface
despite being listed as selectable. The flag is now wired through, one engine per
scan, because a scan record names the browser that rendered it.

Three scans of `https://bhashafix.vercel.app/`, identical config
(`en-GB,ar-SA`, route `/`, mobile):

| Engine | Scan ID | Issues |
| --- | --- | ---: |
| chromium | `browser-3a3a2a8c-49f9-4c52-8731-6f3cd229ff75` | 2 |
| firefox | `browser-877884cd-580a-4298-ae30-775cf3439e0f` | 4 |
| webkit | `browser-c5b1e124-73db-4072-ac62-afb3a9a6217a` | 2 |

**All three engines agree on the deterministic rules** — `BF-LOC-LANG-MISMATCH`
and `BF-LOC-DIR-MISSING` for `ar-SA`, identical in each. Firefox additionally
reports `BF-A11Y-AXE-SCROLLABLE-REGION-FOCUSABLE` on both locales, because that
axe check depends on computed scroll state, which Gecko resolves differently.

So: the measured, predicate-backed findings are engine-independent here;
axe-derived findings are not, and a cross-browser run will legitimately differ in
that category. Firefox and WebKit are now verified rather than merely listed.

## Known limitations, stated plainly

- The hosted Vercel scan remains HTTP-only. Browser rendering requires the local
  CLI, or a remote endpoint supplied through `BHASHAFIX_BROWSER_WS_ENDPOINT`.
  No browser is bundled into the serverless function.
- Durable scan persistence covers the CLI and local runs. The hosted deployment
  has no configured database, so its scan history is still per browser and the
  store refuses to claim otherwise.
- Repair still only rewrites allowlisted JSON. It cannot repair `.tsx` or CSS.


## Hosted browser rendering — VERIFIED, 2026-08-02

`POST /api/scan/browser` renders in real Chromium **inside the Vercel
function**, via `@sparticuz/chromium` driven by `puppeteer-core`. The
measurement and the rules are the CLI's; only the driver differs.

Live against the deployed product, `en-GB` and `ar-SA` at 390x844:

```
scanId  hosted-44c8db95-6699-4265-9c22-461f0abd09e6
origin  LIVE_PUBLIC_BROWSER_SCAN   browserRendered true   axeExecuted true
renders 2    issues 2    blocking 2
  en-GB  HTTP 200  121 elements  axe 0  70122-byte screenshot  1551ms
  ar-SA  HTTP 200  121 elements  axe 0  70122-byte screenshot   660ms
  BF-LOC-LANG-MISMATCH ar-SA  declaredLang "en", expected "ar"
  BF-LOC-DIR-MISSING   ar-SA  declaredDir "ltr", expected "rtl", script Arab
```

Two bundler problems had to be solved, and both were the same mistake in
different clothes: **code that runs inside the page must arrive as source, not
as a bundled closure.**

1. `collectPageMeasurement` was serialised by the driver. Next minified it and
   the body then referenced module scope the browser realm has not got —
   `t is not defined`. It is now compiled once to a standalone string by
   `scripts/build-measurement-script.ts`, from `measure.ts` as the single
   source of truth, with `tests/unit/measurement-script.test.ts` failing if the
   two drift. The axe runner was converted the same way.
2. `axe-core` was being bundled, which mangled its `.source` string. It is now
   listed in `serverExternalPackages` alongside `puppeteer-core` and
   `@sparticuz/chromium`, and `outputFileTracingIncludes` names the Chromium
   `bin/` directory so the pack the function launches actually ships.

Scope is bounded on purpose: one route, up to three locales, one viewport,
single-flight per instance, because the function has a 60 second ceiling.
Nothing is persisted — this deployment has no database and the response says
so. A full route x locale x viewport matrix with persisted artifacts and source
repair remains the CLI's job.

