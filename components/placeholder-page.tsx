import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * 1단계 라우트 플레이스홀더. 다음 단계에서 각 기능 페이지로 교체된다.
 * 화면이 비어 보이지 않도록 적절히 호흡감 있는 비례로 구성.
 */
export function PlaceholderPage({
  icon: Icon,
  title,
  subtitle,
  description,
  next,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  next?: string[];
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-8 md:mb-10">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {subtitle}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
      </header>

      <Card className="border-border bg-card rounded-xl">
        <CardContent className="flex flex-col items-center gap-5 px-6 py-16 md:py-24">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="max-w-md text-center">
            <p className="text-base font-semibold">준비 중인 화면입니다</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          {next && next.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2 max-w-lg">
              {next.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
