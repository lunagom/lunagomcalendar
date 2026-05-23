-- ============================================================================
-- 카테고리 CHECK constraint 제거 — 사용자 정의 카테고리 허용
--
-- 기존: events.expense_category, expenses.category, subscriptions.category,
--       budgets.category 가 모두
--       ('식비','교통','쇼핑','구독','경조사','기타') 로 고정된 CHECK 보유.
--
-- 변경: 사용자가 자유롭게 카테고리를 입력하도록 위 CHECK 만 제거.
--       기본 6개는 UI 의 추천 칩으로만 유지 (DB 차원의 강제 없음).
--
-- 안전성: constraint 이름이 자동 명명이라 환경별로 다를 수 있어,
--         pg_constraint 카탈로그에서 정의(definition)에 6개 카테고리가
--         모두 들어있는 CHECK 만 정확히 매칭해서 삭제한다.
-- ============================================================================

do $$
declare
  c record;
begin
  for c in
    select cl.relname as table_name, con.conname as constraint_name
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cl.relnamespace
    where nsp.nspname = 'public'
      and con.contype = 'c'  -- CHECK constraint
      and cl.relname in ('events', 'expenses', 'subscriptions', 'budgets')
      and pg_get_constraintdef(con.oid) ~
          '식비.*교통.*쇼핑.*구독.*경조사.*기타'
  loop
    execute format(
      'alter table public.%I drop constraint %I',
      c.table_name, c.constraint_name
    );
    raise notice 'dropped CHECK constraint % from %', c.constraint_name, c.table_name;
  end loop;
end;
$$;
