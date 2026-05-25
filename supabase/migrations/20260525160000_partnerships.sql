-- ============================================================================
-- 부부 가계부 공유 — partnerships 테이블 + partner_id 4 컬럼 + RLS + trigger + 알림
-- ============================================================================

-- ─── partnerships 테이블 ─────────────────────────────────────────────────────
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,
  user_b_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  constraint partnerships_no_self check (user_a_id <> user_b_id)
);

create unique index partnerships_one_active_per_user_a
  on public.partnerships (user_a_id) where status='active';
create unique index partnerships_one_active_per_user_b
  on public.partnerships (user_b_id) where status='active';
create unique index partnerships_one_pending_pair
  on public.partnerships (user_a_id, user_b_id) where status='pending';
create index partnerships_user_a_idx on public.partnerships (user_a_id, status);
create index partnerships_user_b_idx on public.partnerships (user_b_id, status);

alter table public.partnerships enable row level security;

create policy "partnerships_select_involved"
  on public.partnerships for select
  using (auth.uid() in (user_a_id, user_b_id));

create policy "partnerships_insert_self"
  on public.partnerships for insert
  with check (auth.uid() = user_a_id);

create policy "partnerships_update_involved"
  on public.partnerships for update
  using (auth.uid() in (user_a_id, user_b_id))
  with check (auth.uid() in (user_a_id, user_b_id));

create policy "partnerships_delete_involved"
  on public.partnerships for delete
  using (auth.uid() in (user_a_id, user_b_id));

-- ─── 4 테이블에 partner_id 컬럼 추가 ──────────────────────────────────────────
alter table public.expenses        add column partner_id uuid references auth.users(id);
alter table public.subscriptions   add column partner_id uuid references auth.users(id);
alter table public.budgets         add column partner_id uuid references auth.users(id);
alter table public.monthly_targets add column partner_id uuid references auth.users(id);

create index expenses_partner_idx        on public.expenses (partner_id) where partner_id is not null;
create index subscriptions_partner_idx   on public.subscriptions (partner_id) where partner_id is not null;
create index budgets_partner_idx         on public.budgets (partner_id) where partner_id is not null;
create index monthly_targets_partner_idx on public.monthly_targets (partner_id) where partner_id is not null;

-- ─── RLS 정책 재설정 — 본인 또는 파트너 ──────────────────────────────────────
drop policy "expenses_all_own" on public.expenses;
create policy "expenses_all_own_or_partner" on public.expenses for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy "subscriptions_all_own" on public.subscriptions;
create policy "subscriptions_all_own_or_partner" on public.subscriptions for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy "budgets_all_own" on public.budgets;
create policy "budgets_all_own_or_partner" on public.budgets for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

drop policy monthly_targets_select_own on public.monthly_targets;
drop policy monthly_targets_insert_own on public.monthly_targets;
drop policy monthly_targets_update_own on public.monthly_targets;
drop policy monthly_targets_delete_own on public.monthly_targets;
create policy "monthly_targets_all_own_or_partner" on public.monthly_targets for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);

-- ─── INSERT trigger: partner_id 자동 채우기 ──────────────────────────────────
create or replace function public.set_partner_id_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner uuid;
begin
  if new.partner_id is not null then return new; end if;

  select case when p.user_a_id = new.user_id then p.user_b_id else p.user_a_id end
    into v_partner
    from public.partnerships p
    where (p.user_a_id = new.user_id or p.user_b_id = new.user_id)
      and p.status = 'active'
    limit 1;

  new.partner_id := v_partner;
  return new;
end;
$$;

create trigger expenses_set_partner_id
  before insert on public.expenses
  for each row execute function public.set_partner_id_on_insert();
create trigger subscriptions_set_partner_id
  before insert on public.subscriptions
  for each row execute function public.set_partner_id_on_insert();
create trigger budgets_set_partner_id
  before insert on public.budgets
  for each row execute function public.set_partner_id_on_insert();
create trigger monthly_targets_set_partner_id
  before insert on public.monthly_targets
  for each row execute function public.set_partner_id_on_insert();

-- ─── 알림 type check constraint 확장 ─────────────────────────────────────────
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'event_summary', 'subscription_due',
    'board_new_post', 'board_new_comment',
    'calendar_invite', 'board_like',
    'partnership_invite', 'partnership_accepted', 'partnership_ended'
  ));

-- ─── 알림 trigger: partnership 변화 시 알림 생성 ─────────────────────────────
create or replace function public.notify_partnership_invite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_nickname text;
begin
  if new.status <> 'pending' then return new; end if;
  select nickname into v_inviter_nickname from public.profiles where id = new.user_a_id;

  insert into public.notifications (user_id, type, title, body, link, dedupe_key)
  values (
    new.user_b_id, 'partnership_invite',
    '새 부부 연결 요청',
    coalesce(v_inviter_nickname, '누군가') || ' 가 부부 연결을 요청했어요',
    '/settings',
    'partnership_invite:' || new.id::text
  )
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  return new;
exception when others then
  return new;
end;
$$;

create trigger partnerships_invite_notify
  after insert on public.partnerships
  for each row execute function public.notify_partnership_invite();

create or replace function public.notify_partnership_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a_nickname text;
  v_b_nickname text;
begin
  -- pending → active (수락): 양쪽에 알림
  if old.status = 'pending' and new.status = 'active' then
    select nickname into v_a_nickname from public.profiles where id = new.user_a_id;
    select nickname into v_b_nickname from public.profiles where id = new.user_b_id;

    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    values
      (new.user_a_id, 'partnership_accepted', '부부 연결 완료',
       coalesce(v_b_nickname, '상대방') || ' 가 부부 연결을 수락했어요',
       '/settings', 'partnership_accepted:' || new.id::text || ':a'),
      (new.user_b_id, 'partnership_accepted', '부부 연결 완료',
       coalesce(v_a_nickname, '상대방') || ' 와 부부 연결이 시작됐어요',
       '/settings', 'partnership_accepted:' || new.id::text || ':b')
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  -- → ended (해지): 변경한 쪽 반대편에 알림
  if old.status = 'active' and new.status = 'ended' then
    insert into public.notifications (user_id, type, title, body, link, dedupe_key)
    select
      case when auth.uid() = new.user_a_id then new.user_b_id else new.user_a_id end,
      'partnership_ended',
      '부부 연결 해지',
      '상대방이 부부 연결을 해지했어요. 이전 가계부 데이터는 그대로 남아있어요.',
      '/settings',
      'partnership_ended:' || new.id::text
    on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
  end if;

  return new;
exception when others then
  return new;
end;
$$;

create trigger partnerships_status_change_notify
  after update on public.partnerships
  for each row execute function public.notify_partnership_status_change();
