-- ═══════════════════════════════════════════════════════════
-- Migration 005 — Posição dos cards (arrastar para reordenar)
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.cards ADD COLUMN IF NOT EXISTS position float8 DEFAULT 0;

-- Inicializa posições baseado na ordem de criação dentro de cada coluna
UPDATE public.cards c
SET position = sub.rn * 100
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY column_id ORDER BY created_at) AS rn
  FROM public.cards
) sub
WHERE c.id = sub.id;
