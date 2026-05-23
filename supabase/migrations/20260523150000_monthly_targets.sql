-- ============================================================================
-- monthly_targets — 가계부 월 전체 목표 지출액
--
-- budgets 는 카테고리별 예산용이라, "월 전체 목표" 는 의미적으로 분리되어야
-- 깔끔. (user_id, month) UNIQUE 로 한 사용자 + 한 월에 하나의 목표.
-- ============================================================================

create table public.monthly_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month char(7) not null
    check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),   -- 'YYYY-MM'
  amount integer not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint monthly_targets_unique_per_month unique (user_id, month)
);

create index monthly_targets_user_month_idx
  on public.monthly_targets (user_id, month);

create trigger monthly_targets_set_updated_at
  before update on public.monthly_targets
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS — 본인 데이터만 read/write
-- ============================================================================

alter table public.monthly_targets enable row level security;

create policy monthly_targets_select_own on public.monthly_targets
  for select using (user_id = auth.uid());

create policy monthly_targets_insert_own on public.monthly_targets
  for insert with check (user_id = auth.uid());

create policy monthly_targets_update_own on public.monthly_targets
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy monthly_targets_delete_own on public.monthly_targets
  for delete using (user_id = auth.uid());
