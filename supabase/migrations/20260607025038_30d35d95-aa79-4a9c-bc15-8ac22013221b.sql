
-- 1. Calendrier scolaire configurable
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS annee_debut_mois INT NOT NULL DEFAULT 8 CHECK (annee_debut_mois BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS annee_debut_jour INT NOT NULL DEFAULT 1 CHECK (annee_debut_jour BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS annee_fin_mois  INT NOT NULL DEFAULT 7 CHECK (annee_fin_mois  BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS annee_fin_jour  INT NOT NULL DEFAULT 31 CHECK (annee_fin_jour  BETWEEN 1 AND 31);

-- 2. Table des réinscriptions
CREATE TABLE IF NOT EXISTS public.reinscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  annee_scolaire TEXT NOT NULL,
  classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  date_reinscription DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, annee_scolaire)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reinscriptions TO authenticated;
GRANT ALL ON public.reinscriptions TO service_role;

ALTER TABLE public.reinscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read reinscriptions" ON public.reinscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write reinscriptions" ON public.reinscriptions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS reinscriptions_eleve_idx ON public.reinscriptions(eleve_id);
CREATE INDEX IF NOT EXISTS reinscriptions_annee_idx ON public.reinscriptions(annee_scolaire);
