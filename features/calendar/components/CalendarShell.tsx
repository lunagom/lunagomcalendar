// features/calendar/components/CalendarShell.tsx
"use client";
import { Button } from "@/components/ui/button";
import { useRouter, usePathname } from "next/navigation";
import { CalendarPickerDropdown } from "./CalendarPickerDropdown";
import type { CalendarRow } from "../server/queries";

type Props = {
  calendars: CalendarRow[];
  monthLabel: string; // "2026년 5월"
  children: React.ReactNode;
};

export function CalendarShell({ calendars, monthLabel, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{monthLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex rounded-md border bg-background overflow-hidden">
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
        </div>
      </header>
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
