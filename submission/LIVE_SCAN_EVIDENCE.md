# Live public scan evidence

Generated: 2026-08-03T00:09:40.879Z

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


## Hosted Chromium quick scan

The production route `POST /api/scan/browser` launches real Chromium inside
the Vercel function. It renders one public route for the selected BCP 47
locales at one selected viewport, measures the rendered DOM, runs axe and
returns real PNG screenshots in the response. Redirects and subrequests are
revalidated by the hosted SSRF policy. The response is not persisted, and the
function's 60-second ceiling is not presented as a full matrix. The production
contract is exercised with:

`BHASHAFIX_PRODUCTION_URL=https://bhashafix.vercel.app pnpm production:smoke`

Full route x locale x viewport matrices, authenticated coverage, persisted
artifacts and repository repair run through the local CLI.

## Hosted static HTTP preflight receipt

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

These two packaged screenshots show the static-preflight workspace, not the
target screenshots returned by `POST /api/scan/browser`. The production smoke
asserts that the hosted Chromium response contains two real screenshots. Full
matrices and durable evidence remain local.
