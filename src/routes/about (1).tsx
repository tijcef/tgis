import { createFileRoute } from "@tanstack/react-router";
import { Globe2, Target, Sparkles } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About TGIS — TIJCEF" },
      { name: "description", content: "Learn about the TIJCEF Geospatial Intelligence System and how it powers data-driven social impact." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> About TGIS
      </div>
      <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Mapping Nigeria's most important challenges</h1>
      <p className="mt-5 text-lg text-muted-foreground">
        The TIJCEF GEOSPATIAL INTELLIGENCE SYSTEM (TGIS) turns scattered field
        observations into a unified, location-aware intelligence layer for the
        organizations working on Nigeria's most pressing health, environmental,
        and social issues.
      </p>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        <Card icon={<Target className="h-5 w-5" />} title="Our mission">
          To equip frontline NGOs, government agencies, and field workers with
          shared, evidence-grade geospatial data so that resources, response,
          and policy can be directed where they matter most.
        </Card>
        <Card icon={<Globe2 className="h-5 w-5" />} title="TIJCEF's role">
          The Tijwun Care and Empowerment Foundation builds, hosts, and curates
          TGIS as public-good infrastructure — independent, multi-stakeholder,
          and free for field partners to use.
        </Card>
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
        <h2 className="font-display text-2xl font-bold">How the data is used</h2>
        <ul className="mt-4 space-y-3 text-muted-foreground">
          <li>• <span className="font-medium text-foreground">Early warning:</span> outbreaks, floods, and crises are flagged on the live map within hours.</li>
          <li>• <span className="font-medium text-foreground">Coordinated response:</span> partner organizations see who is operating where, reducing duplication.</li>
          <li>• <span className="font-medium text-foreground">Policy & advocacy:</span> aggregated insights inform government decisions and donor priorities.</li>
          <li>• <span className="font-medium text-foreground">Accountability:</span> verified, geo-tagged reports build a transparent public record of impact.</li>
        </ul>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
