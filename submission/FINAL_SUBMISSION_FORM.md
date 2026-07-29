# BhashaFix — ready-to-paste submission copy

## Project name

BhashaFix

## One-line pitch

Test, repair and prove every language before it reaches production.

## Tagline

Every language. Every viewport. Evidence before release.

## Short description

BhashaFix is the open-source verification harness between AI-generated
translations and production software. It finds linguistic, visual,
accessibility, metadata, formatting, and locale failures; produces measured
evidence; prepares a bounded source repair; reruns the identical predicates;
and exports portable proof through the web, CLI, CI, or MCP.

## What is new

Translation tools produce and manage strings. BhashaFix tests the rendered
product after translation. Its bundled AtlasPay demonstration discovers ten
real configuration and content defects across ten locales, repairs only three
allowlisted files, reaches zero blocking failures, and passes the en-GB
source-locale regression.

## How Codex was used

Codex acted as principal engineer, localisation engineer, designer, security
reviewer, test engineer, and release owner. It implemented the shared workspace,
web UI, CLI, MCP server, deterministic engines, repair boundary, reports, tests,
documentation, screenshots, deck, and Vercel release; then ran the browser and
command gates. Deterministic tests—not a model message—accept each repair.

## Live demo

https://bhashafix.vercel.app

## Public repository

Not published at artifact-generation time. See `MANUAL_AUTH_REQUIRED.md`; add
the real GitHub URL only after authenticated publication succeeds.

## Demo video

Not recorded at artifact-generation time. Use `DEMO_SCRIPT_90_SECONDS.md`, then
add the real video URL after upload.

## Technologies

TypeScript, Next.js, React, pnpm workspaces, Playwright, axe-core, Zod, Vitest,
MCP SDK, `Intl`, YAML, Vercel, and GitHub Actions.

## Open-source licence

Apache License 2.0.

## Honest limitations

The hosted public-URL scan is bounded and does not bypass authentication,
robots policies, inaccessible APIs, or automation blocking. Automatic repair
is deliberately confined to the bundled allowlisted fixture in this MVP.
Linguistic model findings are confidence-scoped and may require human review.
Firefox/WebKit are environment-dependent. Teams, billing, remote MCP, and
enterprise isolation remain roadmap items.
