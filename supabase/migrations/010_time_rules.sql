-- Migration 010 — Regras de cor por tempo na coluna

ALTER TABLE public.columns ADD COLUMN IF NOT EXISTS time_rules jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.cards   ADD COLUMN IF NOT EXISTS column_entered_at timestamptz DEFAULT now();

-- Inicializa coluna existente com a data de criação do card
UPDATE public.cards SET column_entered_at = created_at WHERE column_entered_at IS NULL;

NOTIFY pgrst, 'reload schema';
