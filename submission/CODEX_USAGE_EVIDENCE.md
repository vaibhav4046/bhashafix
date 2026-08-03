# Codex usage evidence

Codex served as the repository-native implementation agent for the initial
build and as the final integration, security, test and release owner. Claude
Code also performed a substantial independent audit and browser-engine
hardening pass; that contribution is credited separately in
`submission/AI_TOOLING_DISCLOSURE.md` and was reviewed rather than re-attributed.

## Initial product work led by Codex

- Converted the application into a pnpm workspace and implemented the shared
  localisation engines and web, CLI, MCP and CI surfaces.
- Built the AtlasPay ten-defect fixture, deterministic predicate contract,
  allowlisted repair boundary, rollback path and portable report formats.
- Implemented SSRF controls, path confinement, symlink rejection, secret
  redaction, CSP and audit records.
- Built the first complete web experience, submission package and Vercel
  deployment.

## Final integration and release work led by Codex

- Audited the inherited independent-agent changes against the repository and
  preserved the parts backed by executable evidence.
- Hardened the hosted Chromium path: every redirect, frame and subrequest is
  revalidated; private, loopback and metadata destinations are blocked;
  requests and origins are capped; query strings and runtime stacks are kept
  out of browser-facing errors; and a concurrency race was closed.
- Integrated a bounded public quick scan with real Chromium screenshots,
  rendered-DOM measurements, axe execution, arbitrary valid BCP 47 inputs,
  viewport selection and downloadable JSON evidence.
- Kept the full route x locale x viewport matrix, authenticated coverage,
  durable artifacts and repository repair in the local CLI trust boundary.
- Fixed a real light-theme accessibility regression and improved release lint
  performance without suppressing errors or weakening assertions.
- Reconciled the CLI, MCP, website, docs and submission narrative so the MCP
  10-to-0 repair proof is explicitly AtlasPay-fixture evidence rather than an
  arbitrary-project claim.
- Ran the full quality chain: lint, typecheck, unit, integration, CLI, MCP,
  production build, packed clean-consumer install, MCP Inspector, real STDIO,
  MCPC, browser E2E, AtlasPay 10-to-0, Next.js 6-to-0, the 70-defect benchmark,
  hostile audit, submission validation and production smoke.
- Completed the final production deployment and verified the public hosted
  Chromium flow end to end.

## Evidence retained in the repository

- Incremental Git history in `git log`.
- Execution plan at `docs/execution-plan.md`.
- Historical audit at `docs/PRODUCT_TRUTH_MATRIX.md`.
- AtlasPay baseline at `public/replay/baseline-scan.json`.
- Repair result at `submission/repair-proof.json` and unified diff at
  `submission/repair.patch`.
- Browser, benchmark and package receipts under `artifacts/`.
- Actual browser screenshots under `submission/screenshots/`.
- Test code under `tests/` and CI under `.github/workflows/bhashafix.yml`.

No model thought process is presented as command evidence. No model message is
accepted as repair proof. Release claims come from executed tools, persisted
artifacts and process exit codes.
