import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crosshair, Loader2 } from "lucide-react";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit Field Report — TGIS" },
      { name: "description", content: "Submit a geo-tagged field report on health, environment, or social issues." },
    ],
  }),
  component: SubmitPage,
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(["Health","Environment","Social"]),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  location_name: z.string().trim().max(200).optional().or(z.literal("")),
  organization_id: z.string().uuid().optional().or(z.literal("")),
});

function SubmitPage() {
  const navigate = useNavigate();
  const { data: orgs = [] } = useQuery({
    queryKey: ["orgs"],
    queryFn: async () => (await supabase.from("organizations").select("id,name").order("name")).data ?? [],
  });
  const [form, setForm] = useState({
    title: "", description: "", category: "Health" as "Health"|"Environment"|"Social",
    latitude: "" as string | number, longitude: "" as string | number,
    location_name: "", organization_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const detect = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", Number(pos.coords.latitude.toFixed(6)));
        set("longitude", Number(pos.coords.longitude.toFixed(6)));
        toast.success("Location detected");
        setLocating(false);
      },
      () => { toast.error("Unable to detect location"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({
      ...form,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
    });
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("field_reports").insert({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      location_name: parsed.data.location_name || null,
      organization_id: parsed.data.organization_id || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted — awaiting approval");
    navigate({ to: "/" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold">Submit a Field Report</h1>
      <p className="mt-1 text-sm text-muted-foreground">Reports are reviewed before appearing on the public map.</p>

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <Field label="Title">
          <input value={form.title} onChange={(e)=>set("title",e.target.value)} className={inputCls} placeholder="e.g. Cholera outbreak monitoring" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e)=>set("description",e.target.value)} rows={4} className={inputCls} placeholder="What did you observe? Affected population, severity, immediate needs..." />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <select value={form.category} onChange={(e)=>set("category",e.target.value)} className={inputCls}>
              <option>Health</option><option>Environment</option><option>Social</option>
            </select>
          </Field>
          <Field label="Organization (optional)">
            <select value={form.organization_id} onChange={(e)=>set("organization_id",e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {orgs.map((o:any)=> <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Location name (optional)">
          <input value={form.location_name} onChange={(e)=>set("location_name",e.target.value)} className={inputCls} placeholder="e.g. Maiduguri, Borno" />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Latitude">
            <input type="number" step="any" value={form.latitude} onChange={(e)=>set("latitude",e.target.value)} className={inputCls} placeholder="9.0820" />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" value={form.longitude} onChange={(e)=>set("longitude",e.target.value)} className={inputCls} placeholder="8.6753" />
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={detect} disabled={locating}
              className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
              Auto-detect
            </button>
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-60">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit Report
        </button>
      </form>
    </div>
  );
}

const inputCls = "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-foreground">{label}</div>
      {children}
    </label>
  );
}
