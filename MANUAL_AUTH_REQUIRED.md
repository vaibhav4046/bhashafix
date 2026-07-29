# Manual authentication required

Local implementation, testing, artifact generation, and Vercel deployment can
be completed without an organizer login. These external actions still require
the owner:

## Publish a public GitHub repository

```bash
gh auth login
gh repo create bhashafix --public --source . --remote origin --push
```

After publishing, replace the internal `sites` remote only if desired and add
the real repository URL to the deck/submission form. Do not invent a URL before
the command succeeds.

## Submit to the hackathon organizer

Sign in to the organizer dashboard, copy the final text from
`submission/FINAL_SUBMISSION_FORM.md`, upload
`submission/BhashaFix-Hackathon-Deck.pptx`, add the real Vercel and GitHub URLs,
review the form, and submit. Capture confirmation only after the organizer
actually accepts it.
