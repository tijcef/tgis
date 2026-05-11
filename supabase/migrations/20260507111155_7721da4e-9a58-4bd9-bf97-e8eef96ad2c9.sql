
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('NGO','Government')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Health','Environment','Social')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_field_reports_status ON public.field_reports(status);
CREATE INDEX idx_field_reports_category ON public.field_reports(category);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

-- Public read on organizations
CREATE POLICY "orgs read" ON public.organizations FOR SELECT USING (true);

-- Public read on all reports (dashboard needs to see pending too for MVP demo)
CREATE POLICY "reports read" ON public.field_reports FOR SELECT USING (true);

-- Anyone can submit reports (defaults to pending)
CREATE POLICY "reports insert" ON public.field_reports FOR INSERT WITH CHECK (true);

-- Anyone can update report status (MVP demo - dashboard approve/reject)
CREATE POLICY "reports update" ON public.field_reports FOR UPDATE USING (true) WITH CHECK (true);
