// BalanceProof license signer — OWNER TOOL, runs locally only.
// Usage: ./node-portable.exe tools/sign-license.js <email>
// Requires secrets-local/bp-license-private.pem (never commit it).
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const email = process.argv[2];
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: node tools/sign-license.js <email>');
  process.exit(1);
}
const keyPath = path.join(__dirname, '..', 'secrets-local', 'bp-license-private.pem');
if (!fs.existsSync(keyPath)) {
  console.error('Missing ' + keyPath + ' — the signing key lives only on this machine.');
  process.exit(1);
}

const payload = Buffer.from(JSON.stringify({ v: 1, t: 'pro', e: email, i: Math.floor(Date.now() / 1000) }));
const payloadB64 = payload.toString('base64url');
const signer = crypto.createSign('SHA256');
signer.update(payloadB64);
signer.end();
const der = signer.sign(fs.readFileSync(keyPath));
// WebCrypto ECDSA verify expects raw r||s (64 bytes for P-256), DER must be converted
const raw = derToRaw(der);
const key = 'BP1.' + payloadB64 + '.' + raw.toString('base64url');
console.log(key);

function derToRaw(der) {
  // ECDSA-Sig-Value ::= SEQUENCE { r INTEGER, s INTEGER }
  let i = 2; // skip SEQUENCE header
  const readInt = function () {
    // expect 0x02 len bytes...
    if (der[i] !== 0x02) throw new Error('bad DER');
    i++;
    const len = der[i++];
    let b = der.slice(i, i + len);
    i += len;
    b = b.slice(b[0] === 0 ? 1 : 0); // strip leading zero
    const out = Buffer.alloc(32);
    b.copy(out, 32 - b.length);
    return out;
  };
  const r = readInt();
  const s = readInt();
  return Buffer.concat([r, s]);
}
