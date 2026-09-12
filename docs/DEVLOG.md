# DEVLOG — Micro-SaaS Factory Night Sprint

Sprint window: 2026-09-12 23:37 → 2026-09-13 05:37 (6h hard stop). Single source of truth.

---

## 2026-09-12 23:37 — Environment recon

- Machine: Windows 11 (win32), Git Bash. Time checked at start: 23:37.
- Available: git 2.55, GitHub CLI authenticated as **yujio2x** (scopes: gist, read:org, repo).
- NOT installed: Node.js, Python, gh not on PATH (used full path `C:\Program Files\GitHub CLI\gh.exe`).
- Consequence: **no local runtime** → products tonight must be pure static/client-side web apps (also ideal: zero operating cost, GitHub Pages deploy allowed by policy).
- Existing account repos (read-only check): student-ai-bot, student-os, yujiodoublex-factory (private), todoList. PROTECTED — no touching.

## 23:39 — Workspace created

`Desktop/yujio2x-industries/micro-saas-factory/` with factory/, products/, docs/, research/. Git init on `main`.

## 23:41–23:55 — Phase 2 pain discovery (see research/raw-notes.md for full evidence)

Method: HN Algolia API (14 niche queries), Reddit (direct JSON blocked → used web-search snippets with thread links), competitor pricing pages.

Key findings:
1. **Bank statement PDF→CSV niche has visible, repeated, paying pain**: 8+ recent Reddit threads (banks gate CSV exports to 12–24 months; bookkeepers retype transactions; a QB user built their own converter out of frustration).
2. **Incumbent pricing**: MoneyThumb $59.95–599 (now ~$59.99/yr); DocuClipper $29–159/mo (10k+ businesses); CapyParse $29–79/mo; StatementDesk $19/mo; BSC ~$30/mo.
3. **Open wedges**: all major tools are server-side (upload = client-data exposure for confidential bookkeeping); accuracy distrust (BSC 83% in 3rd-party test; HN builder admits LLM hallucination of digits); subscription fatigue for low-volume users.
4. Control niches (job trackers, status pages, waitlists, changelogs, Etsy, Telegram, invoicing) scored lower — saturated/free-dominated or infra-heavy. Details in CANDIDATES.md.

## 23:56 — DECISION (Phase 5)

**Primary bet: client-side bank statement converter** ("bookkeeper-first"). Score 72/90; next best 63.
- One-time Pro license model (no backend, no accounts, no subscriptions).
- Wedge: privacy (files never leave browser) + running-balance verification + one-time price.
- No secondary products — protect primary quality. Reverse CSV→QBO converter kept as free sub-page (lead-gen) if time allows.

## Next up
- Phase 1 factory docs; then MVP build.
