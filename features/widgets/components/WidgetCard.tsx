// features/widgets/components/WidgetCard.tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  trailing?: React.ReactNode;
  /** 카드 전체를 link 로 감싼다. 위젯의 자연스러운 진입점 (예: /calendar). */
  href?: string;
  /** 데스크탑에서 2 컬럼 폭 차지. */
  spanTwo?: boolean;
  children: React.ReactNode;
};

/** 메인 위젯 카드 공통 wrapper — border / hover / 제목 / body / 선택적 link. */
export function WidgetCard({
  icon: Icon,
  title,
  trailing,
  href,
  spanTwo,
  children,
}: Props) {
  const cardClass = `rounded-lg border bg-card p-4 transition ${
    href ? "hover:border-primary/60" : ""
  } h-full`;
  const spanClass = spanTwo ? "sm:col-span-2" : "";

  const card = (
    <section className={cardClass}>
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
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

  if (href) {
    return (
      <Link href={href} className={`block ${spanClass}`}>
        {card}
      </Link>
    );
  }
  return spanClass ? <div className={spanClass}>{card}</div> : card;
}

/** 빈 상태용 — 큰 흐릿한 아이콘 + 안내 텍스트. */
export function WidgetEmpty({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
      <Icon className="h-10 w-10 opacity-25" strokeWidth={1.8} />
      <p className="text-sm">{text}</p>
    </div>
  );
}
