import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Landmark } from "lucide-react";

export const Route = createFileRoute("/organizations")({
  head: () => ({
    meta: [
      { title: "Organizations Referenced in Submitted Reports — TGIS" },
      { name: "description", content: "NGOs and government bodies referenced in submitted field reports across Nigeria." },
    ],
  }),
  component: OrgsPage,
});

function OrgsPage() {
  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs-page"],
    queryFn: async () => {
      const [{ data: o }, { data: r }] = await Promise.all([
        supabase.from("organizations").select("*").order("name"),
        supabase.from("field_reports").select("organization_id"),
      ]);
      const counts: Record<string, number> = {};
      (r ?? []).forEach((row: any) => { if (row.organization_id) counts[row.organization_id] = (counts[row.organization_id]??0)+1; });
      return (o ?? []).map((org: any) => ({ ...org, reports: counts[org.id] ?? 0 }));
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Organizations Referenced in Submitted Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">{orgs.length} organizations referenced across submitted reports nationwide.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((o: any) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-transform hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${o.type==="NGO" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                {o.type === "NGO" ? <Building2 className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
              </div>
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{o.type}</span>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">{o.name}</h3>
            <div className="mt-2 text-sm text-muted-foreground">{o.reports} report{o.reports===1?"":"s"} contributed</div>
          </div>
        ))}
      </div>
    </div>
  );
}
