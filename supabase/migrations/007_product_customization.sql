-- Migration 007 — Personalização de produtos e anexos
-- Rodar no Supabase SQL Editor

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS customizable    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_attachments integer NOT NULL DEFAULT 3;

ALTER TABLE public.card_products
  ADD COLUMN IF NOT EXISTS customization_notes text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachments         jsonb   NOT NULL DEFAULT '[]'::jsonb;

-- Bucket de armazenamento para anexos
INSERT INTO storage.buckets (id, name, public)
VALUES ('card-attachments', 'card-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage (autenticados da empresa podem ler/escrever)
DROP POLICY IF EXISTS "auth read card-attachments"   ON storage.objects;
DROP POLICY IF EXISTS "auth insert card-attachments" ON storage.objects;
DROP POLICY IF EXISTS "auth delete card-attachments" ON storage.objects;

CREATE POLICY "auth read card-attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'card-attachments');

CREATE POLICY "auth insert card-attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'card-attachments');

CREATE POLICY "auth delete card-attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'card-attachments');

NOTIFY pgrst, 'reload schema';
