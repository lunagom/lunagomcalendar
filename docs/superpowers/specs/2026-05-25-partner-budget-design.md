# 부부 가계부 공유 디자인

> 작성일: 2026-05-25 (브레인스토밍 결과 합의)

## 목적

부부로 등록된 두 사용자가 가계부 (expenses, subscriptions, budgets, monthly_targets)
를 **양방향 완전 공유**. 한 사람이 입력하면 양쪽 모두 보고 수정·삭제 가능. 부부 해지
후에도 공유 중에 만들어진 데이터는 양쪽 모두 영원히 access.

## 합의된 결정

| 항목 | 결정 |
| --- | --- |
| 관계 모델 | 부부 단독 (관계 타입 다른 옵션 없음) |
| 카디널리티 | 1:1 강제 — 한 사람이 동시에 하나의 active partnership 만 |
| 공유 범위 | expenses, subscriptions, budgets, monthly_targets 100% (events·tasks 는 캘린더 공유로 별도) |
| 권한 | read/insert/update/delete 양쪽 모두 가능 (완전 신뢰) |
| 해지 후 데이터 | row.partner_id 가 남아 양쪽 영원히 access. 해지 후 새 row 는 본인만. |
| 초대 위치 | /settings 의 "부부 연결" 섹션 신설 (캘린더 공유 /social 과 완전 분리) |
| 알림 타입 | partnership_invite / partnership_accepted / partnership_ended (3종 추가) |
| UI 표시 | 가계부 row 의 작성자 닉네임 옆 ❤️ 이모지 (partner_id != null 인 row 만) |

## 데이터 모델

### partnerships 테이블 (신규)

```sql
create table public.partnerships (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references auth.users(id) on delete cascade,  -- 초대한 사람
  user_b_id uuid not null references auth.users(id) on delete cascade,  -- 초대받은 사람
  status text not null default 'pending'
    check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  constraint partnerships_no_self check (user_a_id <> user_b_id)
);

-- 한 사용자가 동시에 하나의 active partnership 만 (양 방향)
create unique index partnerships_one_active_per_user_a
  on public.partnerships (user_a_id) where status='active';
create unique index partnerships_one_active_per_user_b
  on public.partnerships (user_b_id) where status='active';

-- 한 사용자가 동시에 같은 상대에게 pending 초대 하나만
create unique index partnerships_one_pending_pair
  on public.partnerships (user_a_id, user_b_id) where status='pending';

create index partnerships_user_a_idx on public.partnerships (user_a_id, status);
create index partnerships_user_b_idx on public.partnerships (user_b_id, status);
```

### 기존 4 테이블에 partner_id 컬럼 추가

```sql
alter table public.expenses        add column partner_id uuid references auth.users(id);
alter table public.subscriptions   add column partner_id uuid references auth.users(id);
alter table public.budgets         add column partner_id uuid references auth.users(id);
alter table public.monthly_targets add column partner_id uuid references auth.users(id);
```

`partner_id` 의미: 이 row 를 입력할 당시 활성 부부였던 상대방의 user_id. null 이면 부부 관계 없을 때 입력 → 본인만 access.

## RLS 정책 변경 (4 테이블 동일 패턴)

기존 본인 한정 정책 drop → 본인 또는 파트너 정책으로:

```sql
-- 예: expenses (subscriptions, budgets, monthly_targets 도 동일)
drop policy "expenses_all_own" on public.expenses;
create policy "expenses_all_own_or_partner" on public.expenses for all
  using (auth.uid() = user_id or auth.uid() = partner_id)
  with check (auth.uid() = user_id or auth.uid() = partner_id);
```

해지 후에도 partner_id 가 남아 양쪽 모두 통과.

## INSERT 시 partner_id 자동 채우기 — DB trigger

서버 액션마다 명시적으로 채우는 대신 trigger 로 일원화 → 누락 방지.

```sql
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

  new.partner_id := v_partner;  -- 없으면 null
  return new;
end;
$$;

create trigger expenses_set_partner_id
  before insert on public.expenses
  for each row execute function public.set_partner_id_on_insert();
-- subscriptions, budgets, monthly_targets 도 동일 trigger
```

## 초대/수락/해지 흐름

```
A (등록자)                              B (상대방)
─ /settings → "부부 연결" 섹션
─ 상대방 이메일 입력 → "초대 보내기"
─ partnerships INSERT (status='pending')
─ trigger 가 partnership_invite 알림 생성 ────►  ─ 헤더 종에 "OOO 가 부부 연결 요청"
                                                  ─ 알림 클릭 → /settings 부부 섹션
                                                  ─ "수락" or "거절"
                                                       │
                                          [수락] partnerships UPDATE status='active', accepted_at=now()
                                                  trigger 가 partnership_accepted 알림 양쪽에 생성
                                                       │
─ 양쪽 알림 "부부 연결 완료" ◄──────────────────────────┘

해지: 어느 쪽이든 /settings 에서 "연결 해지" 클릭
─ partnerships UPDATE status='ended', ended_at=now()
─ trigger 가 partnership_ended 알림 상대에게 생성
─ 이후 새 가계부 row 의 partner_id 는 null (본인만)
─ 기존 row 들의 partner_id 는 그대로 → 양쪽 영원히 access
```

## partnerships RLS

```sql
alter table public.partnerships enable row level security;

-- 양 당사자만 select
create policy "partnerships_select_involved"
  on public.partnerships for select
  using (auth.uid() in (user_a_id, user_b_id));

-- A (user_a_id) 만 insert. user_a_id 가 self 임.
create policy "partnerships_insert_self"
  on public.partnerships for insert
  with check (auth.uid() = user_a_id);

-- A 또는 B 가 status/accepted_at/ended_at 만 변경 가능. user_a_id, user_b_id 불변은
-- with check 로 직접 막을 수 없어 server action 측이 책임 — RLS 에서는 양 당사자만 통과.
create policy "partnerships_update_involved"
  on public.partnerships for update
  using (auth.uid() in (user_a_id, user_b_id))
  with check (auth.uid() in (user_a_id, user_b_id));

-- B 가 거절 = row 삭제 가능 (양쪽 모두)
create policy "partnerships_delete_involved"
  on public.partnerships for delete
  using (auth.uid() in (user_a_id, user_b_id));
```

## 알림 타입 3종

기존 `notifications` 테이블의 `type` check constraint 에 추가:

```sql
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'event_summary', 'subscription_due',
    'board_new_post', 'board_new_comment',
    'calendar_invite', 'board_like',
    'partnership_invite', 'partnership_accepted', 'partnership_ended'
  ));
```

알림 trigger:
- `notify_partnership_invite` — partnerships INSERT 시 status='pending' 이면 받는 사람에게 `partnership_invite` 알림
- `notify_partnership_status_change` — partnerships UPDATE 시 status 가 pending→active 면 양쪽에 `partnership_accepted`, → 'ended' 면 상대에게 `partnership_ended` 알림

dedupe_key 는 partnership_id 기반으로 한 partnership 당 한 번씩만 생성. 기존 알림 trigger 패턴과 동일 (ON CONFLICT DO NOTHING).

## 라우트 / 파일 구조

```
features/partnership/                     # 신규 도메인
  server/
    queries.ts                            # getActivePartnership, getPendingInvite (받은 것)
    actions.ts                            # invitePartner, acceptInvite, declineInvite, endPartnership
  components/
    PartnerSection.tsx                    # /settings 안의 한 섹션 (server component)
    InviteForm.tsx                        # 이메일 입력 form (client)
    PendingInviteCard.tsx                 # 받은 초대 표시 + 수락/거절 버튼

app/(app)/settings/page.tsx (modify)      # PartnerSection 추가

features/expense/components/              # row 옆 ❤️ 표시
  ExpenseRow.tsx 등 (modify)              # partner_id != null 이면 닉네임 옆 ❤️

features/notifications/components/        # 3개 알림 타입 아이콘·라벨 매핑
  NotificationItem.tsx (modify)

supabase/migrations/
  20260525160000_partnerships.sql         # 신규 — 모든 변경 한 덩어리
```

## /settings "부부 연결" 섹션 UI 상태

상태별 다른 UI:

| 상태 | UI |
| --- | --- |
| **연결 안 됨** | "부부 연결" 제목 + 설명 + 이메일 입력 + "초대 보내기" 버튼 |
| **보낸 초대 대기** | "보낸 초대" + 받는 사람 이메일 + 보낸 시각 + "초대 취소" 버튼 |
| **받은 초대 있음** | "받은 초대" + 보낸 사람 닉네임/이메일 + "수락" "거절" 버튼 |
| **연결됨** | "연결됨" + 상대 닉네임 + 연결 시점 + 안내 문구 "가계부 데이터가 함께 보입니다" + "연결 해지" 버튼 (확인 모달) |

해지 후의 이전 partnership 히스토리는 표시 안 함 (단순화).

## 가계부 페이지 UI 미세 표시

row 옆에 작성자 닉네임 표시가 이미 있으면 그 옆에 ❤️ 이모지 (partner_id != null 일 때).
표시 없으면 partner_id != null 인 row 에 ❤️ 만 작은 아이콘으로 추가.

대상: 지출 목록, 정기 구독 목록, 예산, 월 목표 카드의 작성자 표시.

규칙: 본인 입력이든 파트너 입력이든 ❤️ 동일 (= "이 row 는 부부 공유 중에 만들어진 것"). 본인/파트너 구별이 필요하면 v2.

## 위험과 대비

| 위험 | 대비 |
| --- | --- |
| 잘못된 이메일로 초대 → 모르는 사람 수락 | 이메일 + 닉네임 표시로 본인 확인. 수락 전 보낸 사람 정보 명시 |
| 양쪽 동시에 같은 row 수정 | last-write-wins (updated_at 기준). 베타 단계엔 충분 |
| 한쪽이 실수로 대량 삭제 | "완전 신뢰" 결정이라 의도된 위험. v2 에서 휴지통/롤백 고려 |
| 한 사용자가 partnership 보다 먼저 삭제 (auth.users cascade) | partnerships row 자동 cascade 삭제. 가계부 row 의 partner_id 는 dangling reference 가능 — RLS 에서 user 존재 안 해도 partner_id 매치하면 통과. 한쪽이 탈퇴해도 남은 쪽은 데이터 계속 보임. OK. |
| trigger 가 active partnership 못 찾는 race condition (가입 후 즉시 입력) | 트리거가 SELECT 후 INSERT 라 atomic. 정상. |

## YAGNI

- 부부 외 관계 타입
- 1:N 또는 그룹 공유
- 카테고리별 공유 토글
- 해지 시 데이터 분리·이관
- 이메일 외 사용자 검색
- 초대 만료 (현재 무기한 pending)
- 부부 채팅·메모·합의 노트
- "이거 누가 입력했나" 본인/파트너 구분 표시 (v1 은 ❤️ 단일 표시)
- 가계부 데이터 export·백업
- 부부 가입 보너스/뱃지 등 게이미피케이션
