/* Structural checks on the QAAPF question bank.
   Run: npm run verify:bank   (exits non-zero on any problem)

   These checks catch the faults found in the v3 bank that a machine can
   see. They do not replace the human rule: two people solve every new
   or changed item independently and agree with the key. */
import { QAAPF_QUESTIONS as Q, QAAPF_LEGACY as L, QAAPF_BANK_VERSION } from "../src/lib/qaapf-bank.js";
import { DOMAINS, PAPER_SIZES, difficultyMix } from "../src/lib/qaapf-core.js";

const norm = t => String(t ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const problems = [];
const bad = (id, msg) => problems.push(`${id}: ${msg}`);

const ids = new Set(), stems = new Map();
for (const q of Q) {
  const id = q.id || "(no id)";
  if (!/^[A-H]\d{3}$/.test(q.id || "")) bad(id, "id must be a domain letter plus three digits");
  if (ids.has(q.id)) bad(id, "duplicate id");
  ids.add(q.id);
  if (q.id && q.id[0] !== q.d) bad(id, `id letter does not match domain ${q.d}`);

  const dom = DOMAINS.find(d => d.id === q.d);
  if (!dom) bad(id, `unknown domain ${q.d}`);
  else if (!dom.units.includes(q.u)) bad(id, `unit "${q.u}" is not listed for domain ${q.d}`);

  if (!q.q || q.q.trim().length < 6) bad(id, "empty stem");
  const s = norm(q.q);
  if (stems.has(s)) bad(id, `same stem as ${stems.get(s)}`);
  stems.set(s, q.id);

  if (!Array.isArray(q.o) || q.o.length !== 4) bad(id, "needs exactly four options");
  else {
    if (new Set(q.o.map(norm)).size !== 4) bad(id, "two options have the same text");
    if (q.o.some(o => !String(o).trim())) bad(id, "empty option");
  }
  if (!Number.isInteger(q.c) || q.c < 0 || q.c > 3) bad(id, "key index out of range");
  if (![1, 2, 3].includes(q.lv)) bad(id, "difficulty must be 1, 2 or 3");

  // Faults seen in v3: items that lean on another item, leaked hints, raw markup.
  if (/\bsame (table|data|output|chart|graph)\b|\bin the same\b(?! code)|\babove (table|data)\b/i.test(q.q)) bad(id, "refers to another question");
  if (/\((?:[^)]*\b(skip pattern|month initials|positions summed|add consecutive|diffs?)\b[^)]*)\)/i.test(q.q)) bad(id, "solution hint left in the stem");
  if (/\^|overline|\\frac|\$/.test(q.q + " " + q.o.join(" "))) bad(id, "raw math markup — use Unicode (x², ³√, …)");
}

// Key positions: printed papers keep stored order, so keys must not bunch.
const pos = [0, 0, 0, 0];
for (const q of Q) pos[q.c]++;
const share = pos.map(n => n / Q.length);
if (share.some(s => s < 0.2 || s > 0.3)) problems.push(`answer key positions unbalanced: A–D = ${pos.join(" / ")}`);

// Every domain must be able to fill the largest paper size.
const maxMix = difficultyMix(Math.max(...PAPER_SIZES));
for (const d of DOMAINS) {
  for (const lv of [1, 2, 3]) {
    const n = Q.filter(q => q.d === d.id && q.lv === lv).length;
    if (n < maxMix[lv] * 3) problems.push(`domain ${d.id}: only ${n} level-${lv} items (want at least ${maxMix[lv] * 3} for rotation)`);
  }
  for (const u of d.units) if (!Q.some(q => q.d === d.id && q.u === u)) problems.push(`domain ${d.id}: unit "${u}" has no items`);
}

// Earlier versions must point at a real successor and carry an answer when sound.
for (const v of L) {
  if (!["ok", "void"].includes(v.status)) problems.push(`legacy "${v.q.slice(0, 40)}": bad status`);
  if (v.status === "ok" && !v.o.includes(v.a)) problems.push(`legacy "${v.q.slice(0, 40)}": answer not among its options`);
  if (v.next && !ids.has(v.next)) problems.push(`legacy "${v.q.slice(0, 40)}": successor ${v.next} does not exist`);
}

if (problems.length) {
  console.error(`QAAPF bank v${QAAPF_BANK_VERSION}: ${problems.length} problem(s)`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`QAAPF bank v${QAAPF_BANK_VERSION}: ${Q.length} items, ${L.length} earlier versions — all checks passed.`);
console.log(`  keys A–D: ${pos.join(" / ")}`);
for (const d of DOMAINS) {
  const c = [1, 2, 3].map(lv => Q.filter(q => q.d === d.id && q.lv === lv).length);
  console.log(`  ${d.id} ${d.name.padEnd(32)} easy ${String(c[0]).padStart(2)} · medium ${String(c[1]).padStart(2)} · hard ${String(c[2]).padStart(2)}`);
}
