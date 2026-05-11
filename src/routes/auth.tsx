import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — TGIS" }, { name: "description", content: "Sign in or create an account to access the TGIS Operations Dashboard." }] }),
});

function AuthPage() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!loading && user) nav({ to: "/dashboard" }); }, [user, loading, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { display_name: displayName || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally { setBusy(false); }
  };

  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl font-bold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Access the TGIS operations dashboard and admin tools.</p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        {mode === "signup" && (
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Display name</label>
            <input className={inp} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input type="email" required className={inp} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Password</label>
          <input type="password" required minLength={6} className={inp} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {mode === "signin" && (
          <Link to="/forgot-password" className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
            Forgot your password?
          </Link>
        )}
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full text-center text-xs text-muted-foreground hover:text-foreground">
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
      <Link to="/" className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
    </div>
  );
}
