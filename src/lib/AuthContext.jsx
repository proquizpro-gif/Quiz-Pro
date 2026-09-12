import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(null);
  const [dbReady, setDbReady] = useState(true);

  const loadProfile = async (user) => {
    if (!user) { setProfile(null); return; }
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (error && error.code === "PGRST116") {
        const { data: newProf, error: ie } = await supabase
          .from("profiles")
          .upsert({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || user.email.split("@")[0], avatar_url: user.user_metadata?.avatar_url || null, role: "student" }, { onConflict: "id" })
          .select().single();
        if (!ie) setProfile(newProf);
      } else if (error && error.message?.includes("does not exist")) {
        setDbReady(false);
      } else if (!error && data) {
        setProfile(data);
      }
    } catch (e) { console.error("Profile load failed:", e.message); }
  };

  const refreshProfile = async () => { if (session?.user) await loadProfile(session.user); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); loadProfile(s?.user ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, s) => { setSession(s); loadProfile(s?.user ?? null); });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  const signOut = () => supabase.auth.signOut();

  const isLoading = session === undefined;
  const user = session?.user ?? null;
  const isAdmin = profile?.role === "admin";
  const isFaculty = profile?.role === "faculty" || isAdmin;
  const isStudent = profile?.role === "student";

  if (!dbReady) {
    return (
      <div style={{ display:"grid", minHeight:"100vh", placeItems:"center", fontFamily:"Inter,sans-serif", background:"#f8fafc" }}>
        <div style={{ maxWidth:480, padding:32, background:"white", borderRadius:16, border:"1px solid #e2e8f0", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:32, marginBottom:16 }}>⚠️</div>
          <h2 style={{ margin:"0 0 8px", color:"#0f172a", fontSize:20 }}>Database not set up yet</h2>
          <p style={{ color:"#64748b", fontSize:14, lineHeight:1.6, margin:"0 0 16px" }}>Run STEP1_run_this_in_supabase.sql in the Supabase SQL Editor first.</p>
          <button onClick={() => window.location.reload()} style={{ background:"#7c3aed", color:"white", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer" }}>Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isFaculty, isStudent, isLoading, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
