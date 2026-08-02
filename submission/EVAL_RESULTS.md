# BhashaFix evaluation results

Generated: 2026-08-02T10:39:21.448Z

| Release gate | Result | Evidence |
| --- | --- | --- |
| Clean packed CLI and MCP install | PASS | bhashafix-cli-0.2.0.tgz, bhashafix-mcp-0.2.0.tgz |
| Global locale registry | PASS | 17 representative BCP 47 locales |
| Live public-product scan | PASS | 5 real routes, 778 visible strings, 0 blockers in checks run |
| Baseline deterministic defects | PASS | 10 |
| Final blocking defects | PASS | 0 |
| Source-locale regression | PASS | PASS |
| Browser E2E | PASS | 11 expected, 0 unexpected |
| Dark and light themes | PASS | Playwright production suite |
| Reduced motion | PASS | Playwright production suite |
| 390 x 844 and 1440 x 900 | PASS | Playwright production suite |
| Seeded-defect recall | 100.0% | 204/204 expected detections across 70 labelled defects |
| Detection precision | 100.0% | 0 unlabelled detection(s) on the broken fixture |
| Clean-fixture false positives | PASS | 0 issue(s) on the clean variant |
| MCP Inspector | PASS | 18 tools |
| MCP STDIO repair verification | PASS | 10 to 0 |
| MCPC | PASS | 18 tools |
| PPTX container and screenshots | PASS | 10 screenshots |

These are release-contract results for the bundled AtlasPay vertical slice.
The live public scan is bounded static HTTP evidence, not a browser-render or
universal translation-quality benchmark.
