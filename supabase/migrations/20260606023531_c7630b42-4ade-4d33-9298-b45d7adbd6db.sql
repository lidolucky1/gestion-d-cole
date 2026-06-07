
CREATE TABLE public.matieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  coefficient numeric NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matieres TO authenticated;
GRANT ALL ON public.matieres TO service_role;
ALTER TABLE public.matieres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read matieres" ON public.matieres FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage matieres" ON public.matieres FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres(id) ON DELETE CASCADE,
  trimestre int NOT NULL CHECK (trimestre BETWEEN 1 AND 3),
  annee_scolaire text NOT NULL,
  note numeric NOT NULL CHECK (note >= 0),
  note_max numeric NOT NULL DEFAULT 20 CHECK (note_max > 0),
  appreciation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_eleve ON public.notes(eleve_id);
CREATE INDEX idx_notes_lookup ON public.notes(eleve_id, trimestre, annee_scolaire);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read notes" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage notes" ON public.notes FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
