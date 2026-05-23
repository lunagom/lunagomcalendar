-- supabase/migrations/20260523130000_default_calendar_color.sql
-- 기본 캘린더 시작 색을 Plan A dusty 팔레트의 소프트 스카이 (#BDD3E0) 로 변경.
-- Stage 2 에서 #5B6CFF (브랜드 primary indigo) 로 들어가 있었는데 카테고리 픽커의 12색에 없어서
-- 새 가입자가 팔레트 밖의 색을 갖게 되는 문제. handle_new_user 트리거 함수만 갱신.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );

  insert into public.calendars (user_id, name, color, is_default)
  values (new.id, '내 캘린더', '#BDD3E0', true);

  return new;
end;
$$;
