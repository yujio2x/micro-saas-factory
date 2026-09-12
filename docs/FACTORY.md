# Micro-SaaS Factory — yujio2x-industries

A repeatable loop for finding, validating, and shipping tiny paid software. One operator (solo dev), zero-ops bias, revenue over sophistication.

## The loop

```
PAIN DISCOVERY → CANDIDATES → SCORING → PICK 1 PRIMARY → MVP (real, small)
→ PRICING → LAUNCH MATERIAL → FIRST-20-USERS PLAN → HUMAN VALIDATION → ITERATE OR KILL
```

## Process (per sprint)

1. **Pain discovery** (60–75 min). Hunt complaints, not ideas: Reddit niche subs, HN (Algolia API: `https://hn.algolia.com/api/v1/search?query=...&tags=story`), GitHub issues, forums. Record source links + quotes in `research/raw-notes.md`. Search phrases: "how do you manage", "alternative to", "too expensive", "takes hours", "any tool for", "spreadsheet", "wish it could".
2. **Candidates** (15 min). Fill `factory/idea-template.md` per serious idea. Reject weak ideas aggressively (see anti-list below).
3. **Scoring** (15 min). 10 criteria × 1–10 in `docs/CANDIDATES.md` (PAIN, WTP, REACH, BUILD, COST, COMP-GAP, RETENTION, FIT, DIST). Do not rig scores toward a favorite.
4. **Select ONE primary.** Secondaries only if they cost <10% of primary effort.
5. **Build real MVP.** Static/client-side first (zero ops). No fake UI. Deterministic logic > LLM for deterministic tasks. LLM never owns money/permissions/irreversible state.
6. **Pricing** anchored to alternatives. Prepare payment integration boundary + owner instructions; don't wire real money without owner.
7. **Launch material + first-20-users plan** with exact communities/links. NEVER contact anyone autonomously — GitHub is the only autonomous publishing surface.
8. **QA:** unit tests, browser QA desktop+mobile, attack the main flow, secret scan, then push.
9. **Log everything** in `docs/DEVLOG.md` as it happens; write owner actions list.

## Anti-portfolio (default rejections)

Generic AI wrappers · social networks · marketplaces · all-in-one apps · enterprise procurement · regulated fields · products needing proprietary data · products needing scale before usefulness · infra-heavy products needing servers before validation.

## Hard rules tonight (and defaults after)

- Publish autonomously ONLY on GitHub. All other channels = prepared drafts for owner.
- No spending money, no paid resources, no credentials read, no touching existing projects.
- `.env.example` with placeholders only; never commit real secrets.
- Human validation that hasn't happened is labeled **NOT YET VALIDATED**.

## Repo layout

```
factory/          reusable templates + checklists (this process)
products/         one dir per product (code lives in its own repo when published)
docs/             FACTORY.md, CANDIDATES.md, EXPERIMENT_LOG.md, NIGHT_SPRINT.md, DEVLOG.md
research/         raw-notes.md + raw/ (search result JSONs)
```

## Meta-learning from night sprint #1 (2026-09-12/13)

What actually worked (keep for next run):
- **Zero-runtime constraint discovered first** → forced static/client-side product class → zero ops cost, instant GitHub Pages deploy. Do this check FIRST every sprint.
- **HN Algolia API for research** (`hn.algolia.com/api/v1/search?query=…&tags=story`) is fast and fetchable via curl; Reddit blocks direct JSON (403) — use web-search snippets for thread evidence instead.
- **Portable node.exe** (single binary downloaded into workspace) unlocked a real unit-test loop with no system install. 73 tests caught 5 real parser bugs before browser QA.
- **Browser QA via in-app browser + tiny static server + a documented test seam** (`window.__bpInjectFile`) let the whole file-drop flow be automated (file choosers are not automatable).
- **Verification-scored parsing** (auto sign-convention detection) came directly from evidence: LLM-converters hallucinate; deterministic + self-checking is the differentiator. Products should derive their core mechanic from the researched pain.
- Pricing/competitor table from ONE comparison blog + one search gave the whole pricing landscape in ~5 minutes.

What to do differently next time:
- Write the landing page BEFORE the FAQ-level polish; the landing is the product for early users.
- Prepare fixture PDFs early (PDF generation by hand cost ~30 min); keep a growing library of real bank layouts per product.
- Ship to GitHub Pages even earlier (it cost nothing and made QA use the real CDN path).

Reusable assets (in this repo):
- factory/ templates (idea, evaluation, experiment, launch checklist, kill criteria)
- tools/sign-license.js + secrets-local/ pattern for offline ECDSA licensing
- tools/serve.js + tools/make-fixture-pdf.js (now in products/balanceproof/tools/) for static-app QA
- research/raw-notes.md as the evidence format template
