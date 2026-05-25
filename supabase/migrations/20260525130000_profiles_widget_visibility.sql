-- profiles 에 메인 위젯 가시성 컬럼 추가.
-- 값: hidden 된 위젯 key 의 배열 (예: ["upcoming","category"]).
-- null/[] 이면 모두 보임.

alter table public.profiles
  add column widget_visibility jsonb;
