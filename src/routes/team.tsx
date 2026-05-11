import { createFileRoute } from "@tanstack/react-router";
import { FeatureGate } from "@/components/FeatureGate";
import { Users, UserPlus, Mail } from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Collaboration — TGIS" },
      { name: "description", content: "Invite team members and collaborate on field intelligence inside your organization." },
    ],
  }),
  component: () => (
    <FeatureGate
      feature="team_collab"
      title="Team Collaboration"
      description="Team workspaces are available for NGO and Enterprise tiers."
    >
      <TeamContent />
    </FeatureGate>
  ),
});

function TeamContent() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <div className="flex items-center gap-3">
        <Users className="h-7 w-7 text-primary" />
        <h1 className="font-display text-3xl font-bold">Team Collaboration</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Invite collaborators and manage roles inside your organization.</p>

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Invite by email</label>
            <input className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="teammate@org.org" />
          </div>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option>Member</option><option>Editor</option><option>Owner</option>
          </select>
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            <UserPlus className="h-4 w-4" /> Send invite
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3 flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />you@org.org</td><td className="px-4 py-3 font-medium">Owner</td><td className="px-4 py-3 text-emerald-600">Active</td></tr>
            <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No other team members yet.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
