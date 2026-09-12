/* BalanceProof — export formats. Pure functions, no DOM.
 * All exporters take rows: [{date:{iso}, desc, amount, balance}]
 */
(function (root) {
  'use strict';

  function pad(n, w) { return String(n).padStart(w, '0'); }

  function fmtDate(d, format) {
    if (!d) return '';
    if (format === 'dmy') return pad(d.d, 2) + '/' + pad(d.m, 2) + '/' + pad(d.y, 4);
    if (format === 'mdy') return pad(d.m, 2) + '/' + pad(d.d, 2) + '/' + pad(d.y, 4);
    return d.iso;
  }

  function fmtAmt(n) { return Number(n).toFixed(2); }

  // RFC4180 field escaping
  function csvField(s) {
    s = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim();
    if (/[",]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  // deterministic id so re-imports of the same rows dedupe in accounting tools
  function fitid(r, i) {
    const s = (r.date ? r.date.iso : '') + '|' + fmtAmt(r.amount) + '|' + (r.desc || '') + '|' + (r.balance == null ? '' : fmtAmt(r.balance));
    let h = 5381;
    for (let k = 0; k < s.length; k++) h = ((h << 5) + h + s.charCodeAt(k)) >>> 0;
    return 'BP' + h.toString(16).toUpperCase() + pad(i, 4);
  }

  function sanitize(s, max) {
    let out = String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').trim();
    if (max) out = out.slice(0, max);
    return out;
  }

  // ---------- CSV variants ----------

  // Generic: Date, Description, Amount, [Balance]
  function toCSV(rows, opts) {
    opts = opts || {};
    const head = ['Date', 'Description', 'Amount'];
    if (opts.includeBalance) head.push('Balance');
    const lines = [head.join(',')];
    for (const r of rows) {
      const f = [csvField(fmtDate(r.date, opts.dateFormat)), csvField(r.desc), fmtAmt(r.amount)];
      if (opts.includeBalance) f.push(r.balance == null ? '' : fmtAmt(r.balance));
      lines.push(f.join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }

  // Xero bank statement CSV: Date,Amount,Payee,Description,Reference
  function toXeroCSV(rows, opts) {
    opts = opts || {};
    const lines = ['Date,Amount,Payee,Description,Reference'];
    for (const r of rows) {
      lines.push([
        csvField(fmtDate(r.date, opts.dateFormat || 'dmy')),
        fmtAmt(r.amount),
        csvField(sanitize(r.desc, 50)),
        csvField(''),
        csvField('')
      ].join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }

  // QuickBooks Online "3-column" bank transactions CSV
  function toQBOCSV(rows, opts) {
    opts = opts || {};
    const lines = ['Date,Description,Amount'];
    for (const r of rows) {
      lines.push([csvField(fmtDate(r.date, opts.dateFormat || 'mdy')), csvField(r.desc), fmtAmt(r.amount)].join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }

  // ---------- OFX ----------

  // SGML entity escape for non-ASCII (QBO/OFX USASCII+1252 header)
  function sgmlEsc(s) {
    let out = '';
    for (const ch of String(s)) {
      const c = ch.codePointAt(0);
      if (c < 128) out += ch;
      else out += '&#' + c + ';';
    }
    return out.replace(/&(?![#0-9])/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ofxDate(d) { return d ? d.y + pad(d.m, 2) + pad(d.d, 2) + '120000' : ''; }

  function ofxTransactions(rows) {
    return rows.map(function (r, i) {
      const type = r.amount < 0 ? 'DEBIT' : 'CREDIT';
      return '<STMTTRN>' +
        '<TRNTYPE>' + type +
        '<DTPOSTED>' + ofxDate(r.date) +
        '<TRNAMT>' + fmtAmt(r.amount) +
        '<FITID>' + fitid(r, i) +
        '<NAME>' + sgmlEsc(sanitize(r.desc, 96)) +
        '<MEMO>' + sgmlEsc(sanitize(r.desc, 255));
    }).join('\n');
  }

  function ofxHeader() {
    return [
      'OFXHEADER:100',
      'DATA:OFXSGML',
      'VERSION:102',
      'SECURITY:NONE',
      'ENCODING:USASCII',
      'CHARSET:1252',
      'COMPRESSION:NONE',
      'OLDFILEUID:NONE',
      'NEWFILEUID:NONE',
      ''
    ].join('\n');
  }

  // QuickBooks Desktop .qbo (OFX 1.02 SGML)
  function toQBO(rows, opts) {
    opts = opts || {};
    const currency = opts.currency || 'USD';
    const bankId = (opts.bankId || '000000000').replace(/\D/g, '').slice(0, 9) || '000000000';
    const acctId = (opts.accountId || 'BALANCEPROOF').replace(/[^A-Za-z0-9\-]/g, '').slice(0, 22);
    const dates = rows.map(function (r) { return r.date; }).filter(Boolean).sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
    const start = dates.length ? ofxDate(dates[0]) : ofxDate({ y: 2000, m: 1, d: 1 });
    const end = dates.length ? ofxDate(dates[dates.length - 1]) : start;
    return ofxHeader() +
      '<OFX>\n' +
      '<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n' +
      '<STATUS>\n<CODE>0\n<SEVERITY>INFO\n</STATUS>\n' +
      '<STMTRS>\n<CURDEF>' + currency + '\n' +
      '<BANKACCTFROM>\n<BANKID>' + bankId + '\n<ACCTID>' + acctId + '\n<ACCTTYPE>CHECKING\n</BANKACCTFROM>\n' +
      '<BANKTRANLIST>\n<DTSTART>' + start + '\n<DTEND>' + end + '\n' +
      ofxTransactions(rows) + '\n' +
      '</BANKTRANLIST>\n' +
      '</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n';
  }

  // OFX 2.x XML (Moneydance, GnuCash, modern tools)
  function toOFX2(rows, opts) {
    opts = opts || {};
    const currency = opts.currency || 'USD';
    const dates = rows.map(function (r) { return r.date; }).filter(Boolean).sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });
    const start = dates.length ? ofxDate(dates[0]) : ofxDate({ y: 2000, m: 1, d: 1 });
    const end = dates.length ? ofxDate(dates[dates.length - 1]) : start;
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>\n' +
      '<OFX>\n<BANKMSGSRSV1>\n<STMTTRNRS>\n<TRNUID>1\n' +
      '<STATUS><CODE>0</CODE><SEVERITY>INFO</SEVERITY></STATUS>\n' +
      '<STMTRS><CURDEF>' + currency + '</CURDEF>\n' +
      '<BANKTRANLIST><DTSTART>' + start + '</DTSTART><DTEND>' + end + '</DTEND>\n' +
      ofxTransactions(rows) + '\n' +
      '</BANKTRANLIST>\n' +
      '</STMTRS>\n</STMTTRNRS>\n</BANKMSGSRSV1>\n</OFX>\n';
  }

  function toJSON(rows) {
    return JSON.stringify(rows.map(function (r) {
      return { date: r.date ? r.date.iso : null, description: r.desc, amount: Number(fmtAmt(r.amount)), balance: r.balance == null ? null : Number(fmtAmt(r.balance)) };
    }), null, 2) + '\n';
  }

  const api = {
    toCSV: toCSV, toXeroCSV: toXeroCSV, toQBOCSV: toQBOCSV,
    toQBO: toQBO, toOFX2: toOFX2, toJSON: toJSON,
    _internal: { fitid: fitid, csvField: csvField, sgmlEsc: sgmlEsc, fmtDate: fmtDate }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BPExport = api;
})(typeof self !== 'undefined' ? self : this);
