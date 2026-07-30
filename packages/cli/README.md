# @bhashafix/cli

Local CLI for BhashaFix localisation discovery, scanning, repair, verification,
reports, and CI gates.

```bash
bhashafix --help
bhashafix locales --json
bhashafix translate-preview --locale ar-SA --text "Pay {amount} with AtlasPay"
bhashafix scan --no-ai --json
bhashafix issues --json
bhashafix verify --changed-only
bhashafix ci --config .bhashafix/config.yml --fail-on blocking
```

Requires Node.js 22+. Licensed under Apache-2.0.

The published tarball contains a standalone bundled binary and is verified in a
clean temporary consumer by the repository's `pnpm pack:verify` gate.
