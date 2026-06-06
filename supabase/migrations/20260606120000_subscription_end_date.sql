-- v2 보완: 구독 종료일 (마지막 결제월까지 포함)
-- end_date IS NULL = 무한 반복 (기존 동작)
-- end_date >= 그 달 1일 = 합산 포함
alter table public.subscriptions
  add column if not exists end_date date;
