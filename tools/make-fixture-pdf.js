// Generate simple text-based PDF fixtures from test/fixtures/*.txt
// Usage: ./node-portable.exe tools/make-fixture-pdf.js  (from factory root)
// These PDFs are used for browser QA of the full pdf.js extraction path.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FXDIR = path.join(ROOT, 'products', 'balanceproof', 'test', 'fixtures');

function esc(s) { return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }

function buildPdf(lines) {
  const pageH = 792, margin = 56, lineH = 12;
  const maxLines = Math.floor((pageH - 2 * margin) / lineH);
  const chunks = [];
  for (let i = 0; i < lines.length; i += maxLines) {
    const slice = lines.slice(i, i + maxLines);
    let s = 'BT /F1 9 Tf ' + lineH + ' TL ' + margin + ' ' + (pageH - margin) + ' Td\n';
    slice.forEach(function (ln, k) {
      if (k > 0) s += 'T*\n';
      s += '(' + esc(ln) + ') Tj\n';
    });
    s += 'ET';
    chunks.push(s);
  }

  const pageNum = 3;
  const fontNum = pageNum + chunks.length * 2;
  const objList = [
    [1, '<< /Type /Catalog /Pages 2 0 R >>'],
    [2, '<< /Type /Pages /Kids [' +
      chunks.map(function (_, i) { return (pageNum + 2 * i) + ' 0 R'; }).join(' ') + '] /Count ' + chunks.length + ' >>']
  ];
  chunks.forEach(function (content, i) {
    const n = pageNum + 2 * i;
    objList.push([n, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ' + pageH + '] /Contents ' + (n + 1) + ' 0 R /Resources << /Font << /F1 ' + fontNum + ' 0 R >> >> >>']);
    objList.push([n + 1, '<< /Length ' + Buffer.byteLength(content) + ' >>\nstream\n' + content + '\nendstream']);
  });
  objList.push([fontNum, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>']);
  objList.sort(function (a, b) { return a[0] - b[0]; });

  let out = '%PDF-1.4\n%BalanceProof fixture\n';
  let bodyStr = '';
  objList.forEach(function (pair) {
    pair[2] = out.length + bodyStr.length;
    bodyStr += pair[0] + ' 0 obj\n' + pair[1] + '\nendobj\n';
  });
  const xrefStart = out.length + bodyStr.length;
  const maxObj = objList[objList.length - 1][0];
  let xref = 'xref\n0 ' + (maxObj + 1) + '\n0000000000 65535 f \n';
  const byNum = {};
  objList.forEach(function (p) { byNum[p[0]] = p; });
  for (let n = 1; n <= maxObj; n++) {
    xref += String(byNum[n][2]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = 'trailer\n<< /Size ' + (maxObj + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n';
  return out + bodyStr + xref + trailer;
}

['us_checking.txt', 'uk_current.txt', 'card_nobalance.txt', 'business_crdramt.txt'].forEach(function (f) {
  const text = fs.readFileSync(path.join(FXDIR, f), 'utf8');
  const lines = text.split('\n').filter(function (l) { return l.trim().length; });
  const pdf = buildPdf(lines);
  const out = path.join(FXDIR, f.replace(/\.txt$/, '.pdf'));
  fs.writeFileSync(out, pdf, 'binary');
  console.log('wrote', out, pdf.length, 'bytes');
});
