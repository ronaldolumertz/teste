-- Default entry column per company (used by the top "+ Adicionar" button)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS default_column_id UUID REFERENCES public.columns(id) ON DELETE SET NULL;
