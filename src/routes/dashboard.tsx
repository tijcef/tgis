import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Download, Lock } from "lucide-react";

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: any[]) {
  const headers = ["id","title","description","category","status","latitude","longitude","location_name","organization","created_at"];
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([r.id,r.title,r.description,r.category,r.status,r.latitude,r.longitude,r.location_name,r.organizations?.name,r.created_at].map(esc).join(","));
  }
  return lines.join("\n");
}

function toGeoJSON(rows: any[]) {
  const lons = rows.map((r:any) => Number(r.longitude)).filter(Number.isFinite);
  const lats = rows.map((r:any) => Number(r.latitude)).filter(Number.isFinite);
  const bbox = lons.length && lats.length
    ? [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
    : undefined;
  return JSON.stringify({
    type: "FeatureCollection",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    ...(bbox ? { bbox } : {}),
    generated_at: new Date().toISOString(),
    count: rows.length,
    features: rows.map((r: any) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [Number(r.longitude), Number(r.latitude)] },
      properties: {
        id: r.id,
        title: r.title ?? "",
        description: r.description ?? "",
        category: r.category ?? null,
        organization: r.organizations?.name ?? "Unassigned",
        date: r.created_at,
        date_local: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null,
        status: r.status,
        location_name: r.location_name ?? null,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      },
    })),
  }, null, 2);
}

const xmlEsc = (v: any) =>
  String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

const KML_STYLES: Record<string, { color: string }> = {
  Health: { color: "ff3b30ee" },        // red (aabbggrr)
  Environment: { color: "ff34a853" },   // green
  Social: { color: "ffeb4334" },        // blue
};

function toKML(rows: any[]) {
  const styles = Object.entries(KML_STYLES).map(([cat, s]) => `
    <Style id="cat-${cat}">
      <IconStyle><color>${s.color}</color><scale>1.1</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
    </Style>`).join("");

  const placemarks = rows.map((r:any) => {
    const lon = Number(r.longitude), lat = Number(r.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return "";
    const styleId = KML_STYLES[r.category] ? `#cat-${r.category}` : "";
    const when = r.created_at ? new Date(r.created_at).toISOString() : "";
    return `
    <Placemark>
      <name>${xmlEsc(r.title)}</name>
      ${styleId ? `<styleUrl>${styleId}</styleUrl>` : ""}
      ${when ? `<TimeStamp><when>${when}</when></TimeStamp>` : ""}
      <ExtendedData>
        <Data name="category"><value>${xmlEsc(r.category)}</value></Data>
        <Data name="organization"><value>${xmlEsc(r.organizations?.name ?? "Unassigned")}</value></Data>
        <Data name="status"><value>${xmlEsc(r.status)}</value></Data>
        <Data name="location_name"><value>${xmlEsc(r.location_name ?? "")}</value></Data>
        <Data name="date"><value>${xmlEsc(r.created_at ?? "")}</value></Data>
      </ExtendedData>
      <description><![CDATA[${r.description ?? ""}]]></description>
      <Point><coordinates>${lon},${lat},0</coordinates></Point>
    </Placemark>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>TGIS Approved Field Reports</name>
    <description>Exported ${rows.length} approved report(s) on ${new Date().toISOString()}</description>${styles}${placemarks}
  </Document>
</kml>`;
}

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TGIS" },
      { name: "description", content: "Admin dashboard for reviewing, approving, and rejecting field reports." },
    ],
  }),
  component: DashboardGate,
});

function DashboardGate() {
  const { user, loading, isAdmin, roleChecked } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && user && roleChecked && !isAdmin) {
      toast.error("Admin access required. You don't have permission to view the dashboard.");
      nav({ to: "/" });
    }
  }, [loading, user, roleChecked, isAdmin, nav]);

  if (loading || (user && !roleChecked)) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <Lock className="h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 font-display text-2xl font-bold">Sign in required</h1>
      <p className="mt-2 text-sm text-muted-foreground">The Operations Dashboard is restricted to authorized users.</p>
      <Link to="/auth" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Sign in</Link>
    </div>
  );
  if (!isAdmin) {
    return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted-foreground">Redirecting…</div>;
  }
  return <DashboardPage />;
}

function DashboardPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");


  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["dashboard-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("field_reports")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const orgOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of reports as any[]) {
      if (r.organization_id && r.organizations?.name) seen.set(r.organization_id, r.organizations.name);
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a,b)=>a.name.localeCompare(b.name));
  }, [reports]);

  const matchesFilters = (r: any) => {
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (orgFilter === "none" && r.organization_id) return false;
    if (orgFilter !== "all" && orgFilter !== "none" && r.organization_id !== orgFilter) return false;
    if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
    if (dateTo) {
      const end = new Date(dateTo); end.setHours(23,59,59,999);
      if (new Date(r.created_at) > end) return false;
    }
    return true;
  };

  const filtered = useMemo(() => (reports as any[]).filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) && matchesFilters(r)
  ), [reports, statusFilter, categoryFilter, orgFilter, dateFrom, dateTo]);

  const exportable = useMemo(
    () => (reports as any[]).filter((r) => r.status === "approved" && matchesFilters(r)),
    [reports, categoryFilter, orgFilter, dateFrom, dateTo]
  );

  const counts = useMemo(() => ({
    pending: reports.filter((r:any)=>r.status==="pending").length,
    approved: reports.filter((r:any)=>r.status==="approved").length,
    rejected: reports.filter((r:any)=>r.status==="rejected").length,
  }), [reports]);

  const exportApproved = (fmt: "csv"|"geojson"|"kml") => {
    if (exportable.length === 0) return toast.error("No approved reports match current filters");
    const stamp = new Date().toISOString().slice(0,10);
    const base = `tgis-approved-reports-${stamp}`;
    if (fmt === "csv") downloadFile(`${base}.csv`, toCSV(exportable), "text/csv;charset=utf-8");
    else if (fmt === "geojson") downloadFile(`${base}.geojson`, toGeoJSON(exportable), "application/geo+json");
    else downloadFile(`${base}.kml`, toKML(exportable), "application/vnd.google-earth.kml+xml");
    toast.success(`Exported ${exportable.length} approved report(s)`);
  };

  const setStatus = async (id: string, status: "approved"|"rejected") => {
    if (!isAdmin) return toast.error("Admin role required");
    const { error } = await supabase.from("field_reports").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Report ${status}`);
    qc.invalidateQueries({ queryKey: ["dashboard-reports"] });
    qc.invalidateQueries({ queryKey: ["map-reports"] });
    qc.invalidateQueries({ queryKey: ["home-stats"] });
  };

  const inputCls = "rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Operations Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review, approve, and manage incoming field reports.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} className={inputCls}>
            <option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
          <select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value)} className={inputCls}>
            <option value="all">All categories</option><option value="Health">Health</option><option value="Environment">Environment</option><option value="Social">Social</option>
          </select>
          <select value={orgFilter} onChange={(e)=>setOrgFilter(e.target.value)} className={inputCls}>
            <option value="all">All organizations</option>
            <option value="none">— Unassigned —</option>
            {orgOptions.map((o)=> <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">From
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col text-[10px] uppercase tracking-wider text-muted-foreground">To
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className={inputCls} />
          </label>
          {(dateFrom || dateTo || orgFilter !== "all") && (
            <button onClick={()=>{ setDateFrom(""); setDateTo(""); setOrgFilter("all"); }}
              className="rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">Clear</button>
          )}
          <button onClick={()=>exportApproved("csv")} title={`Export ${exportable.length} approved report(s) as CSV`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" /> CSV ({exportable.length})
          </button>
          <button onClick={()=>exportApproved("geojson")} title={`Export ${exportable.length} approved report(s) as GeoJSON`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Download className="h-4 w-4" /> GeoJSON ({exportable.length})
          </button>
          <button onClick={()=>exportApproved("kml")} title={`Export ${exportable.length} approved report(s) as KML for Google Earth`}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent">
            <Download className="h-4 w-4" /> KML ({exportable.length})
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MetricCard icon={<Clock className="h-5 w-5" />} label="Pending" value={counts.pending} tone="bg-amber-500/15 text-amber-700 dark:text-amber-300" />
        <MetricCard icon={<CheckCircle2 className="h-5 w-5" />} label="Approved" value={counts.approved} tone="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" />
        <MetricCard icon={<XCircle className="h-5 w-5" />} label="Rejected" value={counts.rejected} tone="bg-rose-500/15 text-rose-700 dark:text-rose-300" />
      </div>

      <TierRequestsPanel />

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && filtered.length===0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No reports match these filters.</td></tr>}
              {filtered.map((r:any) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.title}</td>
                  <td className="px-4 py-3"><CategoryPill c={r.category} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{r.location_name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.organizations?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {isAdmin ? (
                      <>
                        {r.status !== "approved" && <button onClick={()=>setStatus(r.id,"approved")} className="mr-2 rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:opacity-90">Approve</button>}
                        {r.status !== "rejected" && <button onClick={()=>setStatus(r.id,"rejected")} className="rounded-md border border-input px-3 py-1 text-xs font-semibold hover:bg-accent">Reject</button>}
                      </>
                    ) : <span className="text-xs text-muted-foreground">View only</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
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

function CategoryPill({ c }: { c: string }) {
  const colors: Record<string,string> = { Health: "bg-red-500", Environment: "bg-green-600", Social: "bg-blue-600" };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white ${colors[c]}`}>{c}</span>;
}
function StatusPill({ s }: { s: string }) {
  const map: Record<string,string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  };
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${map[s]}`}>{s}</span>;
}

function TierRequestsPanel() {
  const qc = useQueryClient();
  const { data: requests = [] } = useQuery({
    queryKey: ["tier-requests"],
    queryFn: async () => {
      const { data } = await supabase.from("tier_requests").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const review = async (id: string, status: "approved" | "rejected") => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("tier_requests").update({
      status, reviewed_at: new Date().toISOString(), reviewed_by: user?.id ?? null,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);
    qc.invalidateQueries({ queryKey: ["tier-requests"] });
  };

  const pending = (requests as any[]).filter((r) => r.status === "pending");

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-bold">Tier upgrade applications</h2>
          <p className="text-xs text-muted-foreground">{pending.length} pending review</p>
        </div>
        <Link to="/admin/tier-requests" className="rounded-md border border-input px-3 py-1.5 text-xs font-semibold hover:bg-accent">
          Open full review →
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Justification</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No applications yet.</td></tr>}
            {(requests as any[]).map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 align-top">
                <td className="px-4 py-3"><span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase text-primary">{r.requested_role}</span></td>
                <td className="px-4 py-3">
                  <div className="font-medium">{r.organization_name}</div>
                  <div className="text-xs text-muted-foreground">{r.organization_type}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{r.contact_name}</div>
                  <div className="text-xs text-muted-foreground">{r.contact_phone}</div>
                </td>
                <td className="px-4 py-3 max-w-sm text-xs text-muted-foreground">{r.justification}</td>
                <td className="px-4 py-3"><StatusPill s={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "pending" ? (
                    <>
                      <button onClick={()=>review(r.id, "approved")} className="mr-2 rounded-md bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:opacity-90">Approve</button>
                      <button onClick={()=>review(r.id, "rejected")} className="rounded-md border border-input px-3 py-1 text-xs font-semibold hover:bg-accent">Reject</button>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString() : ""}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
