-- shared_calendars: member 가 자기 row 를 직접 delete 할 수 있도록 정책 추가.
-- 기존 owner-only delete 정책은 유지(OR 결합). 효과:
--  · "공유받은 캘린더에서 나가기" 가 member 본인 권한으로 가능
--  · 받은 초대 거절도 member 가 직접 row 삭제 가능

create policy "shared_calendars_delete_member_self"
  on public.shared_calendars for delete
  using (auth.uid() = member_id);
