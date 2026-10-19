/* Sealing for the built-in question bank.

   The bank (questions, answer keys, explanations) is published with the
   site as an encrypted file, so a student who opens the browser's
   developer tools sees ciphertext, not answers. Staff receive the
   passphrase from the database (STEP7: qaapf_bank_secret(), which
   returns it only to faculty and admins) and the browser decrypts the
   bank in memory.

   AES-256-GCM with a key derived by PBKDF2-SHA-256. Pure Web Crypto,
   so the same code runs in Node 18+ (the build) and in browsers. */

const enc = new TextEncoder(), dec = new TextDecoder();
const subtle = () => {
  const s = globalThis.crypto && globalThis.crypto.subtle;
  if (!s) throw new Error("This browser cannot decrypt the question bank (Web Crypto unavailable — use HTTPS).");
  return s;
};
const toB64 = bytes => { let s = ""; const b = new Uint8Array(bytes); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
export const ITERATIONS = 120000;

async function keyFor(secret, salt, usage) {
  const base = await subtle().importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, base, { name: "AES-GCM", length: 256 }, false, [usage]);
}

export async function seal(plaintext, secret) {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(secret, salt, "encrypt");
  const data = await subtle().encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
  return { v: 1, alg: "PBKDF2-SHA256/AES-256-GCM", iter: ITERATIONS, salt: toB64(salt), iv: toB64(iv), data: toB64(data) };
}

export async function unseal(env, secret) {
  if (!env || env.v !== 1) throw new Error("Unknown sealed-bank format");
  const key = await keyFor(secret, fromB64(env.salt), "decrypt");
  try {
    const plain = await subtle().decrypt({ name: "AES-GCM", iv: fromB64(env.iv) }, key, fromB64(env.data));
    return dec.decode(plain);
  } catch {
    throw new Error("The question-bank passphrase does not match this build. Re-run the STEP7 file that came with this version.");
  }
}

/* A short, stable fingerprint of a question's text (FNV-1a, 32-bit).
   Used for the public level list: it lets the exam screen order a
   baseline paper and a student's profile group answers by domain,
   without shipping the text, options or answers of any question. */
export function stemHash(normalisedStem) {
  let h = 0x811c9dc5;
  for (let i = 0; i < normalisedStem.length; i++) { h ^= normalisedStem.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}

/* Same normalisation as qaapf-core's norm(): trimmed, lower case,
   single spaces. Kept here so the build script needs no React-free
   core import before the generated module exists. */
export const normStem = t => String(t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
