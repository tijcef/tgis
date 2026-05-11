import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "public" | "member" | "ngo" | "enterprise" | "admin";

const TIER_RANK: Record<Tier, number> = { public: 0, member: 1, ngo: 2, enterprise: 3, admin: 4 };

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  roleChecked: boolean;
  tier: Tier;
  roles: string[];
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null, session: null, loading: true, isAdmin: false, roleChecked: false,
  tier: "public", roles: [], refreshRoles: async () => {}, signOut: async () => {},
});

function deriveTier(roles: string[]): Tier {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("enterprise")) return "enterprise";
  if (roles.includes("ngo")) return "ngo";
  if (roles.length > 0) return "member";
  return "public";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleChecked, setRoleChecked] = useState(false);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r: any) => r.role));
    setRoleChecked(true);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
      if (s?.user) {
        setRoleChecked(false);
        setTimeout(() => { loadRoles(s.user.id); }, 0);
      } else {
        setRoles([]);
        setRoleChecked(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      if (!s?.user) setRoleChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const tier = deriveTier(roles);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session,
      loading,
      isAdmin: roles.includes("admin"),
      roleChecked,
      tier,
      roles,
      refreshRoles: async () => { if (session?.user) await loadRoles(session.user.id); },
      signOut: async () => { await supabase.auth.signOut(); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export type FeatureKey =
  | "maps"
  | "download_basic"
  | "advanced_analytics"
  | "api_access"
  | "team_collab"
  | "custom_reports"
  | "realtime";

export type Access = "none" | "limited" | "full";

const MATRIX: Record<FeatureKey, Record<Tier, Access>> = {
  maps:                { public: "full",    member: "full",    ngo: "full",    enterprise: "full", admin: "full" },
  download_basic:      { public: "limited", member: "full",    ngo: "full",    enterprise: "full", admin: "full" },
  advanced_analytics:  { public: "none",    member: "limited", ngo: "full",    enterprise: "full", admin: "full" },
  api_access:          { public: "none",    member: "none",    ngo: "limited", enterprise: "full", admin: "full" },
  team_collab:         { public: "none",    member: "none",    ngo: "full",    enterprise: "full", admin: "full" },
  custom_reports:      { public: "none",    member: "none",    ngo: "full",    enterprise: "full", admin: "full" },
  realtime:            { public: "none",    member: "limited", ngo: "full",    enterprise: "full", admin: "full" },
};

export function useFeatureAccess(key: FeatureKey): Access {
  const { tier } = useAuth();
  return MATRIX[key][tier];
}

export function tierLabel(t: Tier): string {
  return { public: "Public", member: "Member", ngo: "NGO", enterprise: "Enterprise", admin: "Admin" }[t];
}

export function tierAtLeast(current: Tier, required: Tier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}
