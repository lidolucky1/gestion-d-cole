
-- Restrict SELECT on sensitive tables to admins only
DROP POLICY IF EXISTS "authenticated read eleves" ON public.eleves;
CREATE POLICY "admins read eleves" ON public.eleves FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated read notes" ON public.notes;
CREATE POLICY "admins read notes" ON public.notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated read paiements" ON public.paiements;
CREATE POLICY "admins read paiements" ON public.paiements FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "authenticated read presences" ON public.presences;
CREATE POLICY "admins read presences" ON public.presences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Lock down generate_matricule: only admins (who insert eleves) and service_role need it
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_matricule() TO service_role;
-- Allow admins to execute via a wrapper check inside? Default column uses function — defaults run as caller.
-- Re-grant to authenticated but the function body only generates a matricule string; risk is minimal.
GRANT EXECUTE ON FUNCTION public.generate_matricule() TO authenticated;
