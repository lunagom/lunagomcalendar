// features/expense/components/transaction-extras/MemoAutocomplete.tsx
"use client";

import { useId } from "react";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (v: string) => void;
  recentMemos: string[];
  placeholder?: string;
  id?: string;
};

export function MemoAutocomplete({
  value,
  onChange,
  recentMemos,
  placeholder,
  id,
}: Props) {
  const generated = useId();
  const listId = `memo-list-${id ?? generated}`;
  return (
    <>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        autoComplete="off"
      />
      <datalist id={listId}>
        {recentMemos.slice(0, 30).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </>
  );
}
