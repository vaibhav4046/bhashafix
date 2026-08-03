# BhashaFix — ready-to-paste submission copy

Every claim below is backed by a receipt in this repository or by the live
deployment. Nothing is aspirational.

## Project name

BhashaFix

## One-line pitch

A local-first localisation release firewall: it opens real browsers, measures
what breaks in every locale, repairs the source, and reruns the same
predicates to prove the release is safe.

## Tagline

AI generates every language. BhashaFix proves the product still works.

## Short description

AI can translate every string in minutes, but clipped text, broken RTL, raw
translation keys, dropped placeholders and inaccessible controls only appear
when the translated string meets the real layout in a real browser. BhashaFix
is that release gate. It renders each selected locale in Chromium, Firefox or
WebKit, measures the DOM, runs axe-core, explains every finding with the
number that produced it and the predicate it failed, prepares a bounded source
repair, reruns the identical checks, and exports portable proof — through the
web, CLI, CI, or MCP for coding agents.

## What is new

Translation platforms manage text. Coding agents modify code. Browser testing
tools test interfaces. No one owns the localisation-specific release gate that
connects the three. BhashaFix's differentiator is verification a model cannot
talk its way past: after a repair, the same deterministic browser predicates
rerun on the rebuilt project. Measured on the bundled Next.js fixture: 6
blocking issues before, 0 after, source locale unchanged, 0 new blockers, and
a patch `git apply --check` accepts. Accuracy is scored against ground truth,
not asserted: 70 labelled defects across 12 rule families and 12 locales,
288 real browser renders — recall 100%, precision 100%, zero false positives
on the clean variant.

## How Codex was used

Codex built the product baseline: the pnpm workspace, web UI, CLI, MCP server,
deterministic engines, repair boundary, reports, tests and first Vercel release.
Claude Code then performed a substantial independent adversarial audit and
browser-engine hardening pass. Codex resumed as final integration and release
owner: it reviewed and preserved that work, hardened hosted Chromium and its
network boundary, reconciled the product and submission claims, ran the full
quality contract, and completed production deployment and smoke testing. The
full attribution is in `submission/AI_TOOLING_DISCLOSURE.md`; no history was
rewritten or re-attributed.

## Live demo

https://bhashafix.vercel.app

Paste any public URL into "Try it on a real site" and press Render and
measure. Chromium starts inside the serverless function, renders the page in
English plus a locale you pick at 390×844, measures the DOM, runs axe, and
returns two real screenshots with the findings underneath — each finding
carrying its measurement and the predicate it failed. Measured cold-start on
real sites: MDN 9.6s, Wikipedia 4.0s, vercel.com 4.8s. The panel states its
bounds: one route, up to three locales, one viewport, nothing persisted; the
full route × locale × viewport matrix, authenticated coverage, durable
artifacts and repair are the local CLI's job. The site also hosts evidence from
three CLI scans (16 screenshots, each with its SHA-256), the recorded AtlasPay
10→0 repair proof, a report-import console, and the fixture-scoped MCP call log.

## Public repository

https://github.com/vaibhav4046/bhashafix

Public, Apache-2.0, GitHub Actions green: the CI gate runs the full verify
chain — lint, typecheck, five test suites, the ground-truth benchmark, the
Next.js repair proof, packaged-CLI install outside the repo, external MCP
invocation, browser E2E — on every push.

## Demo video

Not recorded at artifact-generation time. Use `DEMO_SCRIPT_90_SECONDS.md`
(every figure in it is from a receipt), then add the real video URL after
upload.

## Technologies

TypeScript, Next.js, React, pnpm workspaces, Playwright, puppeteer-core +
@sparticuz/chromium (serverless rendering), axe-core, Zod, Vitest, MCP SDK,
`Intl`, SQLite (`node:sqlite`), Vercel, GitHub Actions.

## Open-source licence

Apache License 2.0.

## Honest limitations

The hosted browser scan is bounded — one route, up to three locales, one
viewport, nothing persisted server-side — because the function has a 60-second
ceiling; the CLI runs the full matrix with persisted artifacts. Verified
repair covers locale JSON, `lang`/`dir` metadata and bounded layout fixes in
the supported Next.js fixture; broader TSX/CSS repair and other frameworks are
experimental. Real-site scans prove operability, not precision — those targets
carry no ground-truth labels. Linguistic model review is deterministic-only in
this build (no provider configured). All three engines are verified on
identical config; only Chromium has run the full 288-render benchmark. Teams,
billing, remote MCP transport and enterprise isolation are roadmap.

The MCP 10→0 repair receipt is also AtlasPay-fixture evidence. MCP transport,
schemas, inspection and guarded mutation are verified independently, but this
release does not claim arbitrary-project MCP source repair.
