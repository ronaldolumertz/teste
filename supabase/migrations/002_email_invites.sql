-- ═══════════════════════════════════════════════════════════
-- Migration 002 — Convites com e-mail específico
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Adicionar coluna invited_email na tabela invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS invited_email text;

-- Atualizar get_invite_info para retornar invited_email
CREATE OR REPLACE FUNCTION public.get_invite_info(p_token text)
RETURNS json LANGUAGE sql SECURITY DEFINER AS $$
  SELECT json_build_object(
    'company_name', c.name,
    'role',         i.role,
    'valid',        NOT i.used,
    'invited_email', i.invited_email
  )
  FROM public.invites i JOIN public.companies c ON c.id = i.company_id
  WHERE i.token = p_token LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_invite_info(text) TO anon;

-- Atualizar accept_invite para validar o e-mail
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text, p_user_name text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_invite record; v_uid uuid; v_email text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO v_invite FROM public.invites WHERE token = p_token AND used = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Convite inválido ou já utilizado'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Usuário já pertence a uma empresa';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_invite.invited_email IS NOT NULL AND lower(v_email) != lower(v_invite.invited_email) THEN
    RAISE EXCEPTION 'Este convite é destinado ao e-mail: %', v_invite.invited_email;
  END IF;
  INSERT INTO public.profiles (id, company_id, name, email, role)
  VALUES (v_uid, v_invite.company_id, p_user_name, v_email, v_invite.role);
  UPDATE public.invites SET used = true WHERE token = p_token;
  RETURN json_build_object('role', v_invite.role);
END; $$;
