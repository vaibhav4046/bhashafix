# Live public scan evidence

Generated: 2026-07-30T14:28:16.424Z

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

## Actual screenshots

- `submission/screenshots/09-live-public-product.png`
- `submission/screenshots/10-live-public-product-proof.png`

These screenshots show the BhashaFix result workspace, not screenshots of the
target website. The Vercel-hosted scanner performs bounded static HTTP
inspection; full target rendering and axe execution require the local CLI or a
browser-capable worker.
