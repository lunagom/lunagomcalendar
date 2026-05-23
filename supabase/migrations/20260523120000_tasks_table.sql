-- supabase/migrations/20260523120000_tasks_table.sql
-- =====================================================
-- tasks: 개인 할 일 (공유 캘린더 무관, 항상 user 소유)
-- =====================================================

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  scheduled_date date not null,
  completed_at timestamptz,
  emoji text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_date_idx on public.tasks (user_id, scheduled_date);
create index tasks_open_idx on public.tasks (user_id, scheduled_date)
  where completed_at is null;

-- updated_at 자동 갱신 (1단계 마이그레이션의 set_updated_at 함수 재사용)
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- RLS
alter table public.tasks enable row level security;

create policy tasks_select_own on public.tasks
  for select using (user_id = (select auth.uid()));

create policy tasks_insert_own on public.tasks
  for insert with check (user_id = (select auth.uid()));

create policy tasks_update_own on public.tasks
  for update using (user_id = (select auth.uid()));

create policy tasks_delete_own on public.tasks
  for delete using (user_id = (select auth.uid()));
