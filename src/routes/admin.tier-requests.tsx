import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Lock, Search, CheckCircle2, XCircle, Clock, Download } from "lucide-react";

const CSV_COLS = [
  ["Submitted", (r: any) => r.created_at ?? ""],
  ["Status", (r: any) => r.status ?? ""],
  ["Requested tier", (r: any) => r.requested_role ?? ""],
  ["Organization", (r: any) => r.organization_name ?? ""],
  ["Organization type", (r: any) => r.organization_type ?? ""],
  ["Contact name", (r: any) => r.contact_name ?? ""],
  ["Contact phone", (r: any) => r.contact_phone ?? ""],
  ["Justification", (r: any) => r.justification ?? ""],
  ["Reviewed at", (r: any) => r.reviewed_at ?? ""],
  ["Reviewed by", (r: any) => r.reviewed_by ?? ""],
  ["User ID", (r: any) => r.user_id ?? ""],
  ["Request ID", (r: any) => r.id ?? ""],
] as const;

function toCSV(rows: any[]) {
  const esc = (v: any) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const lines = [CSV_COLS.map(([h]) => esc(h)).join(",")];
  for (const r of rows) lines.push(CSV_COLS.map(([, fn]) => esc(fn(r))).join(","));
  return lines.join("\n");
}

function downloadCSV(filename: string, content: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const Route = createFileRoute("/admin/tier-requests")({
  head: () => ({
    meta: [
      { title: "Tier Requests — Admin — TGIS" },
      { name: "description", content: "Review, approve, and reject NGO and Enterprise tier upgrade applications." },
    ],
  }),
  component: AdminTierRequestsGate,
});

function AdminTierRequestsGate() {
  const { user, loading, isAdmin, roleChecked } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user && roleChecked && !isAdmin) {
      toast.error("Admin access required.");
      nav({ to: "/" });
    }
  }, [loading, user, roleChecked, isAdmin, nav]);

  if (loading || (user && !roleChecked)) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-sm text-muted-foreground">Admin tools are restricted to authorized users.</p>
        <Link to="/auth" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Sign in</Link>
      </div>
    );
  }
  if (!isAdmin) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Redirecting…</div>;
  return <AdminTierRequestsPage />;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type RoleFilter = "all" | "ngo" | "enterprise";

function AdminTierRequestsPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("pending");
  const [role, setRole] = useState<RoleFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-tier-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tier_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const counts = useMemo(() => ({
    total: requests.length,
    pending: (requests as any[]).filter(r => r.status === "pending").length,
    approved: (requests as any[]).filter(r => r.status === "approved").length,
    rejected: (requests as any[]).filter(r => r.status === "rejected").length,
  }), [requests]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (requests as any[]).filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (role !== "all" && r.requested_role !== role) return false;
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo) {
        const end = new Date(dateTo); end.setHours(23,59,59,999);
        if (new Date(r.created_at) > end) return false;
      }
      if (term) {
        const hay = [r.organization_name, r.organization_type, r.contact_name, r.contact_phone, r.justification]
          .filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [requests, q, status, role, dateFrom, dateTo]);

  const review = async (id: string, newStatus: "approved" | "rejected") => {
    setBusyId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("tier_requests").update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id ?? null,
      }).eq("id", id);
      if (error) throw error;
      toast.success(`Application ${newStatus}`);
      qc.invalidateQueries({ queryKey: ["admin-tier-requests"] });
      qc.invalidateQueries({ queryKey: ["tier-requests"] });
    } catch (err: any) {
      toast.error(err.message ?? "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm";
  const clearable = q || status !== "pending" || role !== "all" || dateFrom || dateTo;

  const exportCSV = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const term = q.trim();
      const PAGE = 1000;
      let from = 0;
      const all: any[] = [];

      while (true) {
        let query = supabase
          .from("tier_requests")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, from + PAGE - 1);

        if (status !== "all") query = query.eq("status", status);
        if (role !== "all") query = query.eq("requested_role", role);
        if (dateFrom) query = query.gte("created_at", new Date(dateFrom).toISOString());
        if (dateTo) {
          const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
          query = query.lte("created_at", end.toISOString());
        }

        const { data, error } = await query;
        if (error) throw error;
        const batch = data ?? [];
        all.push(...batch);
        if (batch.length < PAGE) break;
        from += PAGE;
      }

      const rows = term
        ? all.filter((r) => {
            const hay = [r.organization_name, r.organization_type, r.contact_name, r.contact_phone, r.justification]
              .filter(Boolean).join(" ").toLowerCase();
            return hay.includes(term.toLowerCase());
          })
        : all;

      if (rows.length === 0) return toast.error("No requests match current filters");
      const stamp = new Date().toISOString().slice(0, 10);
      downloadCSV(`tgis-tier-requests-${stamp}.csv`, toCSV(rows));
      toast.success(`Exported ${rows.length} request(s)`);
    } catch (err: any) {
      toast.error(err.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">← Dashboard</Link>
          <h1 className="mt-1 font-display text-3xl font-bold">Tier Upgrade Requests</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review and moderate NGO & Enterprise tier applications.</p>
        </div>
        <button
          onClick={exportCSV}
          disabled={exporting}
          title="Export all matching requests as CSV"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
          <Download className="h-4 w-4" /> {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Metric icon={<Clock className="h-5 w-5" />} label="Pending" value={counts.pending} tone="bg-amber-500/15 text-amber-700 dark:text-amber-300" />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Approved" value={counts.approved} tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" />
        <Metric icon={<XCircle className="h-5 w-5" />} label="Rejected" value={counts.rejected} tone="bg-rose-500/15 text-rose-700 dark:text-rose-300" />
        <Metric icon={<Clock className="h-5 w-5" />} label="Total" value={counts.total} tone="bg-muted text-muted-foreground" />
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            placeholder="Search organization, contact, justification…"
            className={`${inputCls} w-full pl-9`}
          />
        </div>
        <select value={status} onChange={(e)=>setStatus(e.target.value as StatusFilter)} className={inputCls}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={role} onChange={(e)=>setRole(e.target.value as RoleFilter)} className={inputCls}>
          <option value="all">All tiers</option>
          <option value="ngo">NGO</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">From
          <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">To
          <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className={inputCls} />
        </label>
        {clearable && (
          <button
            onClick={()=>{ setQ(""); setStatus("pending"); setRole("all"); setDateFrom(""); setDateTo(""); }}
            className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
            Reset
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">{filtered.length} of {requests.length}</div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No applications match these filters.</td></tr>
              )}
              {filtered.flatMap((r: any) => {
                const open = expanded === r.id;
                return [
                    <tr key={r.id} className="cursor-pointer align-top hover:bg-muted/30" onClick={()=>setExpanded(open ? null : r.id)}>
                      <td className="px-4 py-3"><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{r.requested_role}</span></td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.organization_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.organization_type ?? ""}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{r.contact_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.contact_phone ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                      <td className="px-4 py-3 text-right" onClick={(e)=>e.stopPropagation()}>
                        {r.status === "pending" ? (
                          <>
                            <button
                              disabled={busyId === r.id}
                              onClick={()=>review(r.id, "approved")}
                              className="mr-2 rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:opacity-90 disabled:opacity-50">
                              Approve
                            </button>
                            <button
                              disabled={busyId === r.id}
                              onClick={()=>review(r.id, "rejected")}
                              className="rounded-md border border-input px-3 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50">
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {r.reviewed_at ? `Reviewed ${new Date(r.reviewed_at).toLocaleDateString()}` : "—"}
                          </span>
                        )}
                      </td>
                    </tr>,
                    open ? (
                      <tr key={`${r.id}-x`} className="bg-muted/20">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground">Justification</div>
                          <p className="mt-1 whitespace-pre-wrap text-sm">{r.justification ?? "—"}</p>
                          {r.status !== "pending" && (
                            <div className="mt-3 text-xs text-muted-foreground">
                              {r.status === "approved" ? "Approved" : "Rejected"} {r.reviewed_at ? `on ${new Date(r.reviewed_at).toLocaleString()}` : ""}
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>{icon}</div>
      <div>
        <div className="text-2xl font-extrabold">{value}</div>
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${map[s] ?? "bg-muted"}`}>{s}</span>;
}
