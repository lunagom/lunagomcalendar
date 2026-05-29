-- supabase/migrations/20260529120000_profiles_notification_prefs.sql
-- profiles 에 알림 환경설정 컬럼 추가
-- null = 모두 ON (legacy 호환)
-- 예시 값: {"partnership_invite": false, "partnership_accepted": true, "partnership_ended": true, "daily_summary": true}

alter table public.profiles
  add column if not exists notification_prefs jsonb;
