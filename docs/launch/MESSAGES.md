# BalanceProof — first 20 users plan & validation messages

Owner executes these manually. DO NOT send anything autonomously.

## Where the first 20 users are

Priority order (pain already appears there daily):

1. **r/Bookkeeping** — recurring "how do I convert PDF bank statements" threads
   (evidence: reddit.com/r/Bookkeeping/comments/11dg7pz, /comments/1coe2v9, /comments/1p3vzkj)
2. **r/QuickBooks** — bank-feed complaints + CSV import pain (reddit.com/r/QuickBooks/comments/1tmdh5l)
3. **r/Accounting** — "typing transactions one by one from a pdf" (reddit.com/r/Accounting/comments/1klhmak)
4. **r/smallbusiness** — owners with years of PDF statements (reddit.com/r/smallbusiness/comments/1sk02q2)
5. **r/Xero** — UK/AU/NZ bookkeepers, Xero CSV import questions
6. **Facebook bookkeeper groups** ("Bookkeepers of America", UK bookkeeping groups) — search "bank statement PDF"
7. **Intuit QuickBooks Community forums** — threads about importing PDF statements
8. **UK: UK Business Forums / AccountingWEB** — same pain, less competition

## Rules of engagement (owner)

- Answer the question first, link second. Posts that are pure self-promo get removed and burn the account.
- Use each community's rules; some want mod approval for tool links.
- One helpful comment per thread; never mass-DM.
- Track replies in EXPERIMENT_LOG.md (kill criteria: 30 targeted messages → <5 meaningful replies → reposition).

## Post templates

### A. Reply to a "how do I convert PDF statements" thread (non-salesy)

> I built a free tool for exactly this after losing an afternoon to it. It's called BalanceProof —
> it runs entirely in your browser (the PDF is never uploaded anywhere, which matters when it's a
> client's data), checks the parsed rows against the running balance so you can see it read
> everything correctly, and exports CSV or QuickBooks-ready formats. Free version does up to 3
> pages. Link: [PAGES URL] — if you try it and it misreads your bank's layout, tell me which bank
> and I'll add it.

### B. Show-your-tool post (e.g. r/Bookkeeping if allowed by rules)

> I built BalanceProof — browser-only bank statement converter (PDF → CSV/QBO/OFX/Xero).
> The twist: your files never leave your computer, and every row is verified against the
> statement's running balance so you know it read correctly before you import. Early access:
> free Pro licenses for the first 20 people who give honest feedback. What layout should I
> support next?

### C. Direct validation message (for people who complained publicly, e.g. thread authors)

> Saw your post about clients only bringing PDF statements — how are you handling those today?
> I'm building a small tool for this (runs in the browser, nothing gets uploaded) and I'm trying
> to understand how bookkeepers actually deal with this before I polish it further. Not selling
> anything — happy to give you a free Pro license for 10 minutes of your opinions.

## Validation interview questions (behavior-first, non-leading)

1. Walk me through the last time a client handed you PDF statements — what did you do, step by step?
2. How many statements/pages do you handle in a typical month? What about Jan–Apr?
3. What do you use today for that? What does it cost you (money and time)?
4. What's the most annoying part of that process?
5. Who else feels this pain — do colleagues handle it differently?

(Pricing question, asked last:) If the conversion took you 10 seconds and never touched a server,
what would a fair price look like? — record answer verbatim, do NOT anchor first.

## Success metrics (first 2 weeks)

- ≥5 meaningful conversations from communities (kill criterion threshold: <5 of 30 messages)
- ≥20 free conversions/day after posting (landing page counter placeholder pending)
- ≥10 feedback conversations → ≥3 willing to pay / accept paid tier
- Bank-layout coverage requests collected (target: 5 named banks)
