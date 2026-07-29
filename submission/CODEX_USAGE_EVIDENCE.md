# Codex usage evidence

Codex was used as the repository-native implementation and release agent for
this hackathon build.

## Material work performed

- Converted the application into a pnpm workspace and implemented the shared
  localisation engines.
- Built the AtlasPay ten-defect target and generic deterministic predicate set.
- Implemented strict CLI and MCP adapters over the shared core.
- Implemented SSRF controls, path confinement, symlink rejection, rollback,
  secret redaction, CSP, and audit records.
- Built and visually inspected the complete web experience across desktop,
  mobile, dark, and light modes.
- Ran Playwright, axe-core, Vitest, TypeScript, ESLint, production builds, CLI
  tests, MCP protocol tests, and the real repair proof.
- Generated the real replay/report bundle, screenshots, PowerPoint, release
  documents, and Vercel deployment.

## Evidence retained in the repository

- Incremental Git history in `git log`.
- Execution plan at `docs/execution-plan.md`.
- Real baseline at `public/replay/baseline-scan.json`.
- Real verification result at `submission/repair-proof.json`.
- Real unified diff at `submission/repair.patch`.
- Actual browser screenshots at `submission/screenshots/`.
- Test code at `tests/` and CI at `.github/workflows/bhashafix.yml`.

No model thought process is presented as a command receipt. No model message is
accepted as repair proof. Command evidence in the final release report comes
from executed tools and process exit codes.
