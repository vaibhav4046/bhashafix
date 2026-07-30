# Live public scan evidence

Generated: 2026-07-30T14:36:30.269Z

| Field | Verified value |
| --- | --- |
| Scan ID | `web-cf3f08be-2b34-4fb9-9b2f-387fd05a29db` |
| Origin | `LIVE_PUBLIC_SCAN` |
| Target | `https://www.mozilla.org/en-US/` |
| Real routes checked | 5 |
| Visible strings extracted | 778 |
| Blocking findings in checks run | 0 |
| Browser rendering | Not run in hosted static mode |

## Discovered responses

- `/en-US/` — HTTP 200; 219 strings
- `/en-US/privacy/websites/cookie-settings/` — HTTP 200; 143 strings
- `/en-US/products/` — HTTP 200; 166 strings
- `/en-US/products/vpn/` — HTTP 200; 172 strings
- `/en-US/products/monitor/` — HTTP 200; 78 strings

## Production verification

| Field | Verified value |
| --- | --- |
| Production URL | `https://bhashafix.vercel.app` |
| Immutable deployment | `https://bhashafix-qgytrihbx-vaibhav4046s-projects.vercel.app` |
| Vercel deployment ID | `dpl_AfpuC65KPEjL5g7FUPiWCLkCN9Fw` |
| Production scan ID | `web-e5972aa9-f17a-4bcf-b61a-9dae1d68d4ee` |
| Target | `https://www.mozilla.org/` |
| Origin | `LIVE_PUBLIC_SCAN` |
| Real routes checked | 5 |
| Visible strings extracted | 778 |
| Blocking findings in checks run | 0 |
| Saved-scan persistence | PASS |
| Browser-console errors | 0 |
| Desktop viewport overflow | 0 at 1440 × 900 |
| Mobile viewport overflow | 0; exact 390 × 844 covered by Playwright |

The production result remained labelled `LIVE_PUBLIC_SCAN`. The AtlasPay
demonstration remained separately labelled
`RECORDED_REPLAY · GENUINE ARTIFACTS`, so replay evidence cannot be mistaken for
a live public-site scan.

## Actual screenshots

- `submission/screenshots/09-live-public-product.png`
- `submission/screenshots/10-live-public-product-proof.png`

These screenshots show the BhashaFix result workspace, not screenshots of the
target website. The Vercel-hosted scanner performs bounded static HTTP
inspection; full target rendering and axe execution require the local CLI or a
browser-capable worker.
