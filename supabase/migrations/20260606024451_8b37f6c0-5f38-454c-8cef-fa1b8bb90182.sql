
CREATE TABLE public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  etablissement_nom text NOT NULL DEFAULT 'Mon École',
  periode_type text NOT NULL DEFAULT 'trimestre' CHECK (periode_type IN ('trimestre','semestre')),
  nb_periodes int NOT NULL DEFAULT 3 CHECK (nb_periodes BETWEEN 1 AND 4),
  annees_scolaires text[] NOT NULL DEFAULT ARRAY['2025-2026'],
  annee_courante text NOT NULL DEFAULT '2025-2026',
  devise text NOT NULL DEFAULT 'Ar',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS droit_inscription numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.paiements ADD COLUMN IF NOT EXISTS type_paiement text NOT NULL DEFAULT 'ecolage'
  CHECK (type_paiement IN ('droit_inscription','ecolage','autre'));
