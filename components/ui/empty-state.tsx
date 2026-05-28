import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
};

/**
 * 빈 상태 공통 컴포넌트. 모든 페이지의 "할 일 없음", "지출 없음" 등 빈 영역에 사용.
 * 액션 버튼은 옵션 — 추가 흐름이 있을 때만.
 */
export function EmptyState({ message, action, className }: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
