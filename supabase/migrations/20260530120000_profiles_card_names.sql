-- profiles.card_names jsonb — 카드 결제 요약 위젯용 카드명 리스트
alter table public.profiles
  add column if not exists card_names jsonb not null default '["롯데카드","국민카드","케이뱅크"]'::jsonb;

-- 기존 사용자에게 default 백필 (null 인 행만)
update public.profiles
set card_names = '["롯데카드","국민카드","케이뱅크"]'::jsonb
where card_names is null;
