-- ═══════════════════════════════════════════════════════════
-- Migration 018 — Liberar e-mail ao excluir membro
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════
--
-- Problema: remove_member apagava apenas a linha em public.profiles,
-- mas mantinha o auth.users intacto. O e-mail ficava preso no sistema,
-- impedindo re-convite ou novo cadastro com o mesmo endereço.
--
-- Solução: ao remover o membro, apagar também o usuário em auth.users.
-- As tabelas dependentes (auth.sessions, auth.identities,
-- auth.refresh_tokens) possuem FK com ON DELETE CASCADE, então são
-- limpas automaticamente.
-- A linha em public.profiles é deletada explicitamente antes (garante
-- que a validação de empresa ocorra antes de qualquer cascade).
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.remove_member(p_profile_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Verificar permissão
  IF my_role() NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  -- Não pode se auto-remover
  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Não pode se remover';
  END IF;

  -- Não pode remover o dono
  IF (SELECT role FROM public.profiles WHERE id = p_profile_id) = 'owner' THEN
    RAISE EXCEPTION 'Não pode remover o dono';
  END IF;

  -- Confirmar que o membro pertence à mesma empresa do admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND company_id = my_company_id()
  ) THEN
    RAISE EXCEPTION 'Membro não encontrado';
  END IF;

  -- 1. Remover o perfil (cascateia column_permissions e similares)
  DELETE FROM public.profiles
  WHERE id = p_profile_id AND company_id = my_company_id();

  -- 2. Remover o usuário de auth.users — libera o e-mail completamente.
  --    Isso cascateia: auth.sessions, auth.identities, auth.refresh_tokens.
  --    Qualquer sessão ativa do membro é invalidada imediatamente.
  DELETE FROM auth.users WHERE id = p_profile_id;

END; $$;
