// features/expense/components/TransactionModal.tsx
"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  EXPENSE_CATEGORY_PRESETS,
  INCOME_CATEGORY_PRESETS,
  getCategoryColor,
  getIncomeCategoryColor,
  getTextColor,
  TRANSACTION_DELTA_COLORS,
} from "@/lib/colors";
import { parseExpense } from "@/lib/expense-parser";
import { parseIncome } from "@/lib/income-parser";
import { isoToLocalDateKey } from "@/lib/datetime";
import {
  createExpense,
  updateExpense,
  createIncome,
  updateIncome,
} from "../server/actions";
import type { ExpenseRow, IncomeRow } from "../server/queries";
import { QuickAmountChips } from "./transaction-extras/QuickAmountChips";
import { CalculatorPopover } from "./transaction-extras/CalculatorPopover";
import { MemoAutocomplete } from "./transaction-extras/MemoAutocomplete";

type TxnType = "income" | "expense";

type CreateProps = {
  mode: "create";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 생성 모드 초기 탭. 기본 "expense". */
  defaultType?: TxnType;
  /** 생성 모드 초기 카테고리. 모달 첫 마운트 시 적용. */
  defaultCategory?: string;
  /** 새 거래 기본 일자 (YYYY-MM-DD). */
  defaultDate?: string;
  usedCategories?: string[];
  recentMemos?: string[];
  cardNames?: string[];
};

type EditProps = {
  mode: "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** 수정 모드는 type 고정 (탭 비활성화). */
  type: TxnType;
  initial: ExpenseRow | IncomeRow;
  usedCategories?: string[];
  recentMemos?: string[];
  cardNames?: string[];
};

type Props = CreateProps | EditProps;

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatThousands(n: string): string {
  if (!n) return "";
  const digits = n.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("ko-KR");
}

export function TransactionModal(props: Props) {
  const {
    open,
    onOpenChange,
    usedCategories = [],
    recentMemos = [],
    cardNames = [],
  } = props;
  const isEdit = props.mode === "edit";

  const [type, setType] = useState<TxnType>(
    isEdit ? props.type : (props.defaultType ?? "expense"),
  );

  const initial = isEdit ? props.initial : null;
  const defaultDate = !isEdit ? props.defaultDate : undefined;
  const defaultCategory = !isEdit ? props.defaultCategory : undefined;

  const [pending, startTransition] = useTransition();
  const [naturalInput, setNaturalInput] = useState("");

  const [amount, setAmount] = useState<string>(
    initial?.amount != null ? String(initial.amount) : "",
  );
  const [category, setCategory] = useState<string>(
    initial?.category ?? defaultCategory ?? "",
  );

  // 수입은 received_at, 지출은 paid_at. 수정 모드면 해당 필드에서 추출.
  const initialDateKey = (() => {
    if (!isEdit || !initial) return null;
    if (props.type === "income") {
      return isoToLocalDateKey((initial as IncomeRow).received_at);
    }
    return isoToLocalDateKey((initial as ExpenseRow).paid_at);
  })();

  const [dateInput, setDateInput] = useState<string>(
    initialDateKey ?? defaultDate ?? todayIso(),
  );
  const [memo, setMemo] = useState<string>(initial?.memo ?? "");
  const [paymentCard, setPaymentCard] = useState<string | null>(
    initial && "payment_card" in initial
      ? ((initial as ExpenseRow).payment_card ?? null)
      : null,
  );
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  const allCategories = useMemo<string[]>(() => {
    const presets =
      type === "income"
        ? [...INCOME_CATEGORY_PRESETS]
        : [...EXPENSE_CATEGORY_PRESETS];
    const otherPresets =
      type === "income"
        ? [...EXPENSE_CATEGORY_PRESETS]
        : [...INCOME_CATEGORY_PRESETS];
    const presetSet = new Set<string>(presets);
    const otherSet = new Set<string>(otherPresets);
    // 자기 preset 에도 없고, 반대편 preset 에도 없는 것만 custom 으로.
    // "기타" 처럼 양쪽에 다 있는 라벨은 자기 preset 에서 이미 표시되므로 OK.
    const custom = usedCategories.filter(
      (c) => !presetSet.has(c) && !otherSet.has(c),
    );
    return [...presets, ...custom];
  }, [usedCategories, type]);

  // 탭 별 강조 색 (라이트모드 hex). 다크모드는 별도 클래스 분기.
  const deltaColor =
    type === "income"
      ? TRANSACTION_DELTA_COLORS.income.light
      : TRANSACTION_DELTA_COLORS.expense.light;

  const chipColor = (cat: string): string =>
    type === "income" ? getIncomeCategoryColor(cat) : getCategoryColor(cat);

  const handleNaturalInputChange = (v: string) => {
    setNaturalInput(v);
    if (!v.trim()) return;
    const parsed = type === "income" ? parseIncome(v) : parseExpense(v);
    if (parsed.amount !== null) setAmount(String(parsed.amount));
    if (parsed.category !== null) setCategory(parsed.category);
    if (parsed.memo !== null) setMemo(parsed.memo);
  };

  const handleAddNewCategory = () => {
    const v = newCategoryInput.trim();
    if (!v) {
      setShowNewCategory(false);
      return;
    }
    setCategory(v);
    setNewCategoryInput("");
    setShowNewCategory(false);
  };

  const handleSubmit = () => {
    const amt = parseInt(amount.replace(/\D/g, ""), 10);
    if (!amt || amt < 0) {
      toast.error("금액을 입력하세요");
      return;
    }
    if (!category.trim()) {
      toast.error("카테고리를 선택하세요");
      return;
    }
    if (!dateInput) {
      toast.error("일자를 입력하세요");
      return;
    }

    // 'YYYY-MM-DD' 를 그날 정오 (로컬) 의 ISO 로 — timezone 안정성
    const dateIso = new Date(dateInput + "T12:00:00").toISOString();

    startTransition(async () => {
      let result:
        | { ok: true; data: unknown }
        | { ok: false; error: string };
      if (type === "income") {
        const payload = {
          amount: amt,
          category: category.trim(),
          received_at: dateIso,
          memo: memo.trim() || null,
        };
        result = isEdit
          ? await updateIncome((initial as IncomeRow).id, payload)
          : await createIncome(payload);
      } else {
        const payload = {
          amount: amt,
          category: category.trim(),
          paid_at: dateIso,
          memo: memo.trim() || null,
          payment_card: paymentCard,
        };
        result = isEdit
          ? await updateExpense((initial as ExpenseRow).id, payload)
          : await createExpense(payload);
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "수정되었습니다" : "추가되었습니다");
      onOpenChange(false);
    });
  };

  const title = isEdit
    ? type === "income"
      ? "수입 수정"
      : "지출 수정"
    : type === "income"
      ? "수입 추가"
      : "지출 추가";

  const placeholder =
    type === "income"
      ? '예: "월급 3000000", "배당 50000 KB증권"'
      : '예: "커피 3500", "넷플릭스 17000"';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {isEdit
              ? "기존 거래의 금액·카테고리·일자·메모를 수정합니다."
              : "거래의 금액·카테고리·일자·메모를 입력합니다. 자연어로 한 번에 적어도 됩니다."}
          </DialogDescription>
        </DialogHeader>

        {!isEdit && (
          <Tabs
            value={type}
            onValueChange={(v) => setType(v as TxnType)}
          >
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger
                value="expense"
                className="data-[state=active]:text-[#DC2626] dark:data-[state=active]:text-[#F87171]"
              >
                지출
              </TabsTrigger>
              <TabsTrigger
                value="income"
                className="data-[state=active]:text-[#16A34A] dark:data-[state=active]:text-[#4ADE80]"
              >
                수입
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {/* 자연어 입력 — 생성 모드에서만 */}
          {!isEdit && (
            <div>
              <Label htmlFor="natural">
                자연어로 빠르게{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  ({placeholder})
                </span>
              </Label>
              <Input
                id="natural"
                value={naturalInput}
                onChange={(e) => handleNaturalInputChange(e.target.value)}
                placeholder="한 줄로 적으면 아래 칸에 자동으로 채워져요"
                autoFocus
              />
            </div>
          )}

          {/* 금액 */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">금액 *</Label>
            <div className="flex items-center gap-2">
              <Input
                id="amount"
                inputMode="numeric"
                value={formatThousands(amount)}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/\D/g, ""))
                }
                placeholder="0"
                style={{ color: deltaColor }}
                className="flex-1"
              />
              <CalculatorPopover onResult={(n) => setAmount(String(n))} />
            </div>
            <QuickAmountChips onPick={(n) => setAmount(String(n))} />
          </div>

          {/* 카테고리 칩 */}
          <div>
            <Label>카테고리 *</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allCategories.map((cat) => {
                const bg = chipColor(cat);
                const fg = getTextColor(bg);
                const selected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm transition-shadow ${
                      selected
                        ? "ring-2 ring-foreground ring-offset-1 ring-offset-background"
                        : ""
                    }`}
                    style={{ backgroundColor: bg, color: fg }}
                  >
                    {cat}
                  </button>
                );
              })}

              {!showNewCategory ? (
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="px-3 py-1 rounded-full text-sm border border-dashed text-muted-foreground hover:text-foreground"
                >
                  + 새 카테고리
                </button>
              ) : (
                <input
                  autoFocus
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onBlur={handleAddNewCategory}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddNewCategory();
                    } else if (e.key === "Escape") {
                      setShowNewCategory(false);
                      setNewCategoryInput("");
                    }
                  }}
                  placeholder="카테고리 이름"
                  className="px-3 py-1 rounded-full text-sm border bg-background"
                />
              )}
            </div>
          </div>

          {/* 결제 카드 (지출 탭 + 카드 등록 시) */}
          {type === "expense" && cardNames.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                결제 카드 (선택)
              </Label>
              <div className="flex gap-1.5 flex-wrap">
                {cardNames.map((cn) => (
                  <button
                    key={cn}
                    type="button"
                    onClick={() =>
                      setPaymentCard(paymentCard === cn ? null : cn)
                    }
                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                      paymentCard === cn
                        ? "bg-muted border-foreground/30"
                        : "border-border/60 hover:bg-muted/40"
                    }`}
                  >
                    {cn}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 일자 */}
          <div>
            <Label htmlFor="txn-date">일자 *</Label>
            <Input
              id="txn-date"
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
            />
          </div>

          {/* 메모 */}
          <div>
            <Label htmlFor="memo">메모</Label>
            <MemoAutocomplete
              id="memo"
              value={memo}
              onChange={setMemo}
              recentMemos={recentMemos}
              placeholder="선택사항"
            />
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
