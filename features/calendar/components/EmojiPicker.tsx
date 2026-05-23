// features/calendar/components/EmojiPicker.tsx
"use client";
import { useEffect } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ensureEmojiInit } from "@/lib/emoji/init";

type Props = {
  value: string | null;
  onChange: (emoji: string | null) => void;
};

export function EmojiPicker({ value, onChange }: Props) {
  useEffect(() => {
    ensureEmojiInit();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            {value ? value : "+ 이모지"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto border-0">
          <Picker
            data={data}
            locale="ko"
            onEmojiSelect={(e: { native: string }) => onChange(e.native)}
            previewPosition="none"
            skinTonePosition="none"
            theme="auto"
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          비우기
        </Button>
      )}
    </div>
  );
}
