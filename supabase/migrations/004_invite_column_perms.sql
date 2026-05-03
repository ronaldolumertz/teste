-- ═══════════════════════════════════════════════════════════
-- Migration 004 — Permissões de colunas no convite
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Adicionar campo column_perms na tabela invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS column_perms jsonb DEFAULT '[]';

-- Atualizar accept_invite para aplicar permissões ao aceitar
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text, p_user_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_invite record; v_uid uuid; v_email text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_invite FROM public.invites WHERE token = p_token AND used = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite inválido ou já utilizado'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Usuário já pertence a uma empresa'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_invite.invited_email IS NOT NULL AND lower(v_email) != lower(v_invite.invited_email) THEN
    RAISE EXCEPTION 'Este convite é destinado ao e-mail: %', v_invite.invited_email; END IF;
  INSERT INTO public.profiles (id, company_id, name, email, role)
  VALUES (v_uid, v_invite.company_id, p_user_name, v_email, v_invite.role);
  IF v_invite.column_perms IS NOT NULL AND jsonb_array_length(v_invite.column_perms) > 0 THEN
    INSERT INTO public.column_permissions (column_id, profile_id, can_edit)
    SELECT (perm->>'column_id')::uuid, v_uid, (perm->>'can_edit')::boolean
    FROM jsonb_array_elements(v_invite.column_perms) AS perm
    ON CONFLICT (column_id, profile_id) DO UPDATE SET can_edit = EXCLUDED.can_edit;
  END IF;
  UPDATE public.invites SET used = true WHERE token = p_token;
  RETURN json_build_object('role', v_invite.role);
END; $$;
