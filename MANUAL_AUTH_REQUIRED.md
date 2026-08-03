# Manual action required

Publication and deployment are done. One item remains, and it is the organiser's
form, which needs an authenticated human session.

## Completed without further action

| Step | State | Evidence |
| --- | --- | --- |
| Public GitHub repository | **done** | <https://github.com/vaibhav4046/bhashafix> |
| GitHub Actions release gate | **passing** | run `30693952225`, `verify-localisation` green in 6m28s on a clean `ubuntu-latest` runner |
| Vercel production deploy | **done** | <https://bhashafix.vercel.app> returns 200; `POST /api/scan/browser` runs bounded real Chromium and `POST /api/scan` runs the separate static preflight |
| Local release chain | **passing** | `pnpm verify` exits 0 across all 24 steps |

## 1. Submit to the organiser

Sign in to the hackathon dashboard, then:

- Copy the final text from `submission/FINAL_SUBMISSION_FORM.md`.
- Upload `submission/BhashaFix-Hackathon-Deck.pptx`.
- Repository URL: `https://github.com/vaibhav4046/bhashafix`
- Live URL: `https://bhashafix.vercel.app`
- Confirm the exact deadline and timezone in the dashboard before submitting.

Record confirmation only after the organiser accepts it. Nothing in this
repository claims the submission has happened.

## 2. No manual action — hosted browser scope

The deployed quick scan already launches real Chromium inside the Vercel
function. It is deliberately bounded to one public route, up to three locales
and one viewport, returns screenshots and measured evidence in the response,
and stores nothing server-side. No websocket endpoint or model key is required
for that path.

Full route x locale x viewport matrices, authenticated coverage, persisted
artifacts and source repair remain local CLI responsibilities. A dedicated
worker is an optional future scaling path, not a prerequisite for the shipped
hosted quick scan.

## 3. Optional — durable hosted scan history

Scan persistence is real for the CLI and local runs, backed by SQLite through
`@bhashafix/persistence`. The hosted deployment has no configured database, so
its store refuses writes rather than silently dropping records. Adding a
Postgres driver and `DATABASE_URL` would make hosted scan links shareable.
