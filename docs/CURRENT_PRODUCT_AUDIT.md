# BhashaFix current product audit

Audit date: 2026-07-30  
Baseline commit: `5e8cd36`  
Production URL: `https://bhashafix.vercel.app`

## Executive finding

The existing release is a credible, polished localisation verification demo with
a working bounded public-URL inspector, a real AtlasPay 10-to-0 repair proof,
shared TypeScript packages, a packaged CLI, a standards-compliant STDIO MCP
server, reports, tests and a verified Vercel deployment.

It does not yet satisfy the winner-grade contract. The hosted URL path performs
bounded static HTTP inspection, not Playwright rendering or axe analysis.
Several required route aliases do not exist. User-created scan history,
glossary and translation-memory edits are not fully persisted. The exported
replay reports do not yet carry one of the locked origin identifiers.

## Evidence collected before modification

- `git status --short`: clean.
- Baseline production verification at `5e8cd36`: `pnpm verify` exited `0`.
- Baseline suite: 19 unit tests, integration, CLI, MCP, build, pack verification,
  MCP Inspector/STDIO/MCPC, 8 browser E2E tests and AtlasPay identical-test
  verification all passed.
- AtlasPay proof: 10 baseline blocking predicates, 0 final blocking predicates,
  source locale `en-GB` regression `PASS`.
- Hosted public scan previously exercised against `https://www.mozilla.org`:
  5 actual routes, 778 extracted visible strings, robots policy read, 0
  blockers in the static checks that ran.
- Production deployment was opened and smoke-tested at
  `https://bhashafix.vercel.app`.

## Route audit

The production build was started locally and each locked primary route was
requested. The table records the unmodified baseline.

| Route | Baseline | Finding |
| --- | --- | --- |
| `/` | 200 | Working landing page and real URL form |
| `/scan` | 200 | Replay row only; no persisted user history |
| `/scan/new` | 200 | Public HTTP scan works; local mode is guidance |
| `/scan/[scanId]` | 200 | AtlasPay replay workspace |
| `/scan/[scanId]/overview` | 404 | Missing alias |
| `/scan/[scanId]/routes` | 404 | Missing |
| `/scan/[scanId]/issues` | 200 | Working replay issue explorer |
| `/scan/[scanId]/linguistic` | 200 | Working replay view |
| `/scan/[scanId]/visual` | 200 | Working replay comparison |
| `/scan/[scanId]/accessibility` | 404 | Missing |
| `/scan/[scanId]/report` | 200 | Working replay downloads |
| `/demo` | 404 | Missing |
| `/demo/atlaspay` | 404 | Missing |
| `/demo/atlaspay/report` | 404 | Missing |
| `/glossary` | 200 | Add works in memory only |
| `/memory` | 200 | Search works; import/export/persistence missing |
| `/integrations` | 200 | Working overview |
| `/integrations/cli` | 404 | Missing |
| `/integrations/mcp` | 404 | Missing |
| `/integrations/ci` | 404 | Missing |
| `/docs` | 200 | Working documentation |
| `/trust` | 404 | Missing |
| `/motion-lab` | 404 | Missing |

## Working strengths to preserve

- Distinct Living Language visual identity, responsive dark/light themes and
  broad-script specimen fallbacks.
- Truthful separation between hosted static checks, local browser work and
  replay artifacts in the current copy.
- SSRF controls, redirect revalidation, bounded crawling, response limits and
  robots-policy handling.
- Locale-agnostic `Intl`-based engine and protected-token pseudo-localisation.
- Ten independently detected AtlasPay defects, bounded allowlisted patch,
  rollback and identical verification.
- Shared core used by web, CLI, MCP and CI packages.
- Stable CLI exit codes and independent packed-install verification.
- Real MCP Inspector, STDIO and MCPC smoke evidence.
- JSON, HTML, CSV, SARIF and JUnit report generation.
- Browser tests covering desktop, mobile, themes, reduced motion, axe and
  console failures.

## Reproducible gaps and risks

### Product truth

- The locked origin enum (`LIVE_PUBLIC_SCAN`, `LOCAL_REPOSITORY_SCAN`,
  `GUIDED_DEMO`, `RECORDED_REPLAY`,
  `SYNTHETIC_LOCALISATION_PREVIEW`) is absent from shared schemas and exports.
- AtlasPay counts and console rows are embedded in replay UI code. They match
  genuine generated artifacts, but the console does not derive its rows from a
  receipt and must remain visibly replay-only.
- The GitHub Actions summary embeds AtlasPay counts instead of reading the
  generated proof receipt.

### Public scanning

- Hosted scans fetch and parse static HTML. They do not render JavaScript,
  capture screenshots, inspect the accessibility tree, run axe or measure
  layout.
- Public findings omit several locked schema fields, including `origin`,
  `ruleId`, `whyItMatters` and structured `evidence`.
- Public scan records disappear on navigation and are not available in scan
  history.
- Cancel, retry, delete and duplicate actions are not implemented.

### Repository scan and repair

- Project inspection is real, but the complete browser scan/repair workflow is
  proven only against bundled fixtures.
- Web local-project mode correctly refuses to upload local source, but no report
  import flow connects a local CLI result to the web workspace.
- Repair mode tabs alter presentation but do not perform an interactive apply
  confirmation; the displayed patch is a recorded AtlasPay artifact.

### Web workspace

- Required overview, routes and accessibility surfaces are missing.
- Issue filter buttons are visually present without filtering handlers.
- The active workspace uses genuine replay data but hard-coded display events.
- There is no beginner/technical explanation switch.

### Glossary and translation memory

- Glossary supports only adding a draft entry in React state. Edit, delete,
  search, locale filtering, validation, import/export and persistence are
  missing.
- Translation memory supports search over seed entries only. Import, filter,
  export, approval changes and persistence are missing.

### Reports and evidence

- Web downloads are tied to AtlasPay replay rather than the currently selected
  user scan.
- Screenshots ZIP is missing.
- External MCP evidence does not yet include every locked call saved under
  `submission/mcp-output/`.
- Packed CLI proof checks help/locales/doctor but not a fixture scan outside the
  monorepo.

### Brand and motion

- The logo is CSS markup; required scalable brand SVG variants are missing.
- `/motion-lab` is missing.
- The language specimen changes on an interval even when reduced motion is
  requested, although CSS movement is reduced.
- No dedicated browser checks cover client-navigation remounts, pointer
  interception or layout-shift thresholds for each motion primitive.

### Release

- Vercel is deployed and verified.
- GitHub publication was explicitly skipped; `MANUAL_AUTH_REQUIRED.md`
  truthfully records the manual step.
- The deck is valid and screenshot-backed, but the stricter contract asks for
  additional execution-evidence documents and an eleven-slide narrative.

## Baseline conclusion

The baseline is not a fake product, but it is not complete under the new
contract. Work should extend the shared engine and preserve the verified
AtlasPay proof while making origins, persistence, route coverage, fixture
acceptance and external CLI/MCP evidence explicit.

## Final verification addendum

The baseline gaps above were retained as an audit record and then repaired.
Final release evidence now records:

- All 23 locked routes present in the production build.
- A new `LIVE_PUBLIC_SCAN` of Mozilla with five fetched routes and 778 extracted
  strings.
- Exact clean/broken/blocked fixture outcomes.
- Browser-local scan, glossary and translation-memory persistence.
- Scan-specific live exports and a genuine replay screenshot ZIP.
- A packaged CLI proof outside the monorepo and complete external STDIO MCP
  output under `submission/mcp-output/`.
- AtlasPay 10→0 identical verification with source-locale regression `PASS`.
- Nine Chromium browser tests covering dark, light, 390×844, 1440×900, reduced
  motion, keyboard access, downloads and zero console/hydration errors.
- A visually inspected, template-faithful, screenshot-backed PowerPoint.

The deliberate boundary remains unchanged: Vercel runs a bounded static HTTP
scan. Full Playwright rendering, axe and source repair require the local CLI or
a browser-capable worker.
