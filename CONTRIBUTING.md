# Contributing to BhashaFix

Thank you for improving localisation quality in real software.

## Development setup

1. Install Node.js 22.13+ and pnpm 10.
2. Fork and clone the repository.
3. Run `pnpm install`.
4. Run `pnpm exec playwright install chromium`.
5. Create a focused branch and make the smallest coherent change.

Before opening a pull request:

```bash
pnpm verify
```

For engine work, add predicate-based unit or integration tests. For product
surfaces, include browser coverage at the relevant viewport and theme. Do not
make model output authoritative, weaken the 10→0 proof, or widen repair paths
without a security review.

## Pull requests

Describe the problem, the tested behaviour, any security boundary affected, and
the exact commands run. Keep unrelated formatting out of functional changes.
Never include API keys, browser storage state, customer content, or generated
personal data.

By contributing, you agree that your work is licensed under Apache-2.0 and to
follow the [Code of Conduct](CODE_OF_CONDUCT.md).
