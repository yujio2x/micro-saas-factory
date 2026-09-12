# BalanceProof — competitor analysis & pricing rationale

Full evidence links in `research/raw-notes.md`.

## Landscape

| Tool | Model | Price | Weakness we exploit |
|---|---|---|---|
| MoneyThumb PDF2QBO | desktop, one-time/annual | $59.95–$599 (now ~$59.99/yr) | dated UX, per-format upsells, upload-based online variant |
| DocuClipper | SaaS sub | $29/mo (60pp) – $159/mo (640pp) | upload-based; subscription for occasional users |
| CapyParse | SaaS sub | $29–79/mo, 10pp free | upload-based; AI extraction |
| StatementDesk | SaaS sub | $19/mo | upload-based; self-reported accuracy |
| BankStatementConverter.com | SaaS sub | ~$30/mo, 1pg/day free | 83% accuracy in third-party test; expiring credits |
| AutoEntry (Sage) | credits | 3 credits/page | credit burn on statements |
| Founderpath / Documentric free tools | free hooks | free ≤5 PDFs | lead-gen for other products; upload-based |

## Why there is room

1. **Every mainstream competitor is server-side.** Bookkeepers hold client-confidential financial
   data; uploading it to a third-party SaaS is a compliance/privacy sore point that came up
   repeatedly in our research (HN even produced a hardware-enclave converter to address it).
   "Your files never leave your browser" is the strongest possible answer and none of the
   mainstream tools can claim it.
2. **Subscription fatigue for the long tail.** A bookkeeper with 2 statements a month pays $19–30/mo
   ($228–360/yr) or pays MoneyThumb ~$60/yr for dated desktop software. A $39 one-time license for
   unlimited local use prices below one year of every subscription competitor.
3. **Trust via verification.** Third-party tests found one incumbent at 83% accuracy; LLM-based
   converters hallucinate digits. BalanceProof's running-balance reconciliation converts "trust
   me" into "check me" — every row either reconciles to the penny or is flagged.

## Pricing

- Free: unlimited statements ≤3 pages, CSV/JSON.
- Pro: **$39 one-time** (unlimited pages, QBO/OFX/Xero exports, updates).
- Rejections: $19 too low to filter pro users; $59+ collides with MoneyThumb's brand recognition
  without its SEO. $39 ≈ 5 weeks of the cheapest subscription competitor.
- Signal to revisit: if trial→paid conversion is high (>15%), test $49. If users churn after the
  first month (one-and-done), consider a smaller annual "updates" fee.

## Launch tactic

**First 20 users get Pro free in exchange for honest feedback** (documented in README and on the
landing page). This converts the missing payment rail into a deliberate early-access program,
seeds testimonials, and produces the bank-layout coverage data we actually need most.
