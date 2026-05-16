-- Add blocked column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked boolean NOT NULL DEFAULT false;

-- Enable realtime on profiles so blocked users are kicked out immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- RPC to block/unblock a user (superadmin only)
CREATE OR REPLACE FUNCTION public.admin_set_blocked(p_user_id uuid, p_blocked boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível bloquear sua própria conta';
  END IF;
  UPDATE public.profiles SET blocked = p_blocked WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_blocked TO authenticated;

-- RPC to permanently delete a user (superadmin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT (SELECT is_superadmin FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Não é possível excluir sua própria conta';
  END IF;
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user TO authenticated;
