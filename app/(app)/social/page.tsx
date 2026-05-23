import { Users } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "공유" };

export default function SocialPage() {
  return (
    <PlaceholderPage
      icon={Users}
      subtitle="Social"
      title="공유가 들어갈 자리"
      description="부부·연인·가족과 일정과 일부 가계부 항목을 함께 보고, 그룹 일정 투표와 예약 링크를 만들 수 있습니다."
      next={[
        "커플 · 가족 공유 캘린더",
        "공유 항목별 권한 차등",
        "그룹 일정 투표 (\"언제어때\" 대체)",
        "한국형 예약 링크",
      ]}
    />
  );
}
