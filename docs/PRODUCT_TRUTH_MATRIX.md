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

## Known limitations, stated plainly

- The hosted Vercel scan remains HTTP-only. Browser rendering requires the local
  CLI, or a remote endpoint supplied through `BHASHAFIX_BROWSER_WS_ENDPOINT`.
  No browser is bundled into the serverless function.
- There is no server-side scan store. Web scan history is per browser.
- Repair still only rewrites allowlisted JSON. It cannot repair `.tsx` or CSS.
- Firefox and WebKit are selectable in the engine but only Chromium has been
  exercised in this environment.
