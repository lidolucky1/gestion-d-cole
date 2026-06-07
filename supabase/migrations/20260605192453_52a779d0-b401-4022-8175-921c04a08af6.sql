
-- Fix search_path warnings
ALTER FUNCTION public.generate_matricule() SET search_path = public;

-- Revoke EXECUTE from public/authenticated/anon on SECURITY DEFINER fns
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_matricule() FROM PUBLIC, anon;
-- has_role must remain callable by authenticated users for RLS policy usage via security definer
-- Keep authenticated EXECUTE on has_role (it's the standard pattern), revoke from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;

-- Storage RLS for eleves-photos bucket
CREATE POLICY "auth read eleves photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'eleves-photos');
CREATE POLICY "admin write eleves photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'eleves-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update eleves photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'eleves-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete eleves photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'eleves-photos' AND public.has_role(auth.uid(), 'admin'));
