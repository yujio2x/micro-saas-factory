# Launch checklist (per product)

## Before publishing
- [ ] README: problem, what it is, how to run/use, honest status (no fake claims)
- [ ] `.gitignore`; `.env.example` if secrets needed (placeholders only)
- [ ] Secret scan: `git grep -iE "(api[_-]?key|token|secret|password)\s*[:=]"` + review all staged files
- [ ] No personal files, no existing-project code copied, LICENSE chosen
- [ ] Works from clean clone / fresh browser profile
- [ ] Desktop + mobile viewport QA of the main flow
- [ ] Empty state, error state, first-run experience checked

## Launch material ready (owner sends, we never contact autonomously)
- [ ] One-sentence positioning
- [ ] Landing page live (GitHub Pages)
- [ ] Pricing stated, CTA working
- [ ] First-20-users plan with exact communities + prepared messages
- [ ] Validation interview questions (non-leading)
- [ ] Kill criteria written down

## After publishing
- [ ] DEVLOG updated: repo URLs, commit hashes, branch, working-tree state
- [ ] Owner actions list updated
