/* The student's view: the built-in bank is NOT installed. Checks that
   the published pieces carry no questions or answers, and that the
   exam and profile still work from the public level list. */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "fs";
import * as core from "../src/lib/qaapf-core.js";
import { unseal } from "../src/lib/seal.js";
import { SEALED_BANK_FILE } from "../src/lib/generated/qaapf-public.js";
import { QAAPF_QUESTIONS as SRC, QAAPF_LEGACY as SRC_L } from "../src/lib/qaapf-bank.js";

let passed = 0;
const test = async (name, fn) => { try { await fn(); passed++; } catch (e) { console.error(`✗ ${name}\n  ${e.message}`); process.exitCode = 1; } };
const root = new URL("..", import.meta.url).pathname;
const pub = readFileSync(root + "src/lib/generated/qaapf-public.js", "utf8");
const longOpts = SRC.flatMap(q => q.o).filter(o => o.length >= 12);

await test("bank is not installed in a student's browser", () => {
  assert.equal(core.bankInstalled(), false);
  assert.equal(core.QAAPF_QUESTIONS.length, 0);
});
await test("the public level list holds no question text, options or explanations", () => {
  for (const q of SRC) { assert.ok(!pub.includes(q.q.slice(0, 40)), `${q.id} stem leaked`); if (q.x) assert.ok(!pub.includes(q.x.slice(0, 40)), `${q.id} explanation leaked`); }
  for (const o of longOpts.slice(0, 400)) assert.ok(!pub.includes(JSON.stringify(o)), `option leaked: ${o}`);
});
await test("a built-in item is recognised and scored with the server's stored key", () => {
  const q = SRC.find(x => x.id === "A111");
  const r = core.resolveItem({ question: q.q, options: q.o, correct: 2, chosen: 2 }, null);
  assert.equal(r.meta.id, "A111"); assert.equal(r.meta.domain, "A"); assert.equal(r.key, 2); assert.equal(r.source, "stored");
  const none = core.resolveItem({ question: q.q, options: q.o, chosen: 1 }, null);
  assert.equal(none.key, null);
});
await test("baseline papers still end with the CAT-level items", () => {
  const cat = SRC.filter(q => q.k === "cat" && !q.r).slice(0, 4).map(q => ({ question: q.q, difficulty: "hard" }));
  const hard = SRC.filter(q => q.lv === 3 && !q.k && !q.r).slice(0, 10).map(q => ({ question: q.q, difficulty: "hard" }));
  const easy = SRC.filter(q => q.lv === 1 && !q.r).slice(0, 5).map(q => ({ question: q.q, difficulty: "easy" }));
  const out = core.orderBaselinePaper([...cat, ...hard, ...easy], core.makeRng(3));
  assert.deepEqual(out.slice(-4).map(x => x.question).sort(), cat.map(x => x.question).sort());
  assert.deepEqual(out.slice(0, 5).map(x => x.question).sort(), easy.map(x => x.question).sort());
});
await test("a student's profile skips questions whose answers are not released yet", () => {
  const qs = SRC.filter(q => !q.r && q.d === "B").slice(0, 8);
  const items = qs.map((q, i) => ({ question: q.q, options: q.o, chosen: q.c, ...(i < 4 ? { correct: q.c } : {}) }));
  const p = core.computeQAAPFProfile([{ submitted_at: "2026-10-14T04:00:00Z", time_used_sec: 1200, violations: 0, items }], []);
  assert.equal(p.totalSeen, 4); assert.equal(p.totalCorrect, 4);
});
await test("the sealed bank opens with the passphrase and matches the source", async () => {
  const env = JSON.parse(readFileSync(root + "public/" + SEALED_BANK_FILE, "utf8"));
  const secret = readFileSync(root + "bank-secret.txt", "utf8").trim();
  const bank = JSON.parse(await unseal(env, secret));
  assert.equal(bank.questions.length, SRC.length); assert.equal(bank.legacy.length, SRC_L.length);
  assert.deepEqual(bank.questions.find(q => q.id === "D097"), SRC.find(q => q.id === "D097"));
  await assert.rejects(unseal(env, secret + "x"));
  const raw = readFileSync(root + "public/" + SEALED_BANK_FILE, "utf8");
  assert.ok(!raw.includes(SRC[0].q.slice(0, 20)));
  core.installBank(bank);
  assert.equal(core.bankInstalled(), true);
  assert.equal(core.QAAPF_ACTIVE.length, SRC.filter(q => !q.r).length);
});
await test("STEP7 carries the same passphrase as the build", () => {
  const step7 = readdirSync(root).find(f => /^STEP7.*\.sql$/.test(f));
  assert.ok(step7, "STEP7 file missing");
  assert.ok(readFileSync(root + step7, "utf8").includes(readFileSync(root + "bank-secret.txt", "utf8").trim()));
});
console.log(`${passed} sealed-bank tests passed${process.exitCode ? ", some failed" : ""}.`);
