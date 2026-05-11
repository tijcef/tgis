import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureAccess } from "@/hooks/useAuth";
import { Radio } from "lucide-react";

export const Route = createFileRoute("/monitoring")({
  head: () => ({
    meta: [
      { title: "Real-Time Monitoring — TGIS" },
      { name: "description", content: "Live feed of incoming field reports across the network." },
    ],
  }),
  component: () => (
    <FeatureGate
      feature="realtime"
      required="limited"
      title="Real-Time Monitoring"
      description="Members get a 5-minute delayed feed. NGO and Enterprise tiers unlock the live stream."
    >
      <MonitoringContent />
    </FeatureGate>
  ),
});

function MonitoringContent() {
  const access = useFeatureAccess("realtime");
  const isLimited = access === "limited";

  const { data: reports = [] } = useQuery({
    queryKey: ["realtime-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("field_reports")
        .select("id,title,category,status,location_name,created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    refetchInterval: isLimited ? 60000 : 5000,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Radio className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Real-Time Monitoring</h1>
        <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> {isLimited ? "Delayed feed" : "Live"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{isLimited ? "Updates every 60 seconds. Upgrade for true real-time streaming." : "Updates every few seconds as field workers submit reports."}</p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(reports as any[]).map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</td>
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3">{r.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.location_name ?? "—"}</td>
                <td className="px-4 py-3 capitalize">{r.status}</td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No recent activity.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
