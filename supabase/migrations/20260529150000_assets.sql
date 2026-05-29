-- ============================================================================
-- 자산 관리 (Phase 1) — assets 테이블 + 기존 거래 테이블에 asset_id + RLS
-- ============================================================================

-- ─── assets (자산) ────────────────────────────────────────────────────────
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 30),
  type text not null check (type in (
    'cash', 'bank', 'debit_card', 'credit_card', 'savings_investment'
  )),
  balance integer not null default 0,
  linked_asset_id uuid references public.assets(id) on delete set null,
  payment_day smallint check (payment_day between 1 and 31),
  color text not null default '#5B6CFF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index assets_user_idx on public.assets (user_id, is_archived, sort_order);

-- ─── 기존 거래 테이블에 asset_id (nullable) ──────────────────────────────
alter table public.expenses add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.subscriptions add column if not exists asset_id uuid references public.assets(id) on delete set null;
alter table public.recurring_incomes add column if not exists asset_id uuid references public.assets(id) on delete set null;
create index if not exists expenses_asset_idx on public.expenses (asset_id) where asset_id is not null;
create index if not exists incomes_asset_idx on public.incomes (asset_id) where asset_id is not null;

-- ─── RLS ─────────────────────────────────────────────────────────────────
alter table public.assets enable row level security;

create policy assets_select_own on public.assets for select using (user_id = auth.uid());
create policy assets_insert_own on public.assets for insert with check (user_id = auth.uid());
create policy assets_update_own on public.assets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy assets_delete_own on public.assets for delete using (user_id = auth.uid());

-- ─── 기존 사용자에게 "현금" 자산 1개 자동 생성 ────────────────────────────
insert into public.assets (user_id, name, type, balance, color, sort_order)
select id, '현금', 'cash', 0, '#9CA3AF', 0
from auth.users
on conflict do nothing;

-- ─── 신규 가입 시 "현금" 자산 자동 생성 트리거 ───────────────────────────
create or replace function public.create_default_asset_for_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.assets (user_id, name, type, balance, color, sort_order)
  values (new.id, '현금', 'cash', 0, '#9CA3AF', 0);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_default_asset on auth.users;
create trigger on_auth_user_created_default_asset
  after insert on auth.users
  for each row
  execute function public.create_default_asset_for_new_user();
