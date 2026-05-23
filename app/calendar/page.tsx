import { Calendar } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "캘린더" };

export default function CalendarPage() {
  return (
    <PlaceholderPage
      icon={Calendar}
      subtitle="Calendar"
      title="캘린더가 들어갈 자리"
      description="월간 그리드 뷰, 일정 등록, 자연어 입력, 멀티 캘린더 통합이 다음 단계에서 구현됩니다."
      next={[
        "월간 / 주간 / 일간 뷰",
        "자연어 일정 등록",
        "구글·네이버·카카오톡 동기화",
        "음력 · 공휴일 · 24절기",
      ]}
    />
  );
}
