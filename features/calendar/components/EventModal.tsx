// features/calendar/components/EventModal.tsx
"use client";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { EmojiPicker } from "./EmojiPicker";
import {
  PRESETS,
  EXPENSE_CATEGORY_PRESETS,
  getTextColor,
} from "@/lib/colors";
import { toLunar } from "@/lib/lunar";
import { createEvent, updateEvent } from "../server/actions";
import type { CalendarRow, EventRow } from "../server/queries";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  calendars: CalendarRow[];
  /** 수정 모드일 때 채워짐. */
  initial?: EventRow | null;
  /** 빈 셀 클릭 시 프리필 날짜 (YYYY-MM-DD). */
  defaultDate?: string;
};

export function EventModal({
  open,
  onOpenChange,
  calendars,
  initial,
  defaultDate,
}: Props) {
  const defaultCal = calendars.find((c) => c.is_default) ?? calendars[0];
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [emoji, setEmoji] = useState<string | null>(initial?.emoji ?? null);
  const [calendarId, setCalendarId] = useState(
    initial?.calendar_id ?? defaultCal?.id ?? "",
  );
  const [color, setColor] = useState<string>(
    initial?.color ?? defaultCal?.color ?? PRESETS[9],
  );
  // 새 일정 기본: 시간 지정 (시작 09:00 ~ 10:00). "종일" 원하면 사용자가 체크.
  // 일간 view 의 시간 슬롯에 자동 표시되려면 종일이 아니어야 함.
  const [isAllDay, setIsAllDay] = useState(initial?.is_all_day ?? false);
  const [startAt, setStartAt] = useState(
    initial?.start_at?.slice(0, 16) ??
      (defaultDate ? `${defaultDate}T09:00` : ""),
  );
  const [endAt, setEndAt] = useState(
    initial?.end_at?.slice(0, 16) ??
      (defaultDate ? `${defaultDate}T10:00` : ""),
  );
  const [location, setLocation] = useState(initial?.location ?? "");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [isLunar, setIsLunar] = useState(initial?.is_lunar ?? false);
  const [expectedAmount, setExpectedAmount] = useState<string>(
    initial?.expected_amount != null ? String(initial.expected_amount) : "",
  );
  const [expenseCategory, setExpenseCategory] = useState<string>(
    initial?.expense_category ?? "",
  );
  const [showExpense, setShowExpense] = useState(
    initial?.expected_amount != null || !!initial?.expense_category,
  );

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("제목을 입력하세요");
      return;
    }

    // 음력 토글 ON 시 lunar_month/day 계산
    let lunar_month: number | null = null;
    let lunar_day: number | null = null;
    if (isLunar && startAt) {
      const l = toLunar(new Date(startAt));
      lunar_month = l.month;
      lunar_day = l.day;
    }

    const expectedAmountNum =
      expectedAmount && Number(expectedAmount) > 0
        ? parseInt(expectedAmount, 10)
        : null;

    const payload = {
      title: title.trim(),
      calendar_id: calendarId,
      start_at: new Date(startAt).toISOString(),
      end_at: new Date(endAt || startAt).toISOString(),
      is_all_day: isAllDay,
      location: location.trim() || null,
      memo: memo.trim() || null,
      emoji,
      color,
      is_lunar: isLunar,
      lunar_month,
      lunar_day,
      expected_amount: expectedAmountNum,
      expense_category: expenseCategory.trim() || null,
    };

    startTransition(async () => {
      const result = initial
        ? await updateEvent(initial.id, payload)
        : await createEvent(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(initial ? "수정되었습니다" : "일정이 추가되었습니다");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "일정 수정" : "일정 추가"}</DialogTitle>
          <DialogDescription className="sr-only">
            {initial
              ? "기존 일정의 내용을 수정합니다."
              : "새 일정의 제목, 날짜, 캘린더, 색을 입력합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div>
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 친구 만남"
            />
          </div>

          <div>
            <Label>이모지</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="all-day"
              checked={isAllDay}
              onCheckedChange={(v) => setIsAllDay(Boolean(v))}
            />
            <Label htmlFor="all-day">종일</Label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start">시작</Label>
              <Input
                id="start"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) =>
                  setStartAt(isAllDay ? `${e.target.value}T00:00` : e.target.value)
                }
              />
            </div>
            <div>
              <Label htmlFor="end">종료</Label>
              <Input
                id="end"
                type={isAllDay ? "date" : "datetime-local"}
                value={isAllDay ? endAt.slice(0, 10) : endAt}
                onChange={(e) =>
                  setEndAt(isAllDay ? `${e.target.value}T23:59` : e.target.value)
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="calendar">캘린더</Label>
            <select
              id="calendar"
              value={calendarId}
              onChange={(e) => {
                setCalendarId(e.target.value);
                const cal = calendars.find((c) => c.id === e.target.value);
                if (cal) setColor(cal.color);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {calendars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>색상</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-md border-2 ${
                    color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
            <div
              className="mt-2 inline-block px-2 py-1 rounded text-xs"
              style={{ backgroundColor: color, color: getTextColor(color) }}
            >
              미리보기: {emoji ? `${emoji} ` : ""}
              {title || "(제목 없음)"}
            </div>
          </div>

          <div>
            <Label htmlFor="location">장소</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="선택사항"
            />
          </div>

          <div>
            <Label htmlFor="memo">메모</Label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="선택사항"
            />
          </div>

          {/* 예상 지출 (옵션) */}
          {showExpense ? (
            <div className="space-y-2 rounded-md border p-3 bg-muted/30">
              <div className="flex items-center">
                <span className="text-sm font-medium">예상 지출</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowExpense(false);
                    setExpectedAmount("");
                    setExpenseCategory("");
                  }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  삭제
                </button>
              </div>
              <div>
                <Label htmlFor="expected-amount">금액 (원)</Label>
                <Input
                  id="expected-amount"
                  type="number"
                  min={0}
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="expense-category">카테고리</Label>
                <Input
                  id="expense-category"
                  list="event-expense-category-presets"
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  placeholder="식비 / 교통 / 쇼핑 / 구독 / 경조사 / 기타"
                />
                <datalist id="event-expense-category-presets">
                  {EXPENSE_CATEGORY_PRESETS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowExpense(true)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              + 예상 지출 추가
            </button>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="is-lunar"
              checked={isLunar}
              onCheckedChange={(v) => setIsLunar(Boolean(v))}
            />
            <Label htmlFor="is-lunar">
              음력 일정 (매년 같은 음력 날짜에 반복)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
