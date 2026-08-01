# Live public scan evidence

Generated: 2026-08-01T21:34:54.481Z

## Browser-backed scans of real public sites

Origin `LOCAL_REPOSITORY_SCAN` — real Chromium renders, real screenshots, persisted scan IDs.

| Target | Scan ID | Routes | Locales | Renders | Screenshots | Issues |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| BhashaFix production | `browser-3f4cdf97-6c5c-4f84-b083-ea310ceee8a9` | 8 | 1 | 16 | 16 | 0 |
| MDN Web Docs | `browser-d1b79fb2-1891-4e55-83fc-8df1cafd79d2` | 3 | 2 | 6 | 6 | 9 |
| Wikipedia | `browser-707f6817-0e68-4236-a5e8-7e97b530a4f0` | 2 | 2 | 4 | 4 | 16 |

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
