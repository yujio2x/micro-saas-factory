/* BalanceProof — offline Pro license verification.
 *
 * Key format: BP1.<payload_b64url>.<sig_b64url>
 * payload: JSON {v:1, t:"pro", e:"email", i:issued_unix}
 * Signature: ECDSA P-256 / SHA-256 over the payload_b64url ASCII bytes.
 * The public key below is the ONLY thing in the app — verification is
 * fully offline via WebCrypto. The signing key lives with the product owner.
 */
(function (root) {
  'use strict';

  var PUBLIC_KEY_SPKI_B64 = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEz4FZCVJfnS0drXxkgGRNPrQya+hravInvfwUbkmHXBrluvT3/Pqi8iOMiB7UG0L7I23vHRbPFBt/GZxXMrFHnQ==';

  function b64urlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atobUniversal(s);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function atobUniversal(s) {
    if (typeof atob === 'function') return atob(s);
    return Buffer.from(s, 'base64').toString('binary');
  }

  function decodeJson(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    try { return JSON.parse(decodeURIComponent(escape(s))); } catch (e) { return null; }
  }

  // verify(licenseString) -> Promise<{ok:bool, tier?:'pro', email?:string, reason?:string}>
  function verifyLicense(key) {
    key = String(key || '').trim();
    var fail = function (reason) { return Promise.resolve({ ok: false, reason: reason }); };
    if (!/^BP1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return fail('That does not look like a BalanceProof license key.');
    var parts = key.split('.');
    var payloadB64 = parts[1], sigB64 = parts[2];

    var cryptoObj = (typeof crypto !== 'undefined' && crypto.subtle) ? crypto :
      (typeof require === 'function' && typeof process !== 'undefined' ? require('crypto').webcrypto : null);
    if (!cryptoObj) return fail('WebCrypto is not available in this browser.');

    var payloadBytes = b64urlToBytes(payloadB64);
    var sigBytes = b64urlToBytes(sigB64);
    var spki = b64urlToBytes(PUBLIC_KEY_SPKI_B64);

    // signature is over the payload b64url STRING exactly as transmitted (JWT convention)
    var data = new Uint8Array(payloadB64.length);
    for (var i = 0; i < payloadB64.length; i++) data[i] = payloadB64.charCodeAt(i);
    var sig = new Uint8Array(sigBytes.length);
    for (var j = 0; j < sigBytes.length; j++) sig[j] = sigBytes[j];

    return cryptoObj.subtle.importKey('spki', spki.buffer ? spki.buffer : spki, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
      .then(function (pubKey) {
        return cryptoObj.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pubKey, sig, data);
      })
      .then(function (valid) {
        if (!valid) return { ok: false, reason: 'License signature is invalid.' };
        var payload = decodeJson(payloadBytes);
        if (!payload || payload.v !== 1) return { ok: false, reason: 'License payload is unreadable.' };
        if (payload.t !== 'pro') return { ok: false, reason: 'This key is not a Pro license.' };
        return { ok: true, tier: 'pro', email: payload.e || '' };
      })
      .catch(function () { return { ok: false, reason: 'License verification failed. Please check the key and try again.' }; });
  }

  var api = { verifyLicense: verifyLicense };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BPLicense = api;
})(typeof self !== 'undefined' ? self : this);
