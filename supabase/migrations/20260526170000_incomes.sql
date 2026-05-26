-- ============================================================================
-- 수입(income) — incomes + recurring_incomes 테이블 + RLS + partner_id 트리거
-- ============================================================================

-- ─── incomes (일회성 수입) ───────────────────────────────────────────────────
create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id),
  amount integer not null check (amount >= 0),
  category text not null,
  memo text,
  received_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index incomes_user_received_idx on public.incomes (user_id, received_at desc);
create index incomes_partner_idx       on public.incomes (partner_id) where partner_id is not null;

alter table public.incomes enable row level security;
create policy "incomes_all_own_or_partner" on public.incomes for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

create trigger incomes_set_partner_id
  before insert on public.incomes
  for each row execute function public.set_partner_id_on_insert();

-- ─── recurring_incomes (정기 수입) ────────────────────────────────────────────
create table public.recurring_incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_id uuid references auth.users(id),
  name text not null,
  amount integer not null check (amount >= 0),
  receive_day smallint not null check (receive_day between 1 and 31),
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index recurring_incomes_user_active_idx on public.recurring_incomes (user_id, is_active);
create index recurring_incomes_partner_idx     on public.recurring_incomes (partner_id) where partner_id is not null;

alter table public.recurring_incomes enable row level security;
create policy "recurring_incomes_all_own_or_partner" on public.recurring_incomes for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

create trigger recurring_incomes_set_partner_id
  before insert on public.recurring_incomes
  for each row execute function public.set_partner_id_on_insert();
