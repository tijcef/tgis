import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, Minus } from "lucide-react";
import { useAuth, tierLabel } from "@/hooks/useAuth";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Tiers & Features — TGIS" },
      { name: "description", content: "Compare access tiers — Public, Member, NGO, and Enterprise — and the TGIS features available at each level." },
      { property: "og:title", content: "Tiers & Features — TGIS" },
      { property: "og:description", content: "Compare access tiers — Public, Member, NGO, and Enterprise — and the TGIS features available at each level." },
    ],
  }),
  component: PricingPage,
});

type Cell = "yes" | "no" | "limited";
type Row = { feature: string; values: [Cell, Cell, Cell, Cell] };

const ROWS: Row[] = [
  { feature: "Maps",                values: ["yes", "yes", "yes", "yes"] },
  { feature: "Download Basic Data", values: ["limited", "yes", "yes", "yes"] },
  { feature: "Advanced Analytics",  values: ["no", "limited", "yes", "yes"] },
  { feature: "API Access",          values: ["no", "no", "limited", "yes"] },
  { feature: "Team Collaboration",  values: ["no", "no", "yes", "yes"] },
  { feature: "Custom Reports",      values: ["no", "no", "yes", "yes"] },
  { feature: "Real-Time Monitoring",values: ["no", "limited", "yes", "yes"] },
];

const TIERS = [
  { key: "public",     name: "Public",     desc: "Browse the public map and discover what's happening." },
  { key: "member",     name: "Member",     desc: "Free account. Submit reports and download basic datasets." },
  { key: "ngo",        name: "NGO",        desc: "For non-profit & community organizations operating in the field." },
  { key: "enterprise", name: "Enterprise", desc: "Full API access, advanced controls, and custom integrations." },
] as const;

function CellIcon({ v }: { v: Cell }) {
  if (v === "yes") return <Check className="mx-auto h-5 w-5 text-emerald-600" />;
  if (v === "no") return <X className="mx-auto h-5 w-5 text-muted-foreground/50" />;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      <Minus className="h-3 w-3" /> Limited
    </span>
  );
}

function PricingPage() {
  const { user, tier } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Access tiers</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold sm:text-5xl">Choose how you use TGIS</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Every tier unlocks more of what TGIS can do — from public map browsing to full-stack enterprise integrations.</p>
        {user && (
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-semibold">
            <span className="text-muted-foreground">Your tier:</span>
            <span className="text-foreground">{tierLabel(tier)}</span>
          </div>
        )}
      </div>

      {/* Tier cards */}
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.key} className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h3 className="font-display text-xl font-bold">{t.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t.desc}</p>
            <div className="flex-1" />
            <div className="mt-6">
              {t.key === "public" && (
                <Link to="/map" className="block rounded-md border border-input px-4 py-2 text-center text-sm font-semibold hover:bg-accent">Explore map</Link>
              )}
              {t.key === "member" && (
                <Link to="/auth" className="block rounded-md bg-secondary px-4 py-2 text-center text-sm font-semibold text-secondary-foreground hover:opacity-90">
                  {user ? "Manage account" : "Create free account"}
                </Link>
              )}
              {(t.key === "ngo" || t.key === "enterprise") && (
                <Link to="/register-organization" search={{ tier: t.key }} className="block rounded-md bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Apply as {t.name}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-4 text-left">Feature</th>
                {TIERS.map((t) => <th key={t.key} className="px-4 py-4 text-center">{t.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((r) => (
                <tr key={r.feature} className="hover:bg-muted/30">
                  <td className="px-5 py-4 font-medium">{r.feature}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className="px-4 py-4 text-center">
                      <CellIcon v={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
