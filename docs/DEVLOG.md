# DEVLOG — Micro-SaaS Factory Night Sprint

Sprint window: 2026-09-12 23:37 → 2026-09-13 05:37 (6h hard stop). Single source of truth.
Machine: Windows 11, Git Bash. GitHub CLI authenticated as **yujio2x**. No Node/Python preinstalled — a portable `node-portable.exe` (v20.19.0) was downloaded into the factory root for running tests (gitignored).

---

## 2026-09-12 23:37 — Environment recon

- GitHub account yujio2x: existing repos student-ai-bot, student-os, yujiodoublex-factory (private), todoList. ALL PROTECTED — untouched tonight (verified at final security check).
- No Node/Python on machine → products must be pure static/client-side web apps (zero ops, GitHub Pages deployable — allowed by policy).

## 23:39 — Workspace created

`Desktop/yujio2x-industries/micro-saas-factory/` (factory/, products/, docs/, research/). Git init on main. (Initially created one level too deep by mistake; fixed by moving.)

## 23:41–23:55 — Phase 2 pain discovery

Method: HN Algolia API (14 niche queries, saved to research/raw/), Reddit (direct JSON fetch blocked → web-search snippets with thread links), competitor pricing pages via WebFetch/WebSearch.

Key findings (full evidence with links in research/raw-notes.md):
1. **Bank statement PDF→CSV niche: visible, repeated, PAYING pain.** 8+ Reddit threads (banks gate CSV exports to 12–24 months; bookkeepers retype transactions; a QB user built their own converter out of frustration).
2. **Incumbent pricing**: MoneyThumb $59.95–599 (now ~$59.99/yr); DocuClipper $29–159/mo (10k+ businesses claimed); CapyParse $29–79/mo; StatementDesk $19/mo; BSC ~$30/mo. Market proven.
3. **Open wedges**: (a) all mainstream tools are server-side → client-confidentiality concern; (b) accuracy distrust (BSC 83% in 3rd-party test; HN builder admits LLM hallucination of digits); (c) subscription fatigue for low-volume users.
4. Control niches scored lower (CANDIDATES.md): job trackers (saturated, free), status pages (Atlassian/Upptime), waitlists/changelogs (low WTP), Etsy tools (hard reach), Telegram analytics (needs always-on server → violates zero-ops).

## 23:56 — DECISION (Phases 3–5)

**Primary bet: client-side bank statement converter.** Score 72/90 (next best 63). Name search: LedgerLift (bookkeeping service exists), StatementSnap (existing competitor app) → chosen **BalanceProof** (clean). No secondaries — protect primary quality. Reverse CSV→QBO converter parked as possible free sub-page later.

## 00:00–00:12 — Phase 1 factory docs

FACTORY.md (process), idea/evaluation/experiment/launch/kill templates, CANDIDATES.md (scoring + rejections), NIGHT_SPRINT.md, EXPERIMENT_LOG.md. Committed `844c3d0`.

## 00:02–00:12 — Core engine (committed `9b08172`)

- `products/balanceproof/js/parser.js` — deterministic parser: bank-profile detection (US mdy / UK dmy), amount tokenization (thousands separators, parens negatives, trailing minus, CR/DR, currency symbols, EU decimal comma), date formats (mdy/dmy × 2/4-digit years, "01 Mar 2024", "Mar 01 2024", MM/DD with inferred year), year inference from statement period, running-balance **verification**, **auto sign-convention detection** (tries both signs, keeps whichever reconciles — handles banks that print debits positive), date-order + zero-amount review flags, noise filtering (page footers, totals, MEMBER FDIC, column headers), continuation-line description merging.
- `js/exporters.js` — CSV (RFC4180), Xero CSV, QuickBooks Online CSV, **QBO (QuickBooks Desktop OFX 1.02 SGML)**, OFX 2.x XML, JSON. Deterministic FITIDs (djb2 hash of row content → re-import dedupe), SGML entity escaping for non-ASCII.
- `js/license.js` + `tools/sign-license.js` — offline Pro licensing: ECDSA P-256 (WebCrypto) over the base64url payload (JWT-style). Keypair generated locally via openssl; **private key: `secrets-local/bp-license-private.pem` (gitignored, NOT in any repo)**; only the public SPKI key is embedded in the app. Sample test key signed and verified.
- `test/run.js` — 73 unit tests (parser tokens/dates/fixtures/verification/exporters/license roundtrip). **All green.**

Bugs found & fixed during TDD: regex capture-group bug (`(beginning|opening|previous)` swallowed m[1] → use `(?:…)`), inverted-sign verification (balance column must NOT flip), MM/DD-no-year pattern missing, ctx object passed in wrong parameter position.

## 00:14–00:27 — Single-page app (committed `3ba140c`)

`index.html` + `style.css` + `js/app.js`: hero (who/what/why in one screen), dropzone, editable results table with live re-verification, export bar (date format + currency options, free/pro-gated buttons), unparsed-lines panel (transparency), pricing (Free / Pro $39 one-time + early-bird: first 20 users get Pro free for feedback), license panel, 6-question FAQ. pdf.js 3.11.174 legacy from jsDelivr; text-line reconstruction groups items by y/x. `window.__bpInjectFile` = documented test seam for automation (client-side anyway).

## 00:30–01:00 — Browser QA (IAB + local server tools/serve.js:8787)

Bugs found & fixed (committed `40fb950`):
1. Locked panel visible on load — CSS `display:flex` overrode `[hidden]` → added `.locked[hidden]{display:none}`.
2. `pdfjsLib.getDocument({data})` returns a loading task → must use `.promise`.
3. Free-preview boolean passed as text (status message showed on every parse).

Then full attack pass, all correct:
- US fixture: 7 rows, "✓ Reconciles", opening/closing matched, status hidden.
- Edit amount → row flagged, badge updates live. Delete row → verification honestly breaks (chain shift). Restore works.
- UK fixture: 5 rows verified (detected as "US-style" — known cosmetic limitation, month-name dates are unambiguous so values are correct).
- Card fixture (no balance): "— No running balance" badge + warning.
- Garbage file → clean error. Encrypted-PDF path coded (PasswordException → clear message).
- Downloads fire (CSV, .qbo). License: gate blocks Pro exports without key ("This export format needs Pro."), unlock via UI works, persists in localStorage.
- Multi-page: 5-physical-page PDF (139-txn preview) → "Free preview: first 3 of 5 pages" + lock panel; unlock → hint to re-open PDF.
- Visual QA desktop 1280×720 + mobile 390×844: clean layout, table scroll-x works, buttons wrap. (Screenshots reviewed during session.)

## 00:35–00:50 — Launch materials (factory repo `c32e1d8`)

- docs/launch/COMPETITORS.md — landscape table, why there is room, $39 one-time rationale.
- docs/launch/MESSAGES.md — first-20-users plan (r/Bookkeeping, r/QuickBooks, r/Accounting, r/smallbusiness, r/Xero, FB bookkeeper groups, QB community forums, UK AccountingWEB), post templates, validation interview questions, success metrics + kill criteria.
- Product README.md (honest status: MVP NOT YET VALIDATED), LICENSE (MIT), product .gitignore.

## 00:50 — PUBLISH (GitHub only, per policy)

Secret scan first (git grep patterns + file review): only harmless "money token" comment matches; no `.env`, no keys, no personal files. `secrets-local/`, `node-portable.exe`, `research/raw/*.json` gitignored.

- **https://github.com/yujio2x/balanceproof** (public) — product code. Branch main.
- **https://github.com/yujio2x/micro-saas-factory** (public) — factory process/research/docs (products/ excluded from this repo; product lives in its own repo).
- **GitHub Pages enabled**: https://yujio2x.github.io/balanceproof/ — live site verified end-to-end in browser (parse → verify → render OK on the live URL).

## 01:00–01:10 — Hardening round 2

- 5-page / 225-txn synthetic statement: full parse reconciles to the penny (75→225 rows, verified true). Perf fine.
- Multi-page free-tier gating verified in browser.
- Unlock-mid-session UX: added hint "open your PDF again to convert all pages."

## Current state of each product

**balanceproof** — BUILT + SELF-TESTED. NOT YET VALIDATED BY REAL USERS.
- Free: unlimited statements ≤3 pages, CSV/JSON. Pro: $39 one-time (unlimited pages, QBO/OFX/Xero).
- Payment rail NOT wired (no money may be spent tonight) → owner action.
- Repo: https://github.com/yujio2x/balanceproof — Pages: https://yujio2x.github.io/balanceproof/

**factory** — process + research + launch docs + owner tools. Repo: https://github.com/yujio2x/micro-saas-factory

## Known limitations / risks (honest)

1. **Real-world layout variance is THE risk.** Synthetic fixtures + heuristics can't prove real-bank coverage. Mitigation in place: verification badge flags bad parses; unparsed lines shown; editable table; early-bird program collects named banks from first users.
2. Scanned/image PDFs unsupported (deliberate: no OCR cloud).
3. UK numeric-date statements may display as "US-style" (values still verified correct via reconciliation; month-name dates unambiguous).
4. License enforcement is client-side (signed keys) — determined pirates can bypass; acceptable for $39 B2B tool (same tradeoff class as MoneyThumb).
5. pdf.js from CDN — first load needs internet; could be vendored later.
6. No conversion counter/analytics (deliberate privacy choice; limits funnel measurement — owner can add a privacy-friendly counter later).

## Owner actions (morning list)

1. Post the prepared messages (docs/launch/MESSAGES.md) in r/Bookkeeping + r/QuickBooks threads; DM the thread authors with template C.
2. Collect feedback + named bank layouts from first responders; add layouts (parser is modular: add profiles in `js/parser.js`).
3. Set up payment rail (Lemon Squeezy or Gumroad recommended for MoR/VAT handling) → then replace the license-panel copy with a buy link; generate real Pro keys with `node-portable.exe tools/sign-license.js <email>` (private key in secrets-local/ — back it up somewhere safe, e.g. password manager; it is NOT in any repo).
4. Optionally add a privacy-friendly analytics beacon (e.g. GoatCounter free tier) to measure funnel.
5. Decide on custom domain later (not required for validation).

## Kill criteria (written BEFORE launch — see factory/kill-criteria.md)

- 30 targeted community messages → <5 meaningful replies → reposition or kill.
- 20 users tried it → 0 would pay $39 → reprice once ($19–29), still 0 → kill.
- Feedback shows real statements mostly fail to parse → invest 1 more sprint in layouts; if still <50% of named banks parse cleanly → kill (workaround already "good enough" for market).
- Support burden requires per-customer manual labor → automate or kill.

## Final security check (end of sprint)

See final section at bottom (to be appended before 05:37).
