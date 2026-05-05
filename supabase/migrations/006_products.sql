-- ═══════════════════════════════════════════════════════════
-- Migration 006 — Produtos e itens de card
-- ═══════════════════════════════════════════════════════════

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text not null default '',
  type        text not null default 'unit' check (type in ('unit', 'sqm')),
  price       numeric not null default 0,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create table public.card_products (
  id           uuid primary key default gen_random_uuid(),
  card_id      uuid not null references public.cards(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_name text not null,
  product_type text not null,
  unit_price   numeric not null,
  quantity     numeric not null default 1,
  width        numeric,
  height       numeric,
  total        numeric not null default 0,
  created_at   timestamptz default now()
);

alter table public.products      enable row level security;
alter table public.card_products enable row level security;

-- Products: all company members read, admins write
create policy "read products" on public.products for select to authenticated
  using (company_id = my_company_id());
create policy "admin manage products" on public.products for all to authenticated
  using  (company_id = my_company_id() and my_role() in ('owner','admin'))
  with check (company_id = my_company_id() and my_role() in ('owner','admin'));

-- Card products: company members read, non-viewers write
create policy "read card_products" on public.card_products for select to authenticated
  using (exists (select 1 from public.cards where id = card_id and company_id = my_company_id()));

create policy "admin all card_products" on public.card_products for all to authenticated
  using  (my_role() in ('owner','admin') and exists (select 1 from public.cards where id = card_id and company_id = my_company_id()))
  with check (my_role() in ('owner','admin') and exists (select 1 from public.cards where id = card_id and company_id = my_company_id()));

create policy "member insert card_products" on public.card_products for insert to authenticated
  with check (my_role() = 'member' and exists (select 1 from public.cards where id = card_id and company_id = my_company_id()));

create policy "member delete card_products" on public.card_products for delete to authenticated
  using (my_role() = 'member' and exists (select 1 from public.cards where id = card_id and company_id = my_company_id()));
