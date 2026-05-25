// features/calendar/components/CalendarShell.tsx
"use client";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { CalendarPickerDropdown } from "./CalendarPickerDropdown";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
  children: React.ReactNode;
};

/**
 * 캘린더 영역 셸. 우측에 월간/일간 토글 + 캘린더 픽커.
 * 월 라벨은 children(MonthGrid/DayView) 안의 FullCalendar toolbar 가 가운데에 그림.
 */
export function CalendarShell({ calendars, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const showDailyExpenses = useCalendarUIStore((s) => s.showDailyExpenses);
  const toggleShowDailyExpenses = useCalendarUIStore(
    (s) => s.toggleShowDailyExpenses,
  );

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-end gap-2 px-4 py-3 border-b">
        {/* 월간 뷰일 때만 — 그날 지출 합계 보기/숨기기 */}
        {pathname === "/calendar" && (
          <Button
            variant={showDailyExpenses ? "default" : "outline"}
            size="sm"
            onClick={toggleShowDailyExpenses}
            title={
              showDailyExpenses
                ? "셀에서 지출 합계 숨기기"
                : "셀에 지출 합계 표시"
            }
            aria-label="셀 지출 표시 토글"
          >
            <Wallet className="h-4 w-4" />
          </Button>
        )}
        <div className="flex rounded-md border bg-background overflow-hidden">
          <Button
            variant={pathname === "/calendar" ? "default" : "ghost"}
            size="sm"
            onClick={() => router.push("/calendar")}
            className="rounded-none"
          >
            월간
          </Button>
          <Button
            variant={pathname === "/day" ? "default" : "ghost"}
            size="sm"
            onClick={() => router.push("/day")}
            className="rounded-none"
          >
            일간
          </Button>
        </div>
        <CalendarPickerDropdown calendars={calendars} />
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
