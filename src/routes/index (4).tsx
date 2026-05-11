import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, FileText, Users, ArrowRight, Activity, Leaf, Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TGIS — Geospatial Intelligence for Social Impact" },
      { name: "description", content: "TIJCEF's national geospatial platform: collect field data, visualize hotspots, and drive evidence-based action across Nigeria." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["home-stats"],
    queryFn: async () => {
      const [{ count: reportCount }, { data: locs }, { count: orgCount }] = await Promise.all([
        supabase.from("field_reports").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("field_reports").select("location_name").eq("status", "approved"),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
      ]);
      const uniqueLocs = new Set((locs ?? []).map((l) => l.location_name).filter(Boolean)).size;
      return { reports: reportCount ?? 0, locations: uniqueLocs, orgs: orgCount ?? 0 };
    },
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 0px, transparent 2px), radial-gradient(circle at 70% 60%, white 0px, transparent 2px)", backgroundSize: "40px 40px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-3xl text-primary-foreground">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
              Live national platform
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Geospatial Intelligence for Social Impact
            </h1>
            <p className="mt-5 text-lg text-white/90 sm:text-xl">
              TGIS empowers NGOs, government agencies, and field workers to collect,
              analyze, and visualize on-the-ground data on health, environment, and
              social issues across Nigeria.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/map" className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-primary shadow-lg transition-transform hover:-translate-y-0.5">
                <MapPin className="h-5 w-5" /> View Map
              </Link>
              <Link to="/submit" className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
                <FileText className="h-5 w-5" /> Submit Report
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)] sm:grid-cols-3">
          <StatCard icon={<FileText className="h-5 w-5" />} label="Approved Reports" value={stats?.reports ?? "—"} />
          <StatCard icon={<MapPin className="h-5 w-5" />} label="Active Locations" value={stats?.locations ?? "—"} />
          <StatCard icon={<Users className="h-5 w-5" />} label="Partner Organizations" value={stats?.orgs ?? "—"} />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Three lenses on impact</h2>
          <p className="mt-3 text-muted-foreground">Every report is categorized so partners can rapidly identify trends and act.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <CategoryCard color="health" icon={<Heart className="h-6 w-6" />} title="Health" desc="Disease outbreaks, vaccination drives, maternal care, and water safety." />
          <CategoryCard color="environment" icon={<Leaf className="h-6 w-6" />} title="Environment" desc="Floods, deforestation, pollution, and coastal erosion monitoring." />
          <CategoryCard color="social" icon={<Activity className="h-6 w-6" />} title="Social" desc="Education access, gender-based violence, displacement, and youth empowerment." />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-primary to-secondary p-10 text-primary-foreground shadow-[var(--shadow-elegant)]">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-xl">
              <h3 className="font-display text-2xl font-bold sm:text-3xl">Become a TGIS field partner</h3>
              <p className="mt-2 text-white/90">Register your NGO or enterprise to access analytics, custom reports, real-time monitoring, and team collaboration.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/register-organization" search={{ tier: "ngo" }} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-primary hover:bg-white/90">
                Register NGO <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur hover:bg-white/20">
                Compare tiers
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-muted/40 p-5">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">{icon}</div>
      <div>
        <div className="text-3xl font-extrabold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function CategoryCard({ color, icon, title, desc }: { color: "health"|"environment"|"social"; icon: React.ReactNode; title: string; desc: string }) {
  const bg = color === "health" ? "bg-[var(--health)]" : color === "environment" ? "bg-[var(--environment)]" : "bg-[var(--social)]";
  return (
    <div className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${bg} text-white`}>{icon}</div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
