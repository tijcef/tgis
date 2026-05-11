import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Building2, CheckCircle2 } from "lucide-react";

type Search = { tier?: "ngo" | "enterprise" };

export const Route = createFileRoute("/register-organization")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    tier: s.tier === "enterprise" ? "enterprise" : "ngo",
  }),
  head: () => ({
    meta: [
      { title: "Register your organization — TGIS" },
      { name: "description", content: "Apply to upgrade your TGIS account to the NGO or Enterprise tier." },
    ],
  }),
  component: RegisterOrgPage,
});

const schema = z.object({
  organization_name: z.string().trim().min(2).max(150),
  organization_type: z.string().trim().min(2).max(80),
  contact_name: z.string().trim().min(2).max(120),
  contact_phone: z.string().trim().min(5).max(40),
  justification: z.string().trim().min(20).max(1000),
});

function RegisterOrgPage() {
  const search = useSearch({ from: "/register-organization" });
  const requestedRole = search.tier ?? "ngo";
  const { user, loading, tier, roles } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    organization_name: "", organization_type: requestedRole === "ngo" ? "NGO" : "Enterprise",
    contact_name: "", contact_phone: "", justification: "",
  });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("tier_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("requested_role", requestedRole)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setPending(data));
  }, [user, requestedRole]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const { error } = await supabase.from("tier_requests").insert({
        user_id: user.id,
        requested_role: requestedRole,
        ...parsed.data,
      });
      if (error) throw error;
      toast.success("Application submitted. An admin will review shortly.");
      const { data } = await supabase.from("tier_requests").select("*").eq("user_id", user.id).eq("requested_role", requestedRole).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setPending(data);
    } catch (err: any) {
      toast.error(err.message ?? "Submission failed");
    } finally { setBusy(false); }
  };

  if (loading || !user) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">Loading…</div>;

  const inp = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const label = "block text-xs uppercase tracking-wider text-muted-foreground";
  const tierName = requestedRole === "ngo" ? "NGO" : "Enterprise";
  const alreadyHas = roles.includes(requestedRole) || tier === "admin";

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to="/pricing" className="text-xs text-muted-foreground hover:text-foreground">← Back to tiers</Link>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold">Apply for {tierName} access</h1>
          <p className="text-sm text-muted-foreground">Submit your details — an admin will review and approve your account.</p>
        </div>
      </div>

      {alreadyHas && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
          <div className="text-sm">
            <div className="font-semibold">You already have {tierName} access.</div>
            <p className="mt-0.5 text-muted-foreground">No need to reapply.</p>
          </div>
        </div>
      )}

      {!alreadyHas && pending?.status === "pending" && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <div className="font-semibold">Your application is pending review</div>
          <p className="mt-1 text-muted-foreground">Submitted {new Date(pending.created_at).toLocaleDateString()}. We'll notify you once an admin approves it.</p>
        </div>
      )}

      {!alreadyHas && pending?.status === "rejected" && (
        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
          <div className="font-semibold">Previous application was not approved</div>
          <p className="mt-1 text-muted-foreground">You can submit a new application below.</p>
        </div>
      )}

      {!alreadyHas && pending?.status !== "pending" && (
        <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div>
            <label className={label}>Organization name</label>
            <input className={inp} value={form.organization_name} onChange={(e)=>setForm({...form, organization_name: e.target.value})} required />
          </div>
          <div>
            <label className={label}>Organization type</label>
            <input className={inp} value={form.organization_type} onChange={(e)=>setForm({...form, organization_type: e.target.value})} placeholder={requestedRole === "ngo" ? "e.g. NGO, Foundation, Community Group" : "e.g. Government Agency, Corporation"} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Contact person</label>
              <input className={inp} value={form.contact_name} onChange={(e)=>setForm({...form, contact_name: e.target.value})} required />
            </div>
            <div>
              <label className={label}>Contact phone</label>
              <input className={inp} value={form.contact_phone} onChange={(e)=>setForm({...form, contact_phone: e.target.value})} required />
            </div>
          </div>
          <div>
            <label className={label}>Why do you need {tierName} access? (min 20 chars)</label>
            <textarea className={`${inp} min-h-28`} value={form.justification} onChange={(e)=>setForm({...form, justification: e.target.value})} required />
          </div>
          <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {busy ? "Submitting…" : "Submit application"}
          </button>
        </form>
      )}
    </div>
  );
}
