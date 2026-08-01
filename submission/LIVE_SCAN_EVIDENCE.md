# Live public scan evidence

Generated: 2026-08-01T09:27:06.811Z

## Browser-backed scans of real public sites

Origin `LOCAL_REPOSITORY_SCAN` — real Chromium renders, real screenshots, persisted scan IDs.

| Target | Scan ID | Routes | Locales | Renders | Screenshots | Issues |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BhashaFix production | `browser-bce30786-6142-49c0-910a-e9d9098e41ff` | 3 | 2 | 6 | 6 | 10 |
| MDN Web Docs | `browser-511d535a-8dd5-4614-884c-6efbfe3fd6b6` | 3 | 2 | 6 | 6 | 9 |
| Wikipedia | `browser-8182aab1-c3a2-4296-8380-c9b22aab4a3a` | 2 | 2 | 4 | 4 | 16 |

- These targets carry no ground-truth labels, so no precision or recall figure is derived from them.
- Coverage is deliberately bounded: a handful of routes per site at one viewport.
- Only publicly reachable pages were requested; no authentication or access control was bypassed.


## Hosted HTTP preflight receipt

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
