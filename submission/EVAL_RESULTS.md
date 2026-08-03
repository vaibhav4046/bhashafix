# BhashaFix evaluation results

Generated: 2026-08-03T00:10:39.457Z

| Release gate | Result | Evidence |
| --- | --- | --- |
| Clean packed CLI and MCP install | PASS | bhashafix-cli-0.2.0.tgz, bhashafix-mcp-0.2.0.tgz |
| Global locale registry | PASS | 17 representative BCP 47 locales |
| Hosted Chromium quick-scan contract | BOUNDED | `POST /api/scan/browser`: one route, bounded locales, one viewport, real PNG screenshots, DOM measurement and axe; verify deployment with `pnpm production:smoke` |
| Hosted static HTTP preflight | PASS | 5 real routes, 778 visible strings, 0 blockers in checks run |
| Baseline deterministic defects | PASS | 10 |
| Final blocking defects | PASS | 0 |
| Source-locale regression | PASS | PASS |
| Browser E2E | PASS | 12 expected, 0 unexpected |
| Dark and light themes | PASS | Playwright production suite |
| Reduced motion | PASS | Playwright production suite |
| 390 x 844 and 1440 x 900 | PASS | Playwright production suite |
| Seeded-defect recall | 100.0% | 204/204 expected detections across 70 labelled defects |
| Detection precision | 100.0% | 0 unlabelled detection(s) on the broken fixture |
| Clean-fixture false positives | PASS | 0 issue(s) on the clean variant |
| MCP Inspector | PASS | 18 tools |
| MCP STDIO AtlasPay fixture repair verification | PASS | 10 to 0 |
| MCPC | PASS | 18 tools |
| PPTX container and screenshots | PASS | 10 screenshots |

The repair counts are release-contract results for the bundled AtlasPay
vertical slice. The hosted product also runs a bounded real-Chromium quick
scan; full route x locale x viewport matrices, persisted artifacts and source
repair remain local. The separate HTTP preflight receipt is static evidence,
not browser evidence or a universal translation-quality benchmark.
