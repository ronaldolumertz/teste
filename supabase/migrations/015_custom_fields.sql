-- Custom field values per card (populated by user-defined fields in companies.item_fields)
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}';
