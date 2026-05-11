import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportPoint } from "@/components/MapView";

const MapView = lazy(() => import("@/components/MapView").then((m) => ({ default: m.MapView })));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Interactive Map — TGIS" },
      { name: "description", content: "Explore approved field reports across Nigeria on an interactive geospatial map." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [category, setCategory] = useState<string>("All");
  const [orgId, setOrgId] = useState<string>("All");
  const [days, setDays] = useState<number>(0);

  const { data: reports = [] } = useQuery({
    queryKey: ["map-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_reports")
        .select("id,title,description,category,latitude,longitude,location_name,created_at,organization_id")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: async () => {
      const { data } = await supabase.from("organizations").select("id,name").order("name");
      return data ?? [];
    },
  });

  const filtered = useMemo<ReportPoint[]>(() => {
    const since = days > 0 ? Date.now() - days * 86400000 : 0;
    return (reports as any[]).filter((r: any) =>
      (category === "All" || r.category === category) &&
      (orgId === "All" || r.organization_id === orgId) &&
      (since === 0 || new Date(r.created_at).getTime() >= since)
    ) as ReportPoint[];
  }, [reports, category, orgId, days]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="font-display text-3xl font-bold">Live Field Map</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} of {reports.length} approved reports shown.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={category} onChange={setCategory} options={["All","Health","Environment","Social"]} />
          <Select value={orgId} onChange={setOrgId}
            options={[{value:"All",label:"All organizations"}, ...orgs.map((o:any)=>({value:o.id,label:o.name}))]} />
          <Select value={String(days)} onChange={(v) => setDays(Number(v))}
            options={[{value:"0",label:"All time"},{value:"7",label:"Last 7 days"},{value:"30",label:"Last 30 days"},{value:"90",label:"Last 90 days"}]} />
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <Legend color="#dc2626" label="Health" />
        <Legend color="#16a34a" label="Environment" />
        <Legend color="#2563eb" label="Social" />
      </div>
      {mounted ? (
        <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-muted" />}>
          <MapView reports={filtered as ReportPoint[]} />
        </Suspense>
      ) : (
        <div className="h-[70vh] animate-pulse rounded-xl bg-muted" />
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /> {label}
    </span>
  );
}

type Opt = string | { value: string; label: string };
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}
