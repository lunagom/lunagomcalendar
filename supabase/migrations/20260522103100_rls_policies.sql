-- ============================================================================
-- RLS 정책
-- 원칙: 본인 데이터만 접근. 공유받은 캘린더의 events/calendars는
--       shared_calendars 통해 권한 확인 (has_calendar_membership 헬퍼).
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.calendars         enable row level security;
alter table public.events            enable row level security;
alter table public.expenses          enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.shared_calendars  enable row level security;
alter table public.budgets           enable row level security;

-- ─── profiles ────────────────────────────────────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

-- ─── calendars: 본인 + 공유받은 멤버(SELECT만) ────────────────────────────────
create policy "calendars_select_own_or_shared"
  on public.calendars for select using (
    auth.uid() = user_id
    or public.has_calendar_membership(id, auth.uid())
  );
create policy "calendars_insert_own"
  on public.calendars for insert with check (auth.uid() = user_id);
create policy "calendars_update_own"
  on public.calendars for update using (auth.uid() = user_id);
create policy "calendars_delete_own"
  on public.calendars for delete using (auth.uid() = user_id);

-- ─── events: 본인 + 공유멤버(권한별) ──────────────────────────────────────────
create policy "events_select_own_or_shared"
  on public.events for select using (
    auth.uid() = user_id
    or public.has_calendar_membership(calendar_id, auth.uid())
  );
create policy "events_insert_own_or_editor"
  on public.events for insert with check (
    auth.uid() = user_id
    and (
      exists (select 1 from public.calendars c
              where c.id = calendar_id and c.user_id = auth.uid())
      or public.has_calendar_membership(calendar_id, auth.uid(), 'edit')
    )
  );
create policy "events_update_own_or_editor"
  on public.events for update using (
    auth.uid() = user_id
    or public.has_calendar_membership(calendar_id, auth.uid(), 'edit')
  );
create policy "events_delete_own_or_editor"
  on public.events for delete using (
    auth.uid() = user_id
    or public.has_calendar_membership(calendar_id, auth.uid(), 'edit')
  );

-- ─── expenses / subscriptions / budgets: 본인만 (가계부 공유는 추후 단계) ────
create policy "expenses_all_own"
  on public.expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subscriptions_all_own"
  on public.subscriptions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_all_own"
  on public.budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── shared_calendars: 양 당사자만 조회. INSERT/DELETE는 owner. ──────────────
create policy "shared_calendars_select_involved"
  on public.shared_calendars for select
  using (auth.uid() = owner_id or auth.uid() = member_id);
create policy "shared_calendars_insert_owner"
  on public.shared_calendars for insert with check (
    auth.uid() = owner_id
    and exists (select 1 from public.calendars c
                where c.id = calendar_id and c.user_id = auth.uid())
  );
-- member도 자기 row의 status('pending'→'accepted')를 바꿀 수 있어야 함
create policy "shared_calendars_update_involved"
  on public.shared_calendars for update
  using (auth.uid() = owner_id or auth.uid() = member_id);
create policy "shared_calendars_delete_owner"
  on public.shared_calendars for delete using (auth.uid() = owner_id);
