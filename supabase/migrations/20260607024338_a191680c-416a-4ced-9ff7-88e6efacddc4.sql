
CREATE OR REPLACE FUNCTION public.generate_matricule()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'ELV-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(nextval('public.matricule_seq')::TEXT, 5, '0');
END;
$function$;

GRANT USAGE ON SEQUENCE public.matricule_seq TO authenticated;
