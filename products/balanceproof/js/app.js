/* BalanceProof — UI controller. Only this file touches the DOM.
 * Free tier: statements up to 3 pages, CSV/JSON export.
 * Pro (offline license): unlimited pages, QBO/OFX/Xero exports.
 */
(function () {
  'use strict';

  var P = window.BPParser, E = window.BPExport, L = window.BPLicense;
  var FREE_PAGE_LIMIT = 3;
  var LS_KEY = 'bp_pro_license_v1';

  // ---------- state ----------
  var state = {
    fileName: null,
    rows: [],        // {date:{y,m,d,iso}|null, desc, amount, balance, flags:[], review, _deleted}
    opening: null,
    closing: null,
    verified: null,
    reconciled: 0,
    mismatched: 0,
    unparsed: [],
    inverted: false,
    pageCount: 0,
    lockedPages: 0,
    pro: false
  };

  // ---------- dom ----------
  var $ = function (id) { return document.getElementById(id); };
  var dz = $('dropzone'), fileInput = $('file-input'), statusEl = $('status');
  var resultEl = $('result'), txnBody = $('txn-body'), badgeEl = $('verify-badge');
  var metaEl = $('result-meta'), warningsEl = $('warnings');
  var unparsedSummary = $('unparsed-summary'), unparsedList = $('unparsed-list');
  var lockedEl = $('locked'), licenseInput = $('license-input'), licenseStatus = $('license-status');

  // ---------- pdf.js boot ----------
  var PDF_READY = (function () {
    if (!window.pdfjsLib) return Promise.reject(new Error('no-pdfjs'));
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
    return Promise.resolve();
  })();

  // ---------- helpers ----------
  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }

  function setStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle('error', !!isError);
    if (msg) show(statusEl); else hide(statusEl);
  }

  function fmtMoney(n) {
    return (n < 0 ? '−' : '') + Math.abs(Number(n) || 0).toFixed(2);
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  function baseName() { return (state.fileName || 'statement').replace(/\.pdf$/i, ''); }

  // Rebuild text lines from pdf.js text items (group by y, order by x)
  function itemsToLines(items) {
    var lines = [];
    var LINE_TOL = 2.5;
    items.forEach(function (it) {
      if (!it.str) return;
      var y = it.transform[5], x = it.transform[4];
      var line = null;
      for (var i = lines.length - 1; i >= 0 && i >= lines.length - 3; i--) {
        if (Math.abs(lines[i].y - y) <= LINE_TOL) { line = lines[i]; break; }
      }
      if (!line) { line = { y: y, items: [] }; lines.push(line); }
      line.items.push({ x: x, str: it.str, w: it.width || 0 });
    });
    lines.sort(function (a, b) { return b.y - a.y; });
    return lines.map(function (line) {
      line.items.sort(function (a, b) { return a.x - b.x; });
      var s = '';
      line.items.forEach(function (it) {
        if (s && !/\s$/.test(s) && !/^\s/.test(it.str)) s += ' ';
        s += it.str;
      });
      return s.replace(/\s{4,}/g, '   ').trim();
    }).filter(function (s) { return s.length; });
  }

  function extractPdf(file, onPage, onDone, onFail) {
    if (!window.pdfjsLib) {
      onFail('The PDF engine failed to load (it comes from a CDN). Check your connection and reload the page.');
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () { onFail('Could not read the file. Try re-saving or re-downloading the PDF.'); };
    reader.onload = function () {
      var typed = new Uint8Array(reader.result);
      PDF_READY.then(function () {
        return window.pdfjsLib.getDocument({ data: typed }).promise;
      }).then(function (pdf) {
        var pages = [];
        var next = function (n) {
          if (n > pdf.numPages) { onDone(pages, pdf.numPages); return; }
          pdf.getPage(n).then(function (page) {
            return page.getTextContent();
          }).then(function (tc) {
            pages.push(itemsToLines(tc.items).join('\n'));
            onPage(n, pdf.numPages);
            next(n + 1);
          }).catch(function (e) { onFail('Failed to read page ' + n + ' of this PDF. ' + (e && e.message ? e.message : '')); });
        };
        next(1);
      }).catch(function (e) {
        if (e && (e.name === 'PasswordException' || /password/i.test(String(e)))) {
          onFail('This PDF is password-protected. Remove the password in your bank\u2019s download dialog or a PDF reader first.');
        } else if (e && e.message === 'no-pdfjs') {
          onFail('The PDF engine failed to load (it comes from a CDN). Check your connection and reload the page.');
        } else {
          onFail('Could not open this file as a PDF. ' + (e && e.message ? e.message : ''));
        }
      });
    };
    reader.readAsArrayBuffer(file);
  }

  // ---------- verification ----------
  function recompute() {
    var rows = activeRows();
    // reset transient flags, then re-apply structural checks
    rows.forEach(function (r) { r.flags = []; r.review = false; });
    for (var i = 1; i < rows.length; i++) {
      if (rows[i].date && rows[i - 1].date && P._internal && cmpIso(rows[i].date, rows[i - 1].date) < 0) {
        rows[i].flags.push('date-out-of-order'); rows[i].review = true;
      }
    }
    rows.forEach(function (r) {
      if (r.amount === 0 || isNaN(r.amount)) { r.flags.push('bad-amount'); r.review = true; }
      if (!r.date) { r.flags.push('bad-date'); r.review = true; }
    });
    var ver = P.verifyRows(rows, state.opening);
    state.verified = ver.checked ? ver.verified : null;
    state.reconciled = ver.reconciled;
    state.mismatched = ver.mismatched;
  }

  function cmpIso(a, b) { return a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0; }

  function activeRows() { return state.rows.filter(function (r) { return !r._deleted; }); }

  function parseDateInput(s) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s || '').trim());
    if (!m) return null;
    return P._internal.mkDate(+m[1], +m[2], +m[3]);
  }

  // ---------- rendering ----------
  function renderBadge() {
    badgeEl.className = 'verify-badge ' + (state.verified === true ? 'ok' : state.verified === false ? 'warn' : 'unknown');
    if (state.verified === true) {
      badgeEl.textContent = '✓ Reconciles — every row checks out';
    } else if (state.verified === false) {
      badgeEl.textContent = '⚠ ' + state.mismatched + ' row' + (state.mismatched === 1 ? '' : 's') + ' don\u2019t reconcile';
    } else {
      badgeEl.textContent = '— No running balance on this statement';
    }
  }

  function renderMeta() {
    var rows = activeRows();
    var credits = 0, debits = 0;
    rows.forEach(function (r) { if (r.amount > 0) credits += r.amount; else debits += r.amount; });
    var t = state.rows.length + ' transaction' + (state.rows.length === 1 ? '' : 's');
    if (state.lockedPages) t += ' (free preview of page 1)';
    var bits = ['Detected: ' + (state.profile || 'unknown layout'), t, 'In: ' + fmtMoney(credits), 'Out: ' + fmtMoney(debits)];
    if (state.opening != null && state.closing != null) bits.push('Opening ' + fmtMoney(state.opening) + ' → Closing ' + fmtMoney(state.closing));
    if (state.inverted) bits.push('signs auto-corrected (debits print positive)');
    metaEl.textContent = bits.join(' · ');
  }

  function renderWarnings() {
    warningsEl.innerHTML = '';
    (state.warnings || []).forEach(function (w) {
      var d = document.createElement('div');
      d.className = 'warning-item';
      d.textContent = w;
      warningsEl.appendChild(d);
    });
    if (state.warnings && state.warnings.length) show(warningsEl); else hide(warningsEl);
  }

  function renderTable() {
    txnBody.innerHTML = '';
    state.rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      if (r._deleted) tr.className = 'deleted';
      else if (r.review) tr.className = 'flagged';

      tr.appendChild(cellDate(r, i));
      tr.appendChild(cellDesc(r, i));
      tr.appendChild(cellAmount(r, i));

      var tdBal = document.createElement('td');
      tdBal.className = 'col-balance';
      tdBal.textContent = r.balance == null ? '' : fmtMoney(r.balance);
      if (r.flags.indexOf('balance-mismatch') >= 0) tdBal.title = 'Does not reconcile with running balance';
      tr.appendChild(tdBal);

      var tdDel = document.createElement('td');
      var del = document.createElement('button');
      del.className = 'row-del';
      del.type = 'button';
      del.title = r._deleted ? 'Restore row' : 'Exclude row from export';
      del.setAttribute('aria-label', del.title);
      del.textContent = r._deleted ? '↩' : '✕';
      del.addEventListener('click', function () {
        r._deleted = !r._deleted;
        recompute(); renderAll();
      });
      tdDel.appendChild(del);
      tr.appendChild(tdDel);

      txnBody.appendChild(tr);
    });
  }

  function cellDate(r, i) {
    var td = document.createElement('td');
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = r.date ? r.date.iso : '';
    inp.setAttribute('aria-label', 'Transaction date, row ' + (i + 1));
    inp.addEventListener('change', function () {
      r.date = parseDateInput(inp.value);
      if (!r.date) inp.value = '';
      recompute(); renderAll();
    });
    td.appendChild(inp);
    return td;
  }

  function cellDesc(r, i) {
    var td = document.createElement('td');
    var inp = document.createElement('input');
    inp.type = 'text';
    inp.value = r.desc || '';
    inp.setAttribute('aria-label', 'Description, row ' + (i + 1));
    inp.addEventListener('change', function () {
      r.desc = inp.value.replace(/\s{2,}/g, ' ').slice(0, 120);
      inp.value = r.desc;
    });
    td.appendChild(inp);
    return td;
  }

  function cellAmount(r, i) {
    var td = document.createElement('td');
    td.className = 'col-amount';
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.step = '0.01';
    inp.value = r.amount;
    inp.setAttribute('aria-label', 'Amount, row ' + (i + 1));
    inp.addEventListener('change', function () {
      var v = parseFloat(inp.value);
      r.amount = isNaN(v) ? 0 : Math.round(v * 100) / 100;
      recompute(); renderAll();
    });
    td.appendChild(inp);
    return td;
  }

  function renderUnparsed() {
    var n = state.unparsed.length;
    unparsedSummary.textContent = 'Lines that were not recognized (' + n + ')';
    unparsedList.textContent = state.unparsed.join('\n') || '(none — everything was parsed)';
  }

  function renderPro() {
    document.querySelectorAll('[data-pro]').forEach(function (btn) {
      btn.classList.toggle('pro-unlocked', state.pro);
    });
    var upgradeLinks = document.querySelectorAll('#locked-upgrade');
    upgradeLinks.forEach(function (b) { b.textContent = state.pro ? 'License active ✓' : 'I have a license — unlock'; });
  }

  function renderAll() {
    renderBadge(); renderMeta(); renderWarnings(); renderTable(); renderUnparsed(); renderPro();
  }

  // ---------- flow ----------
  function handleFile(file) {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setStatus('That\u2019s not a PDF file. Please choose a bank statement PDF.', true);
      return;
    }
    hide(resultEl); hide(lockedEl);
    setStatus('Reading ' + file.name + '…');

    extractPdf(file,
      function (page, total) { setStatus('Extracting text… page ' + page + ' of ' + total); },
      function (pages, numPages) {
        var allText = pages.join('\n');
        if (!allText.trim()) {
          setStatus('No text found in this PDF — it\u2019s probably a scan or photo. BalanceProof works on text-based statement PDFs (the kind you download from online banking).', true);
          return;
        }
        state.fileName = file.name;
        state.pageCount = numPages;
        state.lockedPages = Math.max(0, numPages - FREE_PAGE_LIMIT);
        var parseText = state.lockedPages > 0 ? pages.slice(0, FREE_PAGE_LIMIT).join('\n') : allText;
        applyParse(parseText, state.lockedPages > 0);
      },
      function (msg) { setStatus(msg, true); }
    );
  }

  function applyParse(text, limited) {
    var res = P.parseStatement(text);
    if (!res.rows.length) {
      setStatus('Couldn\u2019t find any transactions in this PDF. ' + (res.warnings[0] || 'Try a different statement or tell us about this layout.') + (limited ? '' : ''), true);
      return;
    }
    state.rows = res.rows;
    state.opening = res.opening;
    state.closing = res.closing;
    state.profile = res.profile ? res.profile.name : null;
    state.inverted = !!res.inverted;
    state.unparsed = res.unparsed;
    state.warnings = res.warnings.slice();
    recompute();
    if (limited) {
      // free preview: keep the informational status visible
      setStatus('Free preview: showing transactions from the first ' + FREE_PAGE_LIMIT + ' of ' + state.pageCount + ' pages.', false);
    } else {
      setStatus('');
      hide(statusEl);
    }
    renderAll();
    show(resultEl);
    if (state.lockedPages > 0) show(lockedEl);
    resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- exports ----------
  function exportRows() { return activeRows(); }

  function doExport(kind) {
    if (!state.rows.length) return;
    if (kind !== 'csv' && kind !== 'json' && !state.pro) {
      openLicensePanel('This export format needs Pro.');
      return;
    }
    var df = $('opt-datefmt').value;
    var cur = $('opt-currency').value;
    var rows = exportRows();
    var base = baseName();
    try {
      if (kind === 'csv') download(base + '.csv', E.toCSV(rows, { dateFormat: df, includeBalance: true }), 'text/csv;charset=utf-8');
      else if (kind === 'json') download(base + '.json', E.toJSON(rows), 'application/json');
      else if (kind === 'xero') download(base + '-xero.csv', E.toXeroCSV(rows, { dateFormat: df === 'iso' ? 'dmy' : df }), 'text/csv;charset=utf-8');
      else if (kind === 'qbocsv') download(base + '-quickbooks.csv', E.toQBOCSV(rows, { dateFormat: df === 'iso' ? 'mdy' : df }), 'text/csv;charset=utf-8');
      else if (kind === 'qbo') download(base + '.qbo', E.toQBO(rows, { currency: cur }), 'application/octet-stream');
      else if (kind === 'ofx') download(base + '.ofx', E.toOFX2(rows, { currency: cur }), 'application/octet-stream');
    } catch (e) {
      setStatus('Export failed: ' + (e && e.message ? e.message : e), true);
    }
  }

  // ---------- license ----------
  function setPro(on) { state.pro = !!on; renderPro(); }

  function openLicensePanel(note) {
    show(document.getElementById('pricing'));
    if (note) {
      licenseStatus.textContent = note;
      licenseStatus.className = 'license-status err';
    }
    document.getElementById('license-panel').scrollIntoView({ behavior: 'smooth', block: 'center' });
    licenseInput.focus();
  }

  function tryVerify() {
    var key = licenseInput.value.trim();
    if (!key) { licenseStatus.textContent = 'Paste your license key first.'; licenseStatus.className = 'license-status err'; return; }
    licenseStatus.textContent = 'Checking…';
    licenseStatus.className = 'license-status';
    L.verifyLicense(key).then(function (res) {
      if (res.ok) {
        try { localStorage.setItem(LS_KEY, key); } catch (e) { /* private mode */ }
        setPro(true);
        licenseStatus.textContent = '✓ Pro unlocked' + (res.email ? ' — licensed to ' + res.email : '');
        licenseStatus.className = 'license-status ok';
        hide(lockedEl);
      } else {
        licenseStatus.textContent = res.reason || 'Verification failed.';
        licenseStatus.className = 'license-status err';
      }
    });
  }

  function restoreLicense() {
    var key = null;
    try { key = localStorage.getItem(LS_KEY); } catch (e) { return; }
    if (!key) return;
    L.verifyLicense(key).then(function (res) {
      if (res.ok) {
        setPro(true);
        licenseStatus.textContent = '✓ Pro unlocked' + (res.email ? ' — licensed to ' + res.email : '');
        licenseStatus.className = 'license-status ok';
      } else {
        try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
      }
    });
  }

  // ---------- events ----------
  dz.addEventListener('click', function () { fileInput.click(); });
  dz.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  ['dragover', 'dragenter'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove('dragover'); });
  });
  dz.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(f);
  });
  fileInput.addEventListener('change', function () {
    handleFile(fileInput.files[0]);
    fileInput.value = '';
  });

  document.querySelectorAll('[data-export]').forEach(function (btn) {
    btn.addEventListener('click', function () { doExport(btn.getAttribute('data-export')); });
  });

  $('license-verify').addEventListener('click', tryVerify);
  licenseInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryVerify(); });
  $('locked-upgrade').addEventListener('click', function () {
    if (state.pro) { hide(lockedEl); return; }
    openLicensePanel('');
  });
  $('locked-continue').addEventListener('click', function () { hide(lockedEl); });

  restoreLicense();

  // Test seam for automated QA: inject a File and run the same pipeline as the
  // file picker. Client-side anyway — no special capability granted.
  window.__bpInjectFile = handleFile;
})();
