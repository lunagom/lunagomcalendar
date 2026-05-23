import { Wallet } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "가계부" };

export default function ExpensePage() {
  return (
    <PlaceholderPage
      icon={Wallet}
      subtitle="Expense"
      title="가계부가 들어갈 자리"
      description="일정에 예상 지출을 같이 등록하고, 월간 지출 캘린더 뷰와 정기 구독료 트래커를 제공할 예정입니다."
      next={[
        "일정 + 예상 지출 동시 입력",
        "정기 구독 · 결제일 자동 관리",
        "월간 지출 캘린더 뷰",
        "경조사 · 기념일 트래커",
        "카테고리별 예산 알림",
      ]}
    />
  );
}
