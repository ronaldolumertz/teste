-- Add app_name and app_logo_url to get_app_settings RPC
CREATE OR REPLACE FUNCTION public.get_app_settings()
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT json_object_agg(key, value) FROM public.system_settings
     WHERE key IN ('default_accent', 'app_icon_url', 'app_name', 'app_logo_url')),
    '{}'::json
  )
$$;
GRANT EXECUTE ON FUNCTION public.get_app_settings() TO anon, authenticated;
