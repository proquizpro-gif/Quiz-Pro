/* Staff only: fetch the passphrase from the database (STEP7's
   qaapf_bank_secret(), which returns it to faculty and admins and to
   nobody else), download the sealed bank published with the site and
   install it. Students never call this; their screens work from the
   public level list and the keys the server marks with. */
import { fetchBankSecret } from "./db.js";
import { unseal } from "./seal.js";
import { installBank, bankInstalled } from "./qaapf-core.js";
import { SEALED_BANK_FILE } from "./generated/qaapf-public.js";

let pending = null;

export function loadBuiltInBank() {
  if (bankInstalled()) return Promise.resolve({ ok: true });
  if (!pending) pending = (async () => {
    const r = await fetchBankSecret();
    if (r.missing) return { ok: false, reason: "step7" };
    if (!r.secret) return { ok: false, reason: "denied" };
    const res = await fetch(`${import.meta.env.BASE_URL || "/"}${SEALED_BANK_FILE}`, { cache: "force-cache" });
    if (!res.ok) return { ok: false, reason: "error", message: `Sealed bank not found (${res.status}).` };
    installBank(JSON.parse(await unseal(await res.json(), r.secret)));
    return { ok: true };
  })().catch(e => ({ ok: false, reason: "error", message: e.message })).then(r => { if (!r.ok) pending = null; return r; });
  return pending;
}
