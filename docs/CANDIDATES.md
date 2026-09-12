# Candidates — Night Sprint 2026-09-12/13

Scoring 1–10 per criterion. Evidence in `research/raw-notes.md`.

| # | Candidate | PAIN | WTP | REACH | BUILD | COST | COMP.GAP | RETENTION | FIT | DIST | TOTAL |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Statement converter (client-side, bookkeeper-first)** | 9 | 9 | 7 | 7 | 10 | 7 | 8 | 8 | 7 | **72** |
| 2 | CSV→QBO/OFX import fixer (reverse direction) | 6 | 7 | 6 | 8 | 10 | 7 | 6 | 7 | 6 | 63 |
| 3 | Freelance invoice chaser | 6 | 6 | 4 | 6 | 8 | 4 | 5 | 6 | 5 | 50 |
| 4 | Job application tracker | 7 | 3 | 6 | 8 | 9 | 3 | 4 | 7 | 5 | 52 |
| 5 | Status page alternative | 5 | 6 | 6 | 6 | 7 | 3 | 8 | 6 | 5 | 52 |
| 6 | Waitlist tool | 4 | 4 | 5 | 8 | 8 | 3 | 3 | 6 | 5 | 46 |
| 7 | Etsy seller profit calculator | 6 | 5 | 4 | 8 | 9 | 5 | 3 | 5 | 4 | 49 |
| 8 | Telegram channel analytics (MTProto) | 7 | 6 | 7 | 3 | 4 | 5 | 7 | 6 | 6 | 51 |
| 9 | Newsletter sponsorship tracker | 5 | 5 | 4 | 7 | 8 | 4 | 4 | 5 | 4 | 46 |

## Candidate 1 — Statement converter (SELECTED, primary bet)

- **Target user:** bookkeepers & small-firm accountants (secondary: business owners doing own books) who receive client bank statements as PDFs and need them into QuickBooks/Xero/Excel.
- **Concrete problem:** banks limit CSV export to ~12–24 months; older statements exist only as PDFs; bookkeepers retype transactions or pay per-page credit subscriptions for AI converters that upload client financial data to third-party servers and sometimes mis-read digits.
- **Current workaround:** manual retyping, Adobe export + manual cleanup, or paying $19–159/mo for server-side converters.
- **Proposed solution:** browser-only converter — drop a PDF, get verified transactions, export to CSV/XLSX-ready CSV/QBO/OFX. Files never leave the user's computer. Deterministic parser + running-balance verification ("every transaction reconciles to the penny" indicator).
- **Why now:** privacy sensitivity of AI uploads is peak (HN enclave converters appearing); QuickBooks/Xero remain dominant; banks still gate CSV history.
- **Existing alternatives:** MoneyThumb ($59.95+/yr desktop), DocuClipper ($29+/mo), CapyParse ($29/mo), BSC (~$30/mo), free hooks (Founderpath ≤5 PDFs). Market PROVEN; privacy + one-time-pricing + verification are open wedges.
- **Differentiation:** (a) 100% client-side — strongest possible privacy claim; (b) mathematical running-balance verification; (c) no subscription — one-time Pro license; (d) instant, no signup, no upload.
- **Monetization hypothesis:** freemium. Free: unlimited conversions up to 3 pages/file + all CSV exports. Pro one-time $39: unlimited pages, batch files, QBO/OFX/Xero exports, all future bank profiles. Anchored below MoneyThumb's $59.95+/yr and absurdly below a year of DocuClipper ($348+/yr).
- **First acquisition channel:** r/Bookkeeping, r/QuickBooks, r/Accounting, r/Xero + Facebook bookkeeper groups + long-tail SEO ("<bank> statement to csv") via GitHub Pages landing.
- **Expected MVP complexity:** medium — pdf.js text extraction + deterministic parser for ~10 bank layouts + generic fallback with column mapping + 4 export formats + verification UI. No backend at all.
- **Kill criteria:** see `factory/kill-criteria.md`.

## Rejection reasons (main losers)

- **#3 Invoice chaser:** reachability low without own freelance audience; "dunning" features need email infra (backend, deliverability); crowded.
- **#4 Job tracker:** dozens of free tools (one hit 294 HN points); no WTP evidence; retention weak (job search ends).
- **#5 Status page:** Atlassian + Upptime (free, 301 pts) own it; no gap.
- **#8 Telegram analytics:** real pain but requires always-on MTProto server → operating cost + ops burden violate zero-ops constraint tonight. Parked for a future sprint with owner-hosted VPS.

## Portfolio decision

**One primary bet, no secondaries.** Candidate #1 dominates on WTP evidence (a decade-old paid market with $19–159/mo incumbents and 10k+ business customers at DocuClipper) while every other candidate scored ≤63 with weaker payment signals. The reverse converter (#2) is kept as a FREE sub-tool of the primary (lead-gen, same engine, ~1h extra) rather than a separate product.
