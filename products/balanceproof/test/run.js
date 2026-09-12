// BalanceProof unit tests — run with: ../node-portable.exe test/run.js  (from product dir)
'use strict';
const fs = require('fs');
const path = require('path');
const P = require('../js/parser.js');

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}
function eq(a, b, name) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja === jb) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('FAIL  ' + name + '\n      got: ' + ja + '\n      exp: ' + jb); }
}
const fx = (f) => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');

console.log('— amount tokens —');
eq(P.parseAmountToken('1,234.56'), 1234.56, 'thousands+decimal');
eq(P.parseAmountToken('1234.56'), 1234.56, 'plain decimal');
eq(P.parseAmountToken('-5.40'), -5.4, 'negative');
eq(P.parseAmountToken('(25.00)'), -25, 'parens negative');
eq(P.parseAmountToken('45.00-'), -45, 'trailing minus');
eq(P.parseAmountToken('1,250.00CR'), 1250, 'CR positive');
eq(P.parseAmountToken('1,250.00DR'), -1250, 'DR negative');
eq(P.parseAmountToken('$994.60'), 994.6, 'currency symbol');
eq(P.parseAmountToken('1234,56'), 1234.56, 'EU decimal comma');
eq(P.parseAmountToken('1001'), null, 'bare integer rejected');
eq(P.parseAmountToken('ABC'), null, 'garbage rejected');
eq(P.parseAmountToken('12.34'), 12.34, 'no thousands separator');

console.log('— dates —');
eq(P.takeDate('03/01/2024 DESC 1.00 2.00', 'mdy', {}).date.iso, '2024-03-01', 'mdy 4-digit');
eq(P.takeDate('03/01/24 DESC', 'mdy', {}).date.iso, '2024-03-01', 'mdy 2-digit year');
eq(P.takeDate('01/03/2024 DESC', 'dmy', {}).date.iso, '2024-03-01', 'dmy 1 Mar not Jan 3');
eq(P.takeDate('01 Mar 2024 DESC', 'dmy', {}).date.iso, '2024-03-01', 'day-month-name');
eq(P.takeDate('Mar 01 2024 DESC', 'mdy', {}).date.iso, '2024-03-01', 'month-name-day');
eq(P.takeDate('03/01 TACO', 'mdy', { year: 2024 }).date.iso, '2024-03-01', 'MM/DD with inferred year');
eq(P.takeDate('03/01 TACO', 'mdy', {}), null, 'MM/DD without year rejected');

console.log('— fixture: US checking —');
{
  const r = P.parseStatement(fx('us_checking.txt'));
  eq(r.rows.length, 7, 'row count');
  eq(r.rows[0].date.iso, '2024-03-01', 'first date');
  eq(r.rows[0].amount, -5.4, 'first amount');
  eq(r.rows[0].balance, 994.6, 'first balance');
  eq(r.rows[1].amount, 2500.0, 'payroll amount');
  eq(r.rows[4].desc, 'GROCERY MART PURCHASE LOYALTY DISCOUNT APPLIED', 'description kept');
  ok(r.profile && r.profile.id === 'us-generic', 'profile us-generic', r.profile && r.profile.id);
  eq(r.opening, 1000.0, 'opening balance');
  eq(r.closing, 1875.36, 'closing balance');
  eq(r.verified, true, 'verified true');
  eq(r.mismatched, 0, 'no mismatches');
  ok(r.unparsed.every(l => !/DEBIT CARD PURCHASE/.test(l)), 'no transaction leaked to unparsed');
}

console.log('— fixture: UK current —');
{
  const r = P.parseStatement(fx('uk_current.txt'));
  eq(r.rows.length, 5, 'row count (C/F lines excluded)');
  eq(r.rows[0].date.iso, '2024-03-01', '1 Mar parsed as dmy/name');
  eq(r.rows[2].amount, 2400.0, 'salary amount');
  eq(r.opening, 1000.0, 'B/F opening');
  eq(r.closing, 2451.54, 'C/F closing');
  eq(r.verified, true, 'verified true');
  ok(!r.rows.some(x => /Balance C\/F/i.test(x.desc)), 'no Balance C/F ghost row');
}

console.log('— fixture: card, no balance column —');
{
  const r = P.parseStatement(fx('card_nobalance.txt'));
  eq(r.rows.length, 5, 'row count');
  eq(r.rows[0].amount, 12.34, 'plain charge');
  eq(r.rows[2].amount, -100.0, 'payment negative');
  eq(r.rows[3].amount, -15.99, 'parens charge');
  eq(r.rows[4].amount, -4.5, 'trailing-minus charge');
  eq(r.verified, null, 'verification impossible');
  ok(r.warnings.some(w => /no running-balance/i.test(w)), 'warning about no balance');
}

console.log('— fixture: business CR/DR/parens —');
{
  const r = P.parseStatement(fx('business_crdramt.txt'));
  eq(r.rows.length, 3, 'row count');
  eq(r.rows[0].amount, -25, 'wire fee parens');
  eq(r.rows[1].amount, -45, 'check trailing minus');
  eq(r.rows[2].amount, 1250, 'invoice CR');
  eq(r.verified, true, 'verified true');
}

console.log('— hostile input —');
{
  const r = P.parseStatement('');
  eq(r.rows.length, 0, 'empty input no crash');
  ok(r.warnings.length > 0, 'empty input warning');
  const r2 = P.parseStatement('random words\nnothing here\n12345');
  eq(r2.rows.length, 0, 'garbage input no rows');
  const r3 = P.parseStatement('03/01/2024 DESC 1.00 99.00\n03/02/2024 DESC 5.00 999.00\n');
  ok(r3.verified === false, 'deliberately broken balances flagged');
  // debits printed as positive: auto sign-convention detection should flip
  const r4 = P.parseStatement(
    'Beginning balance $1,000.00\n' +
    '03/01/2024 STORE A 10.00 $990.00\n' +
    '03/02/2024 STORE B 20.00 $970.00\n' +
    'Ending balance $970.00\n');
  eq(r4.rows[0].amount, -10.0, 'auto-inverted debit printed positive');
  eq(r4.verified, true, 'auto-invert verified');
  eq(r4.inverted, true, 'inverted flag set');
}

console.log('— exporters —');
{
  const E = require('../js/exporters.js');
  const rows = [
    { date: { y: 2024, m: 3, d: 1, iso: '2024-03-01' }, desc: 'STARBUCKS, "SEATTLE"', amount: -5.4, balance: 994.6 },
    { date: { y: 2024, m: 3, d: 2, iso: '2024-03-02' }, desc: 'PAYROLL', amount: 2500, balance: 3494.6 }
  ];
  const csv = E.toCSV(rows, { includeBalance: true });
  ok(csv.split('\r\n')[1].includes('"STARBUCKS, ""SEATTLE"""'), 'csv quoting');
  ok(csv.split('\r\n')[1].endsWith('-5.40,994.60'), 'csv amounts');
  const qboCsv = E.toQBOCSV(rows, {});
  ok(qboCsv.split('\r\n')[1] === '03/01/2024,"STARBUCKS, ""SEATTLE""",-5.40', 'qbo csv mdy + quoting');
  const xero = E.toXeroCSV(rows, {});
  ok(xero.split('\r\n')[1].startsWith('01/03/2024,-5.40,"STARBUCKS'), 'xero dmy + quoting');
  const qbo = E.toQBO(rows, {});
  ok(qbo.startsWith('OFXHEADER:100'), 'qbo sgml header');
  ok(qbo.includes('<TRNTYPE>DEBIT') && qbo.includes('<TRNAMT>-5.40'), 'qbo debit rows');
  ok(qbo.includes('<TRNTYPE>CREDIT') && qbo.includes('<TRNAMT>2500.00'), 'qbo credit rows');
  ok(qbo.includes('<NAME>STARBUCKS'), 'qbo name');
  ok(/<FITID>BP[0-9A-F]+0000/.test(qbo), 'qbo fitid');
  const ofx2 = E.toOFX2(rows, {});
  ok(ofx2.startsWith('<?xml'), 'ofx2 xml header');
  ok(ofx2.includes('VERSION="211"'), 'ofx2 version');
  const j = E.toJSON(rows);
  const parsed = JSON.parse(j);
  eq(parsed[0].amount, -5.4, 'json amount');
  eq(parsed[0].date, '2024-03-01', 'json date');
  ok(!/\r|\n/.test(E.toCSV([{ date: { y: 2024, m: 1, d: 1, iso: '2024-01-01' }, desc: 'A\nB', amount: 1 }]).split('\r\n')[1]), 'newline stripped from desc');
  const nonAscii = E.toQBO([{ date: { y: 2024, m: 1, d: 1, iso: '2024-01-01' }, desc: 'CAFÉ £5', amount: -5 }], {});
  ok(nonAscii.includes('CAF&#201;'), 'sgml non-ascii entity');
  // deterministic fitid across runs (dedupe support)
  ok(E._internal.fitid(rows[0], 0) === E._internal.fitid(rows[0], 0), 'fitid deterministic');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
