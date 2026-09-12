/* BalanceProof — deterministic bank statement parser.
 * Pure functions, no DOM, no network. Runs in browser and Node (tests).
 * Every parsed row is re-verified against the statement's running balance.
 */
(function (root) {
  'use strict';

  // ---------- amount helpers ----------

  // Parse a bare money token: "1,234.56", "1234.56", "(123.45)", "123.45-",
  // "£1,234.56", "123.45CR", "123.45DR", "1234,56" (EU decimal comma).
  function parseAmountToken(tok) {
    if (tok == null) return null;
    let s = String(tok).trim();
    if (!s) return null;
    s = s.replace(/[£$€\s]/g, '');
    if (s.length > 20) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
    else if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    if (/CR$/i.test(s)) { s = s.slice(0, -2); neg = false; }
    else if (/DR$/i.test(s)) { s = s.slice(0, -2); neg = true; }
    if (!/\d/.test(s)) return null;
    if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');       // 1,234.56
    else if (/^\d+\.\d+$/.test(s)) { /* 1234.56 */ }
    else if (/^\d+,\d{2}$/.test(s)) s = s.replace(',', '.');                  // EU 1234,56
    else if (/^\d+\.\d{3}(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
    else if (/^\d+$/.test(s)) { /* bare integer: reject unless decimal context — reject here */
      return null;
    }
    else return null;
    const n = Number(s);
    if (!isFinite(n)) return null;
    return neg ? -n : n;
  }

  // Strip trailing money tokens from a line tail.
  // Returns { amounts: [firstSeenLast?...] } — array ordered left-to-right as printed.
  function takeTrailingAmounts(tail) {
    const toks = tail.trim().split(/\s+/);
    const amounts = [];
    while (toks.length) {
      const t = toks[toks.length - 1];
      const v = parseAmountToken(t);
      if (v != null) {
        amounts.unshift(v);
        toks.pop();
        continue;
      }
      if (/^(CR|DR)$/i.test(t) && amounts.length) { toks.pop(); continue; }
      break;
    }
    return amounts.length ? amounts : null;
  }

  // ---------- dates ----------
  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

  function pad(n, w) { return String(n).padStart(w, '0'); }

  function mkDate(y, m, d) {
    if (y == null || m == null || d == null) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    if (y < 1990 || y > 2100) return null;
    return { y: y, m: m, d: d, iso: pad(y, 4) + '-' + pad(m, 2) + '-' + pad(d, 2) };
  }

  // Parse a date at the START of s. order: 'mdy'|'dmy'. opts.year fills missing year.
  // Returns {date, rest} or null.
  function takeDate(s, order, opts) {
    opts = opts || {};
    let m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s+/.exec(s);
    if (m) {
      const a = +m[1], b = +m[2], y = +m[3];
      const d = order === 'dmy' ? mkDate(y, b, a) : mkDate(y, a, b);
      if (d) return { date: d, rest: s.slice(m[0].length) };
    }
    m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})\s+/.exec(s);
    if (m) {
      const a = +m[1], b = +m[2], y = 2000 + +m[3];
      const d = order === 'dmy' ? mkDate(y, b, a) : mkDate(y, a, b);
      if (d) return { date: d, rest: s.slice(m[0].length) };
    }
    m = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?,?\s+(\d{4}|\d{2})?\s+/i.exec(s);
    if (m) {
      const d0 = +m[1], mo = MONTHS[m[2].toLowerCase()];
      const y0 = m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : (opts.year || null);
      const d = mkDate(y0, mo, d0);
      if (d) return { date: d, rest: s.slice(m[0].length) };
    }
    m = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})?\s+/i.exec(s);
    if (m) {
      const mo = MONTHS[m[1].toLowerCase()], d0 = +m[2];
      const y0 = m[3] ? +m[3] : (opts.year || null);
      const d = mkDate(y0, mo, d0);
      if (d) return { date: d, rest: s.slice(m[0].length) };
    }
    // MM/DD (no year) — card statements; requires an inferred year
    if (opts.year) {
      m = /^(\d{1,2})[\/\-.](\d{1,2})\s+/.exec(s);
      if (m) {
        const d = order === 'dmy' ? mkDate(opts.year, +m[2], +m[1]) : mkDate(opts.year, +m[1], +m[2]);
        if (d) return { date: d, rest: s.slice(m[0].length) };
      }
    }
    return null;
  }

  // ---------- normalization ----------
  function normalizeText(raw) {
    let s = String(raw || '');
    s = s.replace(/\r\n?/g, '\n');
    s = s.replace(/\u00a0/g, ' ');
    s = s.replace(/[\u2012\u2013\u2014\u2212]/g, '-');
    s = s.replace(/[\u2018\u2019]/g, "'");
    s = s.replace(/\u201c|\u201d/g, '"');
    return s;
  }

  const NOISE_RES = [
    /^page\s+\d+(\s+of\s+\d+)?$/i,
    /^continued$/i,
    /^\d+$/,
    /^-+$/, /^_+$/, /^=+$/,
    /^member\s+(fdic|ncua)\b/i,
    /^total[s]?\b/i
  ];
  function isNoise(line) { return NOISE_RES.some(function (re) { return re.test(line.trim()); }); }

  // ---------- profiles ----------
  // Generic transaction line: [date] [second date] desc... amount [balance]
  // ctx: {order:'mdy'|'dmy', year?:number}
  function trailingTxn(line, ctx) {
    const t = takeDate(line, ctx.order, ctx);
    if (!t) return null;
    let rest = t.rest.trim();
    const t2 = takeDate(rest, ctx.order, ctx);
    if (t2) rest = t2.rest.trim();
    const amounts = takeTrailingAmounts(rest);
    if (!amounts) return null;
    // description = tokens before the trailing money tokens.
    // parseAmountToken rejects bare integers, so check numbers ("NO 1234") are safe.
    const toks = rest.split(/\s+/);
    let n = 0;
    while (n < toks.length && parseAmountToken(toks[toks.length - 1 - n]) != null) n++;
    if (n === 0) return null;
    const desc = toks.slice(0, toks.length - n).join(' ').replace(/\s{2,}/g, ' ').trim();
    if (!desc || !/[A-Za-z0-9]/.test(desc)) return null;
    const amount = amounts[0];
    const balance = amounts.length > 1 ? amounts[amounts.length - 1] : null;
    return { date: t.date, desc: desc, amount: amount, balance: balance };
  }

  const AMT = '(-?\\(?[\\d,]+\\.\\d{2}\\)?-?)';

  const PROFILES = [
    {
      id: 'us-generic', name: 'US-style statement (MM/DD/YYYY)', order: 'mdy', hasBal: true,
      opening: /^(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s+)?(?:beginning|opening|previous)\s+balance\b[^\d\-]*(-?[\d,]+\.\d{2})/i,
      closing: /^(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\s+)?(?:ending|closing)\s+balance\b[^\d\-]*(-?[\d,]+\.\d{2})/i,
      openingAlt: /balance\s*(?:b\/f|brought\s*forward)[^\d\-]*(-?[\d,]+\.\d{2})/i,
      closingAlt: /balance\s*(?:c\/f|carried\s*forward)[^\d\-]*(-?[\d,]+\.\d{2})/i,
      period: /statement\s+period[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\s*(?:to|through|thru|-|–)\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      match: trailingTxn
    },
    {
      id: 'uk-generic', name: 'UK-style statement (DD/MM/YYYY)', order: 'dmy', hasBal: true,
      opening: /balance\s*(?:b\/f|brought\s*forward)[^\d\-]*(-?[\d,]+\.\d{2})/i,
      closing: /balance\s*(?:c\/f|carried\s*forward)[^\d\-]*(-?[\d,]+\.\d{2})/i,
      openingAlt: /^(?:opening|previous|beginning)\s+balance\b[^\d\-]*(-?[\d,]+\.\d{2})/i,
      closingAlt: /^(?:closing|ending)\s+balance\b[^\d\-]*(-?[\d,]+\.\d{2})/i,
      period: /statement\s+(?:period|date)[:\s]+(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
      match: trailingTxn
    }
  ];

  function findPeriodYear(lines, profile) {
    for (let i = 0; i < Math.min(lines.length, 60); i++) {
      const m = profile.period ? profile.period.exec(lines[i]) : null;
      if (m) {
        const g = m[2] ? m[2] : m[1];
        const t = takeDate(g + ' ', profile.order, {});
        if (t) return t.date.y;
      }
      const mm = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i.exec(lines[i]);
      if (mm) return +mm[2];
    }
    return null;
  }

  function findOpenClose(lines, profile) {
    let opening = null, closing = null;
    for (const ln of lines) {
      const l = ln.trim();
      if (opening == null && profile.opening) { const m = profile.opening.exec(l); if (m) opening = parseAmountToken(m[1]); }
      if (opening == null && profile.openingAlt) { const m = profile.openingAlt.exec(l); if (m) opening = parseAmountToken(m[1]); }
      if (closing == null && profile.closing) { const m = profile.closing.exec(l); if (m) closing = parseAmountToken(m[1]); }
      if (closing == null && profile.closingAlt) { const m = profile.closingAlt.exec(l); if (m) closing = parseAmountToken(m[1]); }
    }
    return { opening: opening, closing: closing };
  }

  const HEADER_RE = /^(date|description|amount|balance|details|money\s+in|money\s+out|paid\s+in|paid\s+out|withdrawals|deposits|debit|credit|type|ref(?:erence)?|transaction|check\s+no|serial)\b/i;

  function cmpDate(a, b) { return (a.y - b.y) || (a.m - b.m) || (a.d - b.d); }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  // Verify rows against opening balance (if given) or consecutive balance deltas.
  // Mutates rows (flags/review). Returns {verified, reconciled, mismatched}.
  function verifyRows(rows, opening) {
    let reconciled = 0, mismatched = 0;
    const hasBalances = rows.length > 0 && rows.every(function (r) { return r.balance != null; });
    if (!hasBalances) return { verified: null, reconciled: 0, mismatched: 0, checked: false };
    if (opening != null) {
      let bal = opening;
      for (const r of rows) {
        bal = round2(bal + r.amount);
        if (Math.abs(bal - r.balance) > 0.011) { mismatched++; r.flags.push('balance-mismatch'); r.review = true; }
        else { reconciled++; bal = r.balance; }
      }
    } else {
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1].balance, cur = rows[i].balance;
        if (Math.abs(round2(prev + rows[i].amount) - cur) > 0.011) { mismatched++; rows[i].flags.push('balance-mismatch'); rows[i].review = true; }
        else reconciled++;
      }
    }
    return { verified: mismatched === 0, reconciled: reconciled, mismatched: mismatched, checked: true };
  }

  function parseRows(lines, p, year, invert) {
    const ctx = { order: p.order, year: year };
    const rows = [], unparsed = [];
    let prevTxn = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isNoise(line)) continue;
      const t = line.trim();
      if (p.opening && p.opening.test(t)) continue;
      if (p.openingAlt && p.openingAlt.test(t)) continue;
      if (p.closing && p.closing.test(t)) continue;
      if (p.closingAlt && p.closingAlt.test(t)) continue;
      if (HEADER_RE.test(t) && !/\d{1,2}[\/\-.]\d{1,2}/.test(t)) continue;
      const m = p.match(t, ctx);
      if (m) {
        const row = {
          date: m.date,
          desc: m.desc,
          amount: invert ? -m.amount : m.amount,
          // balance column is never flipped: statements that print debits as
          // positive still carry a normal running balance
          balance: m.balance != null ? m.balance : null,
          flags: [], review: false
        };
        rows.push(row);
        prevTxn = row;
      } else if (
        prevTxn && !takeDate(t, p.order, ctx) && takeTrailingAmounts(t) == null &&
        t.length <= 60 && /[A-Za-z]/.test(t) && !HEADER_RE.test(t)
      ) {
        prevTxn.desc = (prevTxn.desc + ' ' + t).slice(0, 120);
      } else {
        unparsed.push(t);
      }
    }
    for (let i = 1; i < rows.length; i++) {
      if (cmpDate(rows[i].date, rows[i - 1].date) < 0) { rows[i].flags.push('date-out-of-order'); rows[i].review = true; }
    }
    for (const r of rows) {
      if (r.amount === 0) { r.flags.push('zero-amount'); r.review = true; }
    }
    return { rows: rows, unparsed: unparsed };
  }

  // parseStatement(rawText, opts) -> result
  // Tries every (profile, sign-convention) combination and keeps the one whose
  // parsed rows are most plausible AND reconcile against the running balance.
  function parseStatement(rawText, opts) {
    opts = opts || {};
    const text = normalizeText(rawText);
    const lines = text.split('\n').map(function (l) { return l.trim(); }).filter(function (l) { return l.length > 0; });

    let best = null;
    for (const p of PROFILES) {
      for (const invert of [false, true]) {
        const year = findPeriodYear(lines, p);
        const oc = findOpenClose(lines, p);
        const pr = parseRows(lines, p, year, invert);
        const ver = verifyRows(pr.rows, oc.opening);
        const score =
          pr.rows.length *
          (p.hasBal ? 1.1 : 1) *
          (oc.opening != null || oc.closing != null ? 1.2 : 1) *
          (ver.verified === true ? 1.35 : ver.verified === false ? 0.85 : 1);
        if (!best || score > best.score) {
          best = { profile: p, score: score, rows: pr.rows, unparsed: pr.unparsed, year: year, oc: oc, invert: invert, ver: ver };
        }
      }
    }
    if (!best || best.rows.length === 0) {
      return {
        profile: null, rows: [], opening: null, closing: null, verified: null,
        reconciled: 0, mismatched: 0, unparsed: lines, periodYear: null,
        warnings: ['No recognizable transaction lines were found. If this is a scanned/image PDF, text extraction is not possible — this tool works on text-based PDFs only.'],
        totals: { credits: 0, debits: 0, net: 0 }
      };
    }

    const p = best.profile, rows = best.rows, oc = best.oc, unparsed = best.unparsed, ver = best.ver;
    const warnings = [];
    if (!ver.checked) {
      warnings.push('No running-balance column detected, so automatic reconciliation is not possible for this statement. Double-check rows before exporting.');
    } else if (ver.verified === false && ver.mismatched > rows.length * 0.6) {
      warnings.push('Most rows fail reconciliation. If the bank prints debits as positive numbers, this may be a scanned or unusual layout — review rows carefully.');
    } else if (ver.verified === false) {
      warnings.push('Some rows do not reconcile with the running balance — review the highlighted rows before exporting.');
    }

    const credits = round2(rows.reduce(function (a, r) { return a + (r.amount > 0 ? r.amount : 0); }, 0));
    const debits = round2(rows.reduce(function (a, r) { return a + (r.amount < 0 ? r.amount : 0); }, 0));

    return {
      profile: p, rows: rows, opening: oc.opening, closing: oc.closing,
      verified: ver.checked ? ver.verified : null,
      reconciled: ver.reconciled, mismatched: ver.mismatched,
      unparsed: unparsed, periodYear: best.year, warnings: warnings,
      inverted: best.invert,
      totals: { credits: credits, debits: debits, net: round2(credits + debits) }
    };
  }

  const api = {
    parseStatement: parseStatement,
    verifyRows: verifyRows,
    parseAmountToken: parseAmountToken,
    takeTrailingAmounts: takeTrailingAmounts,
    takeDate: takeDate,
    normalizeText: normalizeText,
    _internal: { PROFILES: PROFILES, mkDate: mkDate, round2: round2, trailingTxn: trailingTxn }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BPParser = api;
})(typeof self !== 'undefined' ? self : this);
