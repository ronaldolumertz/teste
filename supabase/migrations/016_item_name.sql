-- Custom item name per company (e.g. "Pedido", "Lead", "Projeto")
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS item_name TEXT NOT NULL DEFAULT 'Item';
