# Raw Research Notes — Night Sprint 2026-09-12/13

Started: 23:37 local. All evidence below is from real public sources. Nothing fabricated.

## Niche A: Bank statement PDF → CSV/QBO conversion (bookkeepers/accountants)

### Pain evidence (Reddit threads, via web search snippets — Reddit blocks direct fetch)
- r/smallbusiness "How do you handle clients who only bring PDF bank statements": clients show up with years of bank statements in PDF; banks only export CSV for last 12–24 months. https://www.reddit.com/r/smallbusiness/comments/1sk02q2/
- r/Accounting "Are you still typing bank transactions one by one from a pdf?": accountants manually typing transactions when bank feeds fail. https://www.reddit.com/r/Accounting/comments/1klhmak/
- r/Bookkeeping "Looking for software to read PDF bank statements": tool recommendations thread. https://www.reddit.com/r/Bookkeeping/comments/11dg7pz/
- r/Bookkeeping "Bank won't provide CSV": OP converts via Adobe; recurring pain. https://www.reddit.com/r/Bookkeeping/comments/1coe2v9/
- r/QuickBooks "Tired of QuickBooks bank feeds missing transactions": someone built own PDF→QBO converter out of frustration. https://www.reddit.com/r/QuickBooks/comments/1tmdh5l/
- r/Bookkeeping "Dealing with bank statement PDFs": bank PDF encryption blocks conversion. https://www.reddit.com/r/Bookkeeping/comments/1cktfpj/
- r/Accounting "How do you guys handle converting bank statements into...": cleanup frustration. https://www.reddit.com/r/Accounting/comments/1jjcerk/
- r/Bookkeeping "Best PDF to CSV tool you recommend": AutoEntry 25 free credits, 3 credits/page for statements. https://www.reddit.com/r/Bookkeeping/comments/1p3vzkj/

### Frequency: monthly/quarterly recurring per client for bookkeepers; spikes at tax season.
### Payment intent: VISIBLE — a whole market of paid tools exists (below).

### Competitor landscape (fetched from capyparse.com pricing comparison + MoneyThumb search)
| Tool | Pricing | Free tier | Exports | Notes |
|---|---|---|---|---|
| MoneyThumb PDF2QBO | $59.95–$599 one-time (now shifting ~$59.99/yr) | trial | QBO | Established, SEO-dominant, per-format upsells |
| DocuClipper | $29/mo (60pp); $159/mo (640pp) | 14-day trial | CSV/XLSX/QBO/OFX/QIF | 10,000+ businesses; direct QBO/Xero/Sage integrations |
| CapyParse | $29/mo 150pp; $79/mo 600pp | 10 pages persistent | CSV/XLSX/QBO/JSON | AI-first, confidence scores |
| StatementDesk | $19/mo entry | limited trial | n/s | AI categorization |
| BankStatementConverter.com | ~$30/mo ~400pp | 1 pg/day free | n/s | rule-based Kotlin/PDFBox; ~83% accuracy in 3rd-party test |
| Docsumo | custom | trial | n/s | overkill for low volume |
| AutoEntry (Sage) | credits: 3 credits/page | 25 free credits | | |
| Founderpath | free ≤5 PDFs | free lead-gen hook | | |
| Documentric | free tier claimed | free | | |

Sources: https://capyparse.com/blog/bank-statement-converter-pricing-comparison ; suparse.com/blog/best-bank-statement-converter-2026 ; documentric.com/blog/best-bank-statement-converter-2026

### Gaps identified
1. ALL major players are server-side: user uploads client financial data to a third party. Bookkeepers have client-confidentiality duties. Zero major client-side (files never leave browser) player.
2. Subscription/credit fatigue for low-volume users. No clean one-time-purchase modern option.
3. Accuracy distrust: BSC measured 83% in third-party tests; LLM converters hallucinate digits (HN thread author: "the last 5% is a headache: hallucinations"). Nobody offers cryptographic/hmathematical verification (running-balance check).
4. HN data: many indie launches ("Show HN: I got fired so I built a bank statement converter" 16pts; "Local Bank Statement Converter"; "Bank Statement Converter That Physically Can't Read Your Data" — TDX enclaves!). validates demand; privacy is the recognized battleground; browser-based precedent exists but low-polish.

### HN sources
- https://news.ycombinator.com/item?id=46998174 (Robust ways to extract bank statements from PDF to CSV beyond raw LLMs?)
- https://news.ycombinator.com/item?id=46646023 (Physically can't read your data — TDX enclaves)
- "Local Bank Statement Converter" objectID 46859383

## Niche B: Freelance invoicing / late payments (control)
HN: "Show HN: A $20/year invoicing tool for solo developers" (13pts) — saturated space, many free invoicing tools; weak differentiation for us. REJECTED as primary.

## Niche C: Job application trackers (control)
HN: dozens of free trackers, one 294pts. Saturated with free. Weak WTP. REJECTED.

## Niche D: Status pages / changelogs / waitlists (control)
Statuspage: Atlassian owns the category; Upptime free OSS 301pts. Waitlists/changelogs: low traction, saturated. REJECTED.

## Niche E: Etsy seller tools (control)
HN low signal (this audience lives on Facebook/Etsy forums, not HN). "Pricing calculator for marketplace sellers" 3pts. Reachability harder for us than bookkeeping communities. REJECTED as primary.

## Niche F: Telegram channel tools (control)
HN near-zero signal. Data requires server-side MTProto access (not compatible with zero-ops static constraint). Owner's audience is reachable, but infrastructure cost + bot hosting = ongoing ops. PARKED (future product, not tonight).

## Technical feasibility notes (Niche A, client-side)
- pdf.js extracts embedded text layer (most bank PDFs are text-based, not scans).
- Deterministic parsing: date regexes per bank layout, amount patterns, running-balance detection for verification.
- LLM approach rejected: cost, hallucination digits, upload-privacy problem.
- Export formats: CSV (Xero/QuickBooks-ready), QBO (OFX v1 header `OFXHEADER:100` + `<OFX>` body), OFX v2, JSON. QBO/OFX format is simple SGML — fully client-side writable.
- License enforcement client-side: ECDSA-signed license keys (Web Crypto, P-256) — private key stays with owner; app verifies signature offline. No server needed.
