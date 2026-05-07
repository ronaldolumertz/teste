CREATE TABLE public.sectors (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title      text NOT NULL DEFAULT 'Novo Setor',
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read own company sectors"
  ON public.sectors FOR SELECT
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins manage sectors"
  ON public.sectors FOR ALL
  USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner','admin')
  ));

ALTER TABLE public.columns ADD COLUMN sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;
