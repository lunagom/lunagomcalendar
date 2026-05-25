// features/widgets/components/WidgetCard.tsx
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
};

/** 메인 위젯 카드 공통 wrapper — border / padding / 제목 / body. */
export function WidgetCard({ icon: Icon, title, trailing, children }: Props) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{title}</h3>
        {trailing && (
          <span className="ml-auto text-xs text-muted-foreground">
            {trailing}
          </span>
        )}
      </header>
      <div className="text-sm">{children}</div>
    </section>
  );
}
