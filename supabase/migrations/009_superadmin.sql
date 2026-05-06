-- Migration 009 — Super Admin

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_superadmin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$;

DROP POLICY IF EXISTS "superadmin read all companies"   ON public.companies;
DROP POLICY IF EXISTS "superadmin read all profiles"    ON public.profiles;
DROP POLICY IF EXISTS "superadmin read all columns"     ON public.columns;
DROP POLICY IF EXISTS "superadmin read all cards"       ON public.cards;
DROP POLICY IF EXISTS "superadmin read all products"    ON public.products;
DROP POLICY IF EXISTS "superadmin read all card_products" ON public.card_products;

CREATE POLICY "superadmin read all companies"   ON public.companies   FOR SELECT TO authenticated USING (is_superadmin());
CREATE POLICY "superadmin read all profiles"    ON public.profiles    FOR SELECT TO authenticated USING (is_superadmin());
CREATE POLICY "superadmin read all columns"     ON public.columns     FOR SELECT TO authenticated USING (is_superadmin());
CREATE POLICY "superadmin read all cards"       ON public.cards       FOR SELECT TO authenticated USING (is_superadmin());
CREATE POLICY "superadmin read all products"    ON public.products    FOR SELECT TO authenticated USING (is_superadmin());
CREATE POLICY "superadmin read all card_products" ON public.card_products FOR SELECT TO authenticated USING (is_superadmin());

NOTIFY pgrst, 'reload schema';
