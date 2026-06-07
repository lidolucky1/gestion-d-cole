
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.sexe_enum AS ENUM ('M', 'F');
CREATE TYPE public.presence_statut AS ENUM ('present', 'absent', 'retard');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Trigger to auto-create profile + give first user admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);

  SELECT COUNT(*) INTO user_count FROM public.profiles;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Classes
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  niveau TEXT,
  annee_scolaire TEXT,
  frais_scolaire NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage classes" ON public.classes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sequence for matricule
CREATE SEQUENCE public.matricule_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_matricule()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'ELV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.matricule_seq')::TEXT, 5, '0');
END;
$$;

-- Eleves
CREATE TABLE public.eleves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricule TEXT NOT NULL UNIQUE DEFAULT public.generate_matricule(),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  sexe public.sexe_enum NOT NULL,
  date_naissance DATE,
  adresse TEXT,
  telephone_parents TEXT,
  classe_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  photo_url TEXT,
  date_inscription DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eleves TO authenticated;
GRANT ALL ON public.eleves TO service_role;
ALTER TABLE public.eleves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read eleves" ON public.eleves FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage eleves" ON public.eleves FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Presences
CREATE TABLE public.presences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  date_presence DATE NOT NULL DEFAULT CURRENT_DATE,
  statut public.presence_statut NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (eleve_id, date_presence)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presences TO authenticated;
GRANT ALL ON public.presences TO service_role;
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read presences" ON public.presences FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage presences" ON public.presences FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Paiements
CREATE TABLE public.paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id UUID NOT NULL REFERENCES public.eleves(id) ON DELETE CASCADE,
  montant NUMERIC(12,2) NOT NULL CHECK (montant > 0),
  date_paiement DATE NOT NULL DEFAULT CURRENT_DATE,
  motif TEXT,
  recu_numero TEXT NOT NULL UNIQUE DEFAULT ('RECU-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paiements TO authenticated;
GRANT ALL ON public.paiements TO service_role;
ALTER TABLE public.paiements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read paiements" ON public.paiements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage paiements" ON public.paiements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
