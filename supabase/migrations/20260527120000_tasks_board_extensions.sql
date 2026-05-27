-- supabase/migrations/20260527120000_tasks_board_extensions.sql
-- =====================================================
-- tasks 테이블 확장: 주간 보드 + 카테고리 + 반복 + 일정 연결
-- =====================================================
-- 추가 컬럼:
--   category         text          (UI 한정 4개 — 업무/개인/집안일/기타)
--   is_recurring     boolean       반복 할 일의 "원본" 행을 식별
--   recurrence_rule  jsonb         예: {"freq":"weekly","byday":["MO"]}
--   linked_event_id  uuid          일정에서 분리된 할 일 (단방향)
--   sort_order       integer       같은 날 내 정렬 (DnD 후 보존)
-- =====================================================

alter table public.tasks
  add column if not exists category text
    check (category is null or length(category) between 1 and 20),
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule jsonb,
  add column if not exists linked_event_id uuid
    references public.events(id) on delete set null,
  add column if not exists sort_order integer not null default 0;

-- 보드 정렬 최적화: 같은 날 내에서 sort_order 정렬
create index if not exists tasks_user_date_sort_idx
  on public.tasks (user_id, scheduled_date, sort_order);

-- 일정 → 할 일 역참조 조회용 (선택적 join)
create index if not exists tasks_linked_event_idx
  on public.tasks (linked_event_id)
  where linked_event_id is not null;

-- 반복 할 일 일괄 조회용 (보드 그릴 때 원본 후보 빠르게)
create index if not exists tasks_recurring_idx
  on public.tasks (user_id, is_recurring)
  where is_recurring = true;
