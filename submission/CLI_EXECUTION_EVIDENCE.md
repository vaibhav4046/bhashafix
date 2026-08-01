# CLI packaged execution evidence

Generated: 2026-08-01T14:09:14.177Z

The `@bhashafix/cli` tarball was installed in a fresh operating-system
temporary directory outside the monorepo. Commands executed the resolved
installed package entry, not TypeScript source.

| Command | Exit code | Result |
| --- | ---: | --- |
| `bhashafix --help` | 0 | PASS |
| `bhashafix doctor --json` | 0 | PASS · Node 24.12.0 |
| `bhashafix locales --json` | 0 | PASS · 17 locales |
| `bhashafix scan --project <fixture> --json` | 1 | Expected verified-issue gate · 10 issues |
| `bhashafix repair --project <fixture> --apply` | 0 | PASS · bounded fixture repair |
| `bhashafix scan --project <fixture> --json` | 0 | PASS · 0 issues |

Scan origin: `LOCAL_REPOSITORY_SCAN`
Baseline scan ID: `atlaspay-83210b0daea2`

Exit code 1 is the documented successful execution outcome when verified
blocking issues exceed the configured threshold; the repaired fixture exits 0.
