-- ============================================================================
-- 루나곰 캘린더 — 초기 스키마
-- 테이블: profiles, calendars, events, expenses, subscriptions,
--         shared_calendars, budgets
-- 트리거: updated_at 자동 갱신, 회원가입 후처리
-- 헬퍼:   has_calendar_membership (RLS 순환 참조 회피)
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  avatar_url text,
  theme_preference text not null default 'system'
    check (theme_preference in ('light','dark','system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── calendars ───────────────────────────────────────────────────────────────
create table public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#5B6CFF'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index calendars_one_default_per_user
  on public.calendars (user_id) where is_default;
create index calendars_user_idx on public.calendars (user_id);

-- ─── events ──────────────────────────────────────────────────────────────────
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  memo text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_all_day boolean not null default false,
  location text,
  is_lunar boolean not null default false,
  lunar_month smallint check (lunar_month between 1 and 12),
  lunar_day smallint check (lunar_day between 1 and 30),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  expected_amount integer check (expected_amount is null or expected_amount >= 0),
  expense_category text
    check (expense_category is null or expense_category in
      ('식비','교통','쇼핑','구독','경조사','기타')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (end_at >= start_at),
  constraint events_lunar_requires_date
    check (not is_lunar or (lunar_month is not null and lunar_day is not null))
);
create index events_user_start_idx on public.events (user_id, start_at);
create index events_calendar_start_idx on public.events (calendar_id, start_at);

-- ─── expenses ────────────────────────────────────────────────────────────────
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  amount integer not null check (amount >= 0),
  category text not null
    check (category in ('식비','교통','쇼핑','구독','경조사','기타')),
  memo text,
  paid_at timestamptz not null,
  receipt_url text,
  created_at timestamptz not null default now()
);
create index expenses_user_paid_idx on public.expenses (user_id, paid_at desc);
create index expenses_event_idx on public.expenses (event_id);

-- ─── subscriptions ───────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount integer not null check (amount >= 0),
  billing_day smallint not null check (billing_day between 1 and 31),
  category text not null
    check (category in ('식비','교통','쇼핑','구독','경조사','기타')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index subscriptions_user_active_idx on public.subscriptions (user_id, is_active);

-- ─── shared_calendars ────────────────────────────────────────────────────────
create table public.shared_calendars (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'view' check (permission in ('view','edit')),
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  constraint shared_calendars_unique_pair unique (calendar_id, member_id),
  constraint shared_calendars_no_self check (owner_id <> member_id)
);
create index shared_calendars_member_idx on public.shared_calendars (member_id, status);
create index shared_calendars_calendar_idx on public.shared_calendars (calendar_id);

-- ─── budgets ─────────────────────────────────────────────────────────────────
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null
    check (category in ('식비','교통','쇼핑','구독','경조사','기타')),
  month char(7) not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- 'YYYY-MM'
  limit_amount integer not null check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_unique_per_month unique (user_id, category, month)
);
create index budgets_user_month_idx on public.budgets (user_id, month);

-- ============================================================================
-- 트리거 함수
-- ============================================================================

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
  for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- 회원가입 후처리: profile + 기본 캘린더 자동 생성
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
  values (new.id, '내 캘린더', '#5B6CFF', true);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS 헬퍼: 공유 캘린더 멤버십 확인
-- ============================================================================
create or replace function public.has_calendar_membership(
  p_calendar_id uuid,
  p_user_id uuid,
  p_min_permission text default 'view'
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.shared_calendars sc
    where sc.calendar_id = p_calendar_id
      and sc.member_id = p_user_id
      and sc.status = 'accepted'
      and (p_min_permission = 'view'
           or (p_min_permission = 'edit' and sc.permission = 'edit'))
  );
$$;

revoke all on function public.has_calendar_membership(uuid, uuid, text) from public;
grant execute on function public.has_calendar_membership(uuid, uuid, text) to authenticated;
