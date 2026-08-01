# Manual action required

Publication and deployment are done. One item remains, and it is the organiser's
form, which needs an authenticated human session.

## Completed without further action

| Step | State | Evidence |
| --- | --- | --- |
| Public GitHub repository | **done** | <https://github.com/vaibhav4046/bhashafix> |
| GitHub Actions release gate | **passing** | run `30693952225`, `verify-localisation` green in 6m28s on a clean `ubuntu-latest` runner |
| Vercel production deploy | **done** | <https://bhashafix.vercel.app> returns 200 and `POST /api/scan` returns a fresh scan ID |
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

## 2. Optional — enable browser-backed scanning in production

The hosted scan is HTTP-only by design: no browser is bundled into the
serverless function. To render in a real browser from production, set a
Playwright-compatible websocket endpoint in the Vercel project:

```powershell
pnpm dlx vercel@latest env add BHASHAFIX_BROWSER_WS_ENDPOINT production
pnpm dlx vercel@latest --prod
```

Until that variable exists, the hosted path reports `browserRendered: false` and
lists exactly which checks did not run. It does not pretend otherwise.

## 3. Optional — durable hosted scan history

Scan persistence is real for the CLI and local runs, backed by SQLite through
`@bhashafix/persistence`. The hosted deployment has no configured database, so
its store refuses writes rather than silently dropping records. Adding a
Postgres driver and `DATABASE_URL` would make hosted scan links shareable.
