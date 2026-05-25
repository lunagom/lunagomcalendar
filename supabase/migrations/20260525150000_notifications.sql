-- ============================================================================
-- notifications 테이블 + RLS + 4 trigger 함수
-- ============================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'event_summary',
    'subscription_due',
    'board_new_post',
    'board_new_comment',
    'calendar_invite',
    'board_like'
  )),
  title text not null,
  body text,
  link text,
  dedupe_key text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
create unique index notifications_user_dedupe_uniq
  on public.notifications (user_id, dedupe_key)
  where dedupe_key is not null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own"
  on public.notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own"
  on public.notifications for update using (auth.uid() = user_id);
create policy "notifications_delete_own"
  on public.notifications for delete using (auth.uid() = user_id);

-- ============================================================================
-- Trigger 함수들 — security definer 로 RLS 우회. ON CONFLICT DO NOTHING.
-- ============================================================================

create or replace function public.notify_board_new_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calendar_name text;
  v_author_nickname text;
begin
  select name into v_calendar_name from public.calendars where id = new.calendar_id;
  select nickname into v_author_nickname from public.profiles where id = new.author_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select c.user_id, 'board_new_post',
         coalesce(v_author_nickname, '누군가') || ' · ' || v_calendar_name,
         '"' || new.title || '"',
         '/board?cal=' || new.calendar_id,
         'board_new_post:' || new.id::text || ':' || c.user_id::text
  from public.calendars c
  where c.id = new.calendar_id and c.user_id <> new.author_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  select sc.member_id, 'board_new_post',
         coalesce(v_author_nickname, '누군가') || ' · ' || v_calendar_name,
         '"' || new.title || '"',
         '/board?cal=' || new.calendar_id,
         'board_new_post:' || new.id::text || ':' || sc.member_id::text
  from public.shared_calendars sc
  where sc.calendar_id = new.calendar_id
    and sc.status = 'accepted'
    and sc.member_id <> new.author_id
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;

  return new;
exception when others then
  return new;
end;
$$;

create trigger board_posts_notify
  after insert on public.board_posts
  for each row execute function public.notify_board_new_post();

create or replace function public.notify_board_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_author uuid;
  v_post_title text;
  v_post_calendar uuid;
  v_commenter_nickname text;
begin
  select author_id, title, calendar_id
    into v_post_author, v_post_title, v_post_calendar
    from public.board_posts where id = new.post_id;
  if v_post_author is null or v_post_author = new.author_id then
    return new;
  end if;
  select nickname into v_commenter_nickname from public.profiles where id = new.author_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    v_post_author, 'board_new_comment',
    coalesce(v_commenter_nickname, '누군가') || ' 가 댓글',
    '"' || left(new.body, 60) || case when length(new.body) > 60 then '...' else '' end || '"',
    '/board?cal=' || v_post_calendar,
    'board_new_comment:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger board_comments_notify
  after insert on public.board_comments
  for each row execute function public.notify_board_new_comment();

create or replace function public.notify_calendar_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calendar_name text;
  v_owner_nickname text;
begin
  if new.status <> 'pending' then return new; end if;
  select name into v_calendar_name from public.calendars where id = new.calendar_id;
  select nickname into v_owner_nickname from public.profiles where id = new.owner_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    new.member_id, 'calendar_invite',
    '새 캘린더 초대',
    coalesce(v_owner_nickname, '누군가') || ' 가 "' || v_calendar_name || '" 에 초대했어요',
    '/social',
    'calendar_invite:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger shared_calendars_invite_notify
  after insert on public.shared_calendars
  for each row execute function public.notify_calendar_invite();

create or replace function public.notify_board_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_author uuid;
  v_target_calendar uuid;
  v_target_title text;
  v_liker_nickname text;
begin
  if new.target_type = 'post' then
    select author_id, calendar_id, title
      into v_target_author, v_target_calendar, v_target_title
      from public.board_posts where id = new.target_id;
  else
    select bp.author_id, bp.calendar_id, '"' || left(bc.body, 40) || '"'
      into v_target_author, v_target_calendar, v_target_title
      from public.board_comments bc
      join public.board_posts bp on bp.id = bc.post_id
      where bc.id = new.target_id;
  end if;
  if v_target_author is null or v_target_author = new.user_id then
    return new;
  end if;
  select nickname into v_liker_nickname from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    v_target_author, 'board_like',
    coalesce(v_liker_nickname, '누군가') || ' 가 좋아요',
    v_target_title,
    '/board?cal=' || v_target_calendar,
    'board_like:' || new.target_type || ':' || new.target_id::text || ':' || new.user_id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger board_likes_notify
  after insert on public.board_likes
  for each row execute function public.notify_board_like();
