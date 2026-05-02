-- ═══════════════════════════════════════════════════════════
-- KanbanCRM — Schema completo com RLS multi-tenant
-- Rodar no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── TABELAS ─────────────────────────────────────────────────

create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  email      text not null,
  role       text not null default 'member'
               check (role in ('owner','admin','member','viewer')),
  created_at timestamptz default now()
);

create table public.columns (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title      text not null,
  color      text not null default '#6366f1',
  position   integer not null default 0,
  access_all boolean not null default true,
  created_at timestamptz default now()
);

create table public.cards (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  column_id    uuid not null references public.columns(id) on delete cascade,
  name         text not null,
  company_name text default '',
  email        text default '',
  phone        text default '',
  value        numeric default 0,
  priority     text default 'medium' check (priority in ('high','medium','low')),
  tags         text[] default '{}',
  notes        text default '',
  created_at   timestamptz default now()
);

create table public.column_permissions (
  id         uuid primary key default gen_random_uuid(),
  column_id  uuid not null references public.columns(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  can_edit   boolean default true,
  unique(column_id, profile_id)
);

create table public.invites (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  role        text not null default 'member' check (role in ('admin','member','viewer')),
  token       text unique not null default encode(gen_random_bytes(16), 'hex'),
  invited_by  uuid references auth.users(id),
  used        boolean default false,
  created_at  timestamptz default now()
);

-- ── FUNÇÕES HELPER ───────────────────────────────────────────

create or replace function public.my_company_id()
returns uuid language sql security definer stable as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ── RLS ──────────────────────────────────────────────────────

alter table public.companies         enable row level security;
alter table public.profiles          enable row level security;
alter table public.columns           enable row level security;
alter table public.cards             enable row level security;
alter table public.column_permissions enable row level security;
alter table public.invites           enable row level security;

-- companies
create policy "members read own company" on public.companies for select to authenticated
  using (id = my_company_id());
create policy "authenticated insert company" on public.companies for insert to authenticated
  with check (true);
create policy "owner update company" on public.companies for update to authenticated
  using (id = my_company_id() and my_role() = 'owner');

-- profiles
create policy "members read company profiles" on public.profiles for select to authenticated
  using (company_id = my_company_id());
create policy "user insert own profile" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "user update own profile" on public.profiles for update to authenticated
  using (id = auth.uid());
create policy "admin delete member" on public.profiles for delete to authenticated
  using (company_id = my_company_id() and my_role() in ('owner','admin') and id != auth.uid() and
         (select role from public.profiles where id = public.profiles.id) != 'owner');

-- columns
create policy "admin manage columns" on public.columns for all to authenticated
  using (company_id = my_company_id() and my_role() in ('owner','admin'))
  with check (company_id = my_company_id() and my_role() in ('owner','admin'));
create policy "member read accessible columns" on public.columns for select to authenticated
  using (
    company_id = my_company_id() and (
      my_role() in ('owner','admin')
      or access_all = true
      or exists (select 1 from public.column_permissions
                 where column_id = public.columns.id and profile_id = auth.uid())
    )
  );

-- cards
create policy "admin manage all cards" on public.cards for all to authenticated
  using (company_id = my_company_id() and my_role() in ('owner','admin'))
  with check (company_id = my_company_id() and my_role() in ('owner','admin'));
create policy "member read cards" on public.cards for select to authenticated
  using (
    company_id = my_company_id() and (
      my_role() in ('owner','admin')
      or exists (
        select 1 from public.columns c where c.id = public.cards.column_id and (
          c.access_all = true
          or exists (select 1 from public.column_permissions cp
                     where cp.column_id = c.id and cp.profile_id = auth.uid())
        )
      )
    )
  );
create policy "member write cards" on public.cards for insert to authenticated
  with check (
    company_id = my_company_id() and my_role() not in ('owner','admin','viewer') and
    exists (
      select 1 from public.columns c where c.id = column_id and (
        c.access_all = true
        or exists (select 1 from public.column_permissions cp
                   where cp.column_id = c.id and cp.profile_id = auth.uid() and cp.can_edit)
      )
    )
  );
create policy "member update cards" on public.cards for update to authenticated
  using (
    company_id = my_company_id() and my_role() not in ('owner','admin','viewer') and
    exists (
      select 1 from public.columns c where c.id = public.cards.column_id and (
        c.access_all = true
        or exists (select 1 from public.column_permissions cp
                   where cp.column_id = c.id and cp.profile_id = auth.uid() and cp.can_edit)
      )
    )
  );

-- column_permissions
create policy "admin manage permissions" on public.column_permissions for all to authenticated
  using (my_role() in ('owner','admin') and
         exists (select 1 from public.columns where id = column_id and company_id = my_company_id()))
  with check (my_role() in ('owner','admin') and
              exists (select 1 from public.columns where id = column_id and company_id = my_company_id()));
create policy "member read own perms" on public.column_permissions for select to authenticated
  using (profile_id = auth.uid());

-- invites
create policy "admin manage invites" on public.invites for all to authenticated
  using (company_id = my_company_id() and my_role() in ('owner','admin'))
  with check (company_id = my_company_id() and my_role() in ('owner','admin'));
create policy "public read invite" on public.invites for select
  using (true);

-- ── FUNÇÕES RPC ──────────────────────────────────────────────

-- Registrar nova empresa
create or replace function public.register_company(
  p_company_name text, p_user_name text, p_user_email text
)
returns uuid language plpgsql security definer as $$
declare v_company_id uuid; v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Não autenticado'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Usuário já possui empresa';
  end if;
  insert into public.companies (name) values (p_company_name) returning id into v_company_id;
  insert into public.profiles (id, company_id, name, email, role)
  values (v_uid, v_company_id, p_user_name, p_user_email, 'owner');
  insert into public.columns (company_id, title, color, position, access_all) values
    (v_company_id, 'Leads',       '#6366f1', 0, true),
    (v_company_id, 'Qualificado', '#f59e0b', 1, true),
    (v_company_id, 'Proposta',    '#38bdf8', 2, true),
    (v_company_id, 'Negociação',  '#a855f7', 3, true),
    (v_company_id, 'Fechado',     '#22c55e', 4, true);
  return v_company_id;
end; $$;

-- Info do convite (público, sem auth)
create or replace function public.get_invite_info(p_token text)
returns json language sql security definer as $$
  select json_build_object(
    'company_name', c.name, 'role', i.role, 'valid', not i.used
  )
  from public.invites i join public.companies c on c.id = i.company_id
  where i.token = p_token limit 1
$$;
grant execute on function public.get_invite_info(text) to anon;

-- Aceitar convite
create or replace function public.accept_invite(p_token text, p_user_name text)
returns json language plpgsql security definer as $$
declare v_invite record; v_uid uuid; v_email text;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'Não autenticado'; end if;
  select * into v_invite from public.invites where token = p_token and used = false;
  if not found then raise exception 'Convite inválido ou já utilizado'; end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Usuário já pertence a uma empresa';
  end if;
  select email into v_email from auth.users where id = v_uid;
  insert into public.profiles (id, company_id, name, email, role)
  values (v_uid, v_invite.company_id, p_user_name, v_email, v_invite.role);
  update public.invites set used = true where token = p_token;
  return json_build_object('role', v_invite.role);
end; $$;

-- Atualizar papel de membro (owner only)
create or replace function public.set_member_role(p_profile_id uuid, p_role text)
returns void language plpgsql security definer as $$
begin
  if my_role() != 'owner' then raise exception 'Apenas o dono pode alterar papéis'; end if;
  if p_role not in ('admin','member','viewer') then raise exception 'Papel inválido'; end if;
  update public.profiles set role = p_role
  where id = p_profile_id and company_id = my_company_id() and id != auth.uid();
end; $$;

-- Remover membro
create or replace function public.remove_member(p_profile_id uuid)
returns void language plpgsql security definer as $$
begin
  if my_role() not in ('owner','admin') then raise exception 'Sem permissão'; end if;
  if p_profile_id = auth.uid() then raise exception 'Não pode se remover'; end if;
  if (select role from public.profiles where id = p_profile_id) = 'owner' then
    raise exception 'Não pode remover o dono'; end if;
  delete from public.profiles where id = p_profile_id and company_id = my_company_id();
end; $$;
