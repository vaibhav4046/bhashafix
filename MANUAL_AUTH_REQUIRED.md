# Manual action required

Everything local is complete and `pnpm verify` exits 0. The steps below need an
account action only the repository owner can take.

## 1. Publish to GitHub

Run every command below from the repository root.

The repository now exists and the remote is configured:

```
origin  https://github.com/vaibhav4046/bhashafix.git
```

The push was rejected by GitHub, not by git:

```
! [remote rejected] HEAD -> main (push declined due to email privacy restrictions)
```

Commits authored with a private email address cannot be pushed while
"Block command line pushes that expose my email" is enabled on the account.

**Option A — keep the history byte for byte (recommended).** Turn the setting
off for one push, then turn it back on. Nothing is rewritten, so the Codex
commits keep their original `codex@openai.com` authorship and their hashes,
which the submission evidence relies on.

1. Open <https://github.com/settings/emails>
2. Untick **Block command line pushes that expose my email**
3. Run:

```powershell
git push -u origin main
```

4. Re-tick the setting.

**Option B — rewrite only your own authorship email.** This preserves every
commit message, date, order and the `codex@openai.com` authorship, but it
changes commit hashes, including the one recorded in
`submission/RELEASE_MANIFEST.json`. Re-run `pnpm submission:prepare` afterwards.

```powershell
git filter-branch --env-filter '
if [ "$GIT_AUTHOR_EMAIL" = "lalwanivaibhav079@gmail.com" ]; then
  export GIT_AUTHOR_EMAIL="115102797+vaibhav4046@users.noreply.github.com"
fi
if [ "$GIT_COMMITTER_EMAIL" = "lalwanivaibhav079@gmail.com" ]; then
  export GIT_COMMITTER_EMAIL="115102797+vaibhav4046@users.noreply.github.com"
fi
' --tag-name-filter cat -- --branches --tags
git config user.email "115102797+vaibhav4046@users.noreply.github.com"
git push -u origin main
```

After either option, watch the workflow:

```powershell
gh run watch --repo vaibhav4046/bhashafix
```

## 2. Redeploy to Vercel

The project is already linked (`.vercel/project.json`, project `bhashafix`).
Deployment needs an interactive Vercel login in this shell:

```powershell
pnpm dlx vercel@latest login
pnpm dlx vercel@latest whoami
pnpm dlx vercel@latest --prod
```

What the redeploy does and does not change: the hosted scan stays HTTP-only. No
browser is bundled into the serverless function. Browser rendering runs through
the local CLI, or through a remote endpoint when `BHASHAFIX_BROWSER_WS_ENDPOINT`
is set in the project environment.

## 3. Submit to the organiser

Sign in to the organiser dashboard, copy the final text from
`submission/FINAL_SUBMISSION_FORM.md`, upload
`submission/BhashaFix-Hackathon-Deck.pptx`, add the real Vercel and GitHub URLs,
review and submit. Record confirmation only after the organiser accepts it.

## Not blocked

Nothing else waits on authentication. `pnpm verify` runs the full chain
locally — lint, typecheck, four test suites, build, fixture acceptance, packed
CLI install, MCP Inspector, MCPC, Playwright, the demo repair proof, the
ground-truth benchmark, submission preparation, deck validation and the hostile
audit — and exits 0.
