import { supabase } from "./supabase";
export async function pingKeepAlive() {
  try { await supabase.from("profiles").select("id").limit(1); } catch (_) {}
}
