# BhashaFix product truth matrix

Classification is intentionally limited to the contract vocabulary:
`VERIFIED`, `PARTIAL`, `FIXTURE_ONLY`, `DOCUMENTED_ONLY`, `BROKEN` and
`NOT_IMPLEMENTED`.

| Advertised capability | Status | Execution evidence | Truth boundary / required work |
| --- | --- | --- | --- |
| AtlasPay deterministic baseline scan | VERIFIED | Ten stable predicates detected by `demo:scan` | Bundled target only |
| AtlasPay bounded repair | VERIFIED | Unified diff, three allowlisted files, rollback and audit record | Never implies mutation of a public website |
| AtlasPay identical verification | VERIFIED | 10 blocking to 0; `en-GB` regression PASS | Recorded proof must retain `GUIDED_DEMO`/`RECORDED_REPLAY` origin |
| Public URL crawl | VERIFIED | Real same-origin HTTP routes, robots handling and limits | Static HTML only in hosted mode |
| Rendered public URL diagnosis | NOT_IMPLEMENTED | No hosted Playwright worker | UI must state that browser, screenshots and axe require local/worker execution |
| Public URL static deterministic checks | VERIFIED | Mozilla scan created a new ID, fetched five routes, extracted 778 strings and produced scan-specific issues/reports | The UI labels the exact bounded checks that ran |
| Local repository discovery | VERIFIED | Framework/config/route inspection tests | Unknown scripts are never run silently |
| Arbitrary local repository browser scan | PARTIAL | Shared browser engines exist | End-to-end acceptance is fixture-led |
| Bounded source repair | FIXTURE_ONLY | AtlasPay repair proof | Generic repair policy exists; broad framework repair is not claimed |
| Shared origin taxonomy | VERIFIED | Shared Zod schemas and exports use the five locked origin values | Origins are visible in live, local, guided, replay and synthetic surfaces |
| BCP 47 locale intelligence | VERIFIED | `Intl.Locale`, plural, number/date and direction tests | No native-quality guarantee |
| Deterministic linguistic checks | VERIFIED | Placeholder, ICU, glossary, raw-key and protected-token tests | Exact implemented rules only |
| Model-assisted linguistic review | PARTIAL | Provider-independent adapter and truthful unavailable state | No live provider configured in release |
| Synthetic localisation preview | VERIFIED | Protected-token pseudo-localisation in sandboxed frame | Not a scan or human translation |
| Playwright browser evidence | FIXTURE_ONLY | Chromium screenshots, axe, console and viewport E2E | Firefox/WebKit depend on installed runtimes |
| User scan persistence | VERIFIED | Browser E2E creates a public scan, navigates away, reloads and reopens the same record | Browser-local MVP persistence, not multi-user cloud storage |
| Scan routes and workspace | VERIFIED | All 23 locked routes build; live overview/routes/issues/linguistic/visual/accessibility/report views reopen scan-specific data | Hosted static mode has no fabricated browser frame |
| Glossary management | VERIFIED | Add, edit, delete, search, locale filtering, import/export and reload persistence pass browser tests | Browser-local project data |
| Translation-memory management | VERIFIED | Search, filter, approval, delete, import/export and reload persistence pass browser tests | Browser-local project data |
| Per-scan report exports | VERIFIED | Live JSON/HTML/CSV/SARIF/JUnit exports use the selected scan; replay adds real screenshot ZIP, patch and repair proof | Unavailable artifacts are labelled rather than fabricated |
| Packaged CLI | VERIFIED | Fresh tarball install outside the monorepo runs help, doctor, locales and a fixture scan/repair/rescan | Local browser capabilities depend on installed Chromium |
| CLI exit codes | VERIFIED | CLI tests cover pass/blocking/config/runtime behavior | Provider exit 5 requires configured provider path |
| STDIO MCP server | VERIFIED | Inspector tools/list, STDIO and MCPC invocation pass | Local transport only |
| Full locked MCP execution evidence | VERIFIED | External STDIO client saved inspect, create/run scan, issue list, report, dry-run, apply and verification outputs | Remote HTTP transport is roadmap |
| GitHub Actions release gate | PARTIAL | Workflow installs Chromium and runs verification | Job summary embeds fixture counts; no authenticated remote run |
| Dark and light themes | VERIFIED | Browser E2E at desktop and mobile | Persisted per browser |
| Reduced motion | VERIFIED | Browser E2E and motion lab verify reduced movement, no pointer interception and no hydration errors | OS preference controls the result |
| Brand SVG system | VERIFIED | Symbol, wordmark, dark/light lockups and favicon are present and used | Original project-owned assets |
| Vercel production deployment | VERIFIED | `https://bhashafix.vercel.app` opened and smoke-tested | Hosted browser worker not claimed |
| GitHub repository publication | DOCUMENTED_ONLY | `MANUAL_AUTH_REQUIRED.md` | User explicitly skipped authentication/push |
| Hackathon submission package | VERIFIED | Screenshot-backed PPTX, release manifest, live/CLI/MCP evidence, real patch and proof all validate | No GitHub URL is invented |
