import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Forgot password — TGIS" },
      { name: "description", content: "Request a password reset link for your TGIS account." },
    ],
  }),
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      try { sessionStorage.setItem("tgis:lastResetEmail", email); } catch {}
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for the reset link");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send reset email");
    } finally {
      setBusy(false);
    }
  };

  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl font-bold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter your email and we'll send you a link to reset it.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
          <input type="email" required className={inp} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button disabled={busy || sent} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? "Sending…" : sent ? "Email sent" : "Send reset link"}
        </button>
        {sent && (
          <p className="text-xs text-muted-foreground">
            If an account exists for {email}, a reset link is on its way. The link opens the reset page where you can pick a new password.
          </p>
        )}
      </form>
      <Link to="/auth" className="mt-4 text-center text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
    </div>
  );
}
