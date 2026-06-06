-- v2 보완: 반복 일정 (매일/주/월 + 끝 있고/없고)
-- recurrence_rule jsonb 스키마:
--   { freq: "daily" }
--   { freq: "weekly", byday: ["MO","WE", ...] }
--   { freq: "monthly", bymonthday: 15 }
--   추가 옵션: exceptions: ["YYYY-MM-DD", ...]  ("이 항목만 삭제" 처리)
-- recurrence_until: 그 날까지 포함, 그 다음부터 멈춤
-- recurrence_count: N회 인스턴스 후 멈춤
alter table public.events
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_rule jsonb,
  add column if not exists recurrence_until date,
  add column if not exists recurrence_count integer;

create index if not exists events_recurring_idx
  on public.events (user_id, is_recurring)
  where is_recurring = true;
