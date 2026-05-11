import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "@/components/FeatureGate";
import { useFeatureAccess } from "@/hooks/useAuth";
import { Code2 } from "lucide-react";

export const Route = createFileRoute("/api-access")({
  head: () => ({
    meta: [
      { title: "API Access — TGIS" },
      { name: "description", content: "Programmatic access to TGIS field report data via REST endpoints." },
    ],
  }),
  component: () => (
    <FeatureGate
      feature="api_access"
      required="limited"
      title="API Access"
      description="API access is available for NGO (limited) and Enterprise (full) tiers."
    >
      <ApiContent />
    </FeatureGate>
  ),
});

function ApiContent() {
  const access = useFeatureAccess("api_access");
  const isLimited = access === "limited";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Code2 className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">API Access</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Build integrations with the TGIS data platform.</p>

      <div className="mt-8 space-y-5">
        <Endpoint method="GET" path="/api/v1/reports" desc="List approved field reports" />
        <Endpoint method="GET" path="/api/v1/reports/:id" desc="Fetch a single report" />
        <Endpoint method="GET" path="/api/v1/organizations" desc="List partner organizations" />
        {!isLimited && <Endpoint method="POST" path="/api/v1/reports" desc="Submit a report on behalf of your org" />}
        {!isLimited && <Endpoint method="GET" path="/api/v1/analytics/trends" desc="Aggregated time-series analytics" />}
        {!isLimited && <Endpoint method="POST" path="/api/v1/webhooks" desc="Register a webhook for real-time events" />}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h3 className="font-display text-base font-bold">Your API key</h3>
        <p className="mt-1 text-xs text-muted-foreground">{isLimited ? "Limited rate-limited key — 1,000 requests/day." : "Full-access key — unlimited requests."}</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 font-mono text-xs">tgis_••••••••••••••••••••</code>
          <button className="rounded-md border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">Reveal</button>
        </div>
      </div>
    </div>
  );
}

function Endpoint({ method, path, desc }: { method: string; path: string; desc: string }) {
  const colors: Record<string, string> = { GET: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", POST: "bg-blue-500/15 text-blue-700 dark:text-blue-300" };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className={`rounded-md px-2 py-1 text-xs font-bold ${colors[method]}`}>{method}</span>
      <code className="flex-1 font-mono text-sm">{path}</code>
      <span className="hidden text-xs text-muted-foreground sm:inline">{desc}</span>
    </div>
  );
}
