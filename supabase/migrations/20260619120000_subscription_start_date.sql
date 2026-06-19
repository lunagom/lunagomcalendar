-- 구독 시작일자
-- start_date IS NULL = 처음부터 (기존 행 호환)
-- start_date <= 그 달 말일 부터 합산 포함
alter table public.subscriptions
  add column if not exists start_date date;
