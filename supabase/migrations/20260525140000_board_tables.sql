-- ============================================================================
-- 공유 게시판 — 4 테이블 + RLS
-- ============================================================================

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index board_posts_calendar_created_idx
  on public.board_posts (calendar_id, created_at desc);

create trigger board_posts_set_updated_at
  before update on public.board_posts
  for each row execute function public.set_updated_at();

create table public.board_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.board_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index board_comments_post_created_idx
  on public.board_comments (post_id, created_at);

-- 글/댓글 좋아요 통합 (target_type 으로 구분)
create table public.board_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index board_likes_target_idx
  on public.board_likes (target_type, target_id);

-- 사용자별 캘린더 게시판 마지막 본 시각 (badge unread 카운트용)
create table public.board_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);

alter table public.board_posts    enable row level security;
alter table public.board_comments enable row level security;
alter table public.board_likes    enable row level security;
alter table public.board_reads    enable row level security;

-- board_posts: calendar 멤버(owner 포함)만 select/insert,
--              update/delete 는 작성자 본인만
create policy "board_posts_select_member"
  on public.board_posts for select using (
    exists (select 1 from public.calendars c
            where c.id = calendar_id and c.user_id = auth.uid())
    or public.has_calendar_membership(calendar_id, auth.uid())
  );
create policy "board_posts_insert_member"
  on public.board_posts for insert with check (
    auth.uid() = author_id and (
      exists (select 1 from public.calendars c
              where c.id = calendar_id and c.user_id = auth.uid())
      or public.has_calendar_membership(calendar_id, auth.uid())
    )
  );
create policy "board_posts_update_own"
  on public.board_posts for update using (auth.uid() = author_id);
create policy "board_posts_delete_own"
  on public.board_posts for delete using (auth.uid() = author_id);

-- board_comments: 부모 post 의 calendar 멤버만 select/insert,
--                 update/delete 는 작성자 본인만
create policy "board_comments_select_member"
  on public.board_comments for select using (
    exists (
      select 1 from public.board_posts p
      where p.id = post_id
        and (
          exists (select 1 from public.calendars c
                  where c.id = p.calendar_id and c.user_id = auth.uid())
          or public.has_calendar_membership(p.calendar_id, auth.uid())
        )
    )
  );
create policy "board_comments_insert_member"
  on public.board_comments for insert with check (
    auth.uid() = author_id and exists (
      select 1 from public.board_posts p
      where p.id = post_id
        and (
          exists (select 1 from public.calendars c
                  where c.id = p.calendar_id and c.user_id = auth.uid())
          or public.has_calendar_membership(p.calendar_id, auth.uid())
        )
    )
  );
create policy "board_comments_update_own"
  on public.board_comments for update using (auth.uid() = author_id);
create policy "board_comments_delete_own"
  on public.board_comments for delete using (auth.uid() = author_id);

-- board_likes: 본인 row 만
create policy "board_likes_all_own"
  on public.board_likes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- board_reads: 본인 row 만 (upsert)
create policy "board_reads_all_own"
  on public.board_reads for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
