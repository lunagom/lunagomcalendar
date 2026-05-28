// features/calendar/components/CalendarPickerDropdown.tsx
"use client";
import { useState } from "react";
import { ChevronDown, Eye, EyeOff, Settings as SettingsIcon, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { NewCalendarDialog } from "./NewCalendarDialog";
import { CalendarSettingsDialog } from "./CalendarSettingsDialog";
import { useCalendarUIStore } from "../store/calendar-ui";
import type { CalendarRow } from "../server/queries";

type Props = { calendars: CalendarRow[] };

export function CalendarPickerDropdown({ calendars }: Props) {
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<CalendarRow | null>(null);
  const hidden = useCalendarUIStore((s) => s.hiddenCalendarIds);
  const toggle = useCalendarUIStore((s) => s.toggleCalendarHidden);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            📋 캘린더 <ChevronDown className="ml-1 h-3.5 w-3.5" strokeWidth={1.8} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            내 캘린더
          </div>
          <div className="flex flex-col gap-1">
            {calendars.map((cal) => {
              const isHidden = hidden.includes(cal.id);
              return (
                <div
                  key={cal.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent group"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className={`flex-1 text-sm ${isHidden ? "opacity-50" : ""}`}>
                    {cal.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(cal.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={isHidden ? "보이기" : "숨기기"}
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.8} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(cal)}
                    className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
                    aria-label="설정"
                  >
                    <SettingsIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setOpenNew(true)}
            className="mt-2 w-full text-left px-2 py-1.5 rounded text-sm text-muted-foreground hover:bg-accent flex items-center gap-2"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
            새 캘린더
          </button>
        </PopoverContent>
      </Popover>

      <NewCalendarDialog open={openNew} onOpenChange={setOpenNew} />
      <CalendarSettingsDialog
        calendar={editing}
        onClose={() => setEditing(null)}
      />
    </>
  );
}
