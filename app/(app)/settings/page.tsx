import { Settings } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "설정" };

export default function SettingsPage() {
  return (
    <PlaceholderPage
      icon={Settings}
      subtitle="Settings"
      title="설정이 들어갈 자리"
      description="계정, 연결된 캘린더, 알림, 테마, 위젯 등 환경 설정을 한 곳에서 관리합니다."
      next={[
        "프로필 · 계정",
        "연결된 캘린더 관리",
        "알림 설정",
        "테마 · 글자 크기",
        "위젯 커스터마이징",
      ]}
    />
  );
}
