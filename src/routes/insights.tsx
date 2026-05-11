import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Insights — TGIS" },
      { name: "description", content: "Geospatial intelligence: trends, hotspots, and category breakdowns from approved field reports." },
    ],
  }),
  component: InsightsPage,
});

const COLORS = { Health: "#dc2626", Environment: "#16a34a", Social: "#2563eb" } as const;

function InsightsPage() {
  const { data: reports = [] } = useQuery({
    queryKey: ["insights-reports"],
    queryFn: async () => (await supabase.from("field_reports").select("*").eq("status","approved")).data ?? [],
  });

  const total = reports.length;
  const byCat = ["Health","Environment","Social"].map((c) => ({ name: c, value: reports.filter((r:any)=>r.category===c).length }));

  // Monthly trend
  const months: Record<string, number> = {};
  reports.forEach((r: any) => {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    months[key] = (months[key] ?? 0) + 1;
  });
  const trend = Object.entries(months).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>({ month: k, reports: v }));

  // Top locations
  const locs: Record<string, number> = {};
  reports.forEach((r:any) => { if (r.location_name) locs[r.location_name] = (locs[r.location_name]??0)+1; });
  const topLocs = Object.entries(locs).sort((a,b)=>b[1]-a[1]).slice(0,8);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Geospatial Insights</h1>
      <p className="mt-1 text-sm text-muted-foreground">Aggregate analytics across {total} approved reports.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Stat label="Total Reports" value={total} accent="bg-primary" />
        <Stat label="Health Cases" value={byCat[0].value} accent="bg-[var(--health)]" />
        <Stat label="Environmental" value={byCat[1].value} accent="bg-[var(--environment)]" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Reports by category">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="name" outerRadius={100} label>
                {byCat.map((e) => <Cell key={e.name} fill={COLORS[e.name as keyof typeof COLORS]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Reports over time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="reports" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Top affected locations" className="mt-6">
        <ul className="divide-y divide-border">
          {topLocs.length === 0 && <li className="py-3 text-sm text-muted-foreground">No location data yet.</li>}
          {topLocs.map(([loc, count]) => (
            <li key={loc} className="flex items-center justify-between py-3">
              <span className="text-sm font-medium">{loc}</span>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{count} report{count>1?"s":""}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className={`mb-3 inline-block h-1.5 w-10 rounded-full ${accent}`} />
      <div className="text-4xl font-extrabold text-foreground">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
function Card({ title, children, className="" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] ${className}`}>
      <h3 className="mb-4 font-display text-lg font-semibold">{title}</h3>
      {children}
    </div>
  );
}
