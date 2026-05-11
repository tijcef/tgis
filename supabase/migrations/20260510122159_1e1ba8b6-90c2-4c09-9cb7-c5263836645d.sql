
CREATE TABLE public.tier_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  requested_role public.app_role NOT NULL,
  organization_name text,
  organization_type text,
  contact_name text,
  contact_phone text,
  justification text,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tier requests" ON public.tier_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tier requests" ON public.tier_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND requested_role IN ('ngo','enterprise'));

CREATE POLICY "Admins view all tier requests" ON public.tier_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update tier requests" ON public.tier_requests
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_tier_requests_updated_at
  BEFORE UPDATE ON public.tier_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_tier_request_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, NEW.requested_role)
    ON CONFLICT DO NOTHING;

    IF NEW.requested_role = 'ngo' AND NEW.organization_name IS NOT NULL THEN
      INSERT INTO public.organizations (name, type)
      VALUES (NEW.organization_name, COALESCE(NEW.organization_type, 'NGO'));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_tier_request_approval() FROM PUBLIC, authenticated, anon;

CREATE TRIGGER on_tier_request_approval
  AFTER UPDATE ON public.tier_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_tier_request_approval();
