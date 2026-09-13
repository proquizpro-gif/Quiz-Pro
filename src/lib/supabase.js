import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export const configMissing = !supabaseUrl || !supabaseKey;

/* A build with no credentials used to crash here: createClient("")
   throws during module evaluation, which happens before React mounts,
   so the ErrorBoundary never ran and the user got a blank page with
   the real cause buried in the console.

   Export a stub instead. The app renders, App.jsx shows a setup screen
   that names the missing variables, and any stray call rejects with a
   readable message rather than a TypeError on undefined. */
function makeStub() {
  const err = () =>
    Promise.resolve({
      data: null,
      error: { message: "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy." },
    });
  const chain = () => {
    const q = {
      select: chain, insert: chain, update: chain, upsert: chain, delete: chain,
      eq: chain, is: chain, or: chain, order: chain, range: chain, limit: chain,
      single: err, maybeSingle: err,
      then: (res, rej) => err().then(res, rej),
    };
    return q;
  };
  return {
    from: chain,
    rpc: err,
    auth: {
      getSession:        () => Promise.resolve({ data: { session: null } }),
      getUser:           () => Promise.resolve({ data: { user: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth:   err,
      signOut:           () => Promise.resolve({ error: null }),
    },
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
  };
}

if (configMissing) {
  console.error(
    "[QuizPro] Supabase credentials are missing from this build.\n" +
    "Netlify → Site configuration → Environment variables → add:\n" +
    "  VITE_SUPABASE_URL\n  VITE_SUPABASE_ANON_KEY\n" +
    "Then redeploy. Vite bakes these in at build time, so a redeploy is required."
  );
}

export const supabase = configMissing
  ? makeStub()
  : createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    });
