-- Add phone to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS phone text;

-- Update register_company to accept phone
CREATE OR REPLACE FUNCTION public.register_company(
  p_company_name text, p_user_name text, p_user_email text, p_phone text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_company_id uuid; v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Usuário já possui empresa';
  END IF;
  INSERT INTO public.companies (name, phone) VALUES (p_company_name, p_phone) RETURNING id INTO v_company_id;
  INSERT INTO public.profiles (id, company_id, name, email, role)
  VALUES (v_uid, v_company_id, p_user_name, p_user_email, 'owner');
  INSERT INTO public.columns (company_id, title, color, position, access_all) VALUES
    (v_company_id, 'Leads',       '#6366f1', 0, true),
    (v_company_id, 'Qualificado', '#f59e0b', 1, true),
    (v_company_id, 'Proposta',    '#38bdf8', 2, true),
    (v_company_id, 'Negociação',  '#a855f7', 3, true),
    (v_company_id, 'Fechado',     '#22c55e', 4, true);
  RETURN v_company_id;
END; $$;
