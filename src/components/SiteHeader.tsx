import { Link } from "@tanstack/react-router";
import tgisLogo from "@/assets/tgis-logo.png";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Map" },
  { to: "/submit", label: "Submit" },
  { to: "/insights", label: "Insights" },
  { to: "/analytics", label: "Analytics" },
  { to: "/monitoring", label: "Live" },
  { to: "/organizations", label: "Orgs" },
  { to: "/pricing", label: "Tiers" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <img src={tgisLogo} alt="TGIS logo" className="h-10 w-10 rounded-md object-contain" />
          <div className="leading-tight">
            <div className="font-display text-base font-bold text-foreground">TGIS</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">TIJCEF GEOSPATIAL INTELLIGENCE SYSTEM</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <AuthControls />
      </div>
      {/* mobile nav */}
      <div className="border-t border-border md:hidden">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 py-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function AuthControls() {
  const { user, loading, signOut, isAdmin, tier } = useAuth();
  const tierColors: Record<string,string> = {
    member: "bg-muted text-muted-foreground",
    ngo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    enterprise: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    admin: "bg-primary/15 text-primary",
  };
  if (loading) return null;
  if (!user) {
    return (
      <Link to="/auth" className="hidden rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm transition-opacity hover:opacity-90 md:inline-flex">
        Sign in
      </Link>
    );
  }
  return (
    <div className="hidden items-center gap-2 md:flex">
      {tier !== "public" && !isAdmin && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tierColors[tier]}`}>{tier}</span>}
      {isAdmin && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Admin</span>}
      <span className="max-w-[140px] truncate text-xs text-muted-foreground">{user.email}</span>
      <button onClick={() => signOut()} className="rounded-md border border-input px-3 py-2 text-xs font-semibold hover:bg-accent">Sign out</button>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          © {new Date().getFullYear()} <span className="font-semibold text-foreground">TIJCEF</span> — Tijwun Care and Empowerment Foundation
        </div>
        <div>Geospatial intelligence for social impact across Nigeria 🇳🇬</div>
      </div>
    </footer>
  );
}
