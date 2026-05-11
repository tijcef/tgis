import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureAccess } from "@/hooks/useAuth";
import { TrendingUp, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Advanced Analytics — TGIS" },
      { name: "description", content: "Trend analysis, category breakdowns, and time-series insights from approved field reports." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <FeatureGate
      feature="advanced_analytics"
      required="limited"
      title="Advanced Analytics"
      description="Members get a limited preview. NGO and Enterprise tiers unlock full analytics, trends, and exports."
    >
      <AnalyticsContent />
    </FeatureGate>
  );
}

function AnalyticsContent() {
  const access = useFeatureAccess("advanced_analytics");
  const isLimited = access === "limited";

  const { data: reports = [] } = useQuery({
    queryKey: ["analytics-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("field_reports").select("category,status,created_at").eq("status", "approved");
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const byCat: Record<string, number> = { Health: 0, Environment: 0, Social: 0 };
    const byMonth: Record<string, number> = {};
    for (const r of reports as any[]) {
      byCat[r.category] = (byCat[r.category] ?? 0) + 1;
      const m = (r.created_at as string).slice(0, 7);
      byMonth[m] = (byMonth[m] ?? 0) + 1;
    }
    const months = Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b));
    const max = Math.max(1, ...months.map(([,v]) => v));
    return { byCat, months, max };
  }, [reports]);

  const visibleMonths = isLimited ? stats.months.slice(-3) : stats.months;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Advanced Analytics</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Insights derived from approved field reports.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {Object.entries(stats.byCat).map(([cat, n]) => (
          <div key={cat} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{cat}</div>
            <div className="mt-1 text-3xl font-extrabold">{n}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-lg font-bold">Reports by month {isLimited && <span className="text-xs font-normal text-muted-foreground">(last 3 months)</span>}</h2>
        </div>
        <div className="mt-6 flex h-48 items-end gap-2">
          {visibleMonths.length === 0 && <div className="text-sm text-muted-foreground">Not enough data yet.</div>}
          {visibleMonths.map(([month, count]) => (
            <div key={month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${(count / stats.max) * 100}%` }} title={`${count} reports`} />
              </div>
              <div className="text-[10px] text-muted-foreground">{month}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
