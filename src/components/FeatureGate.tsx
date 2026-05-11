import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { useFeatureAccess, type FeatureKey, type Access } from "@/hooks/useAuth";

type Props = {
  feature: FeatureKey;
  required?: Access; // minimum access required to render children (default "full")
  title: string;
  description: string;
  children: React.ReactNode;
};

export function FeatureGate({ feature, required = "full", title, description, children }: Props) {
  const access = useFeatureAccess(feature);
  const hasAccess = required === "limited" ? access !== "none" : access === "full";

  if (hasAccess) {
    return (
      <>
        {access === "limited" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-semibold">Limited access</div>
              <p className="mt-0.5 text-muted-foreground">You're seeing a restricted version of this feature. <Link to="/pricing" className="font-semibold text-foreground underline">Upgrade</Link> for full capabilities.</p>
            </div>
          </div>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="font-display text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">This feature requires a higher tier</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/pricing" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">View tiers</Link>
          <Link to="/auth" className="rounded-md border border-input px-5 py-2.5 text-sm font-semibold hover:bg-accent">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
