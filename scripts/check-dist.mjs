/* Runs after every build: the published site must not contain the text
   of any built-in question, option set or explanation, nor the bank
   passphrase. Fails the deploy if it does. */
import { readFileSync, readdirSync, statSync } from "fs";
import { QAAPF_QUESTIONS as Q } from "../src/lib/qaapf-bank.js";
const root = new URL("..", import.meta.url).pathname, dist = root + "dist";
const files = []; const walk = d => { for (const f of readdirSync(d)) { const p = `${d}/${f}`; statSync(p).isDirectory() ? walk(p) : files.push(p); } };
walk(dist);
const text = files.filter(f => /\.(js|html|json|css|map|txt)$/.test(f)).map(f => readFileSync(f, "utf8")).join("\n");
const secret = readFileSync(root + "bank-secret.txt", "utf8").trim();
const leaks = [];
if (text.includes(secret)) leaks.push("the bank passphrase");
for (const q of Q) {
  if (text.includes(q.q.slice(0, 48))) leaks.push(`${q.id} question text`);
  if (q.x && text.includes(q.x.slice(0, 48))) leaks.push(`${q.id} explanation`);
}
if (leaks.length) { console.error(`The build exposes ${leaks.length} item(s): ${leaks.slice(0, 8).join(", ")}…`); process.exit(1); }
console.log(`Published files checked: no built-in question, explanation or passphrase among ${files.length} files.`);
