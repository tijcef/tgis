import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset password — TGIS" },
      { name: "description", content: "Set a new password for your TGIS account." },
    ],
  }),
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Resend form state
  const [resendEmail, setResendEmail] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Prefill resend email from ?email= query or previously saved value
    const search = new URLSearchParams(window.location.search);
    const fromQuery = search.get("email");
    let saved: string | null = null;
    try { saved = sessionStorage.getItem("tgis:lastResetEmail"); } catch {}
    const prefill = fromQuery || saved;
    if (prefill) setResendEmail(prefill);

    // Detect Supabase error params in the URL hash (e.g. expired link)
    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const err = params.get("error_description") || params.get("error");
      if (err) setLinkError(decodeURIComponent(err.replace(/\+/g, " ")));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
        setChecked(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      setChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  const resend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resendEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResendSent(true);
      toast.success("Reset email sent. Check your inbox.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
    } finally {
      setResendBusy(false);
    }
  };

  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const showResend = checked && !ready;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl font-bold">
        {showResend ? "Reset link expired" : "Set a new password"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {showResend
          ? linkError
            ? `${linkError}. Enter your email to receive a new reset link.`
            : "This reset link is invalid or has expired. Enter your email to get a new one."
          : ready
          ? "Enter a new password for your account."
          : "Verifying your reset link…"}
      </p>

      {!showResend && (
        <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">New password</label>
            <input type="password" required minLength={6} className={inp} value={password} onChange={(e) => setPassword(e.target.value)} disabled={!ready} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm password</label>
            <input type="password" required minLength={6} className={inp} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={!ready} />
          </div>
          <button disabled={busy || !ready} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      {showResend && (
        <form onSubmit={resend} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
            <input type="email" required className={inp} value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} />
          </div>
          <button disabled={resendBusy || resendSent} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {resendBusy ? "Sending…" : resendSent ? "Email sent" : "Resend reset email"}
          </button>
          {resendSent && (
            <p className="text-xs text-muted-foreground">
              If an account exists for {resendEmail}, a new reset link is on its way.
            </p>
          )}
        </form>
      )}

      <Link to="/auth" className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
    </div>
  );
}
