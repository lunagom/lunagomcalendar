// features/todos/components/QuickAddInput.tsx
"use client";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTodo } from "../server/actions";

type Props = { date: string };

export function QuickAddInput({ date }: Props) {
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await createTodo({
        title: title.trim(),
        scheduled_date: date,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setTitle("");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2">
      <Plus className="h-4 w-4 text-muted-foreground" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="할 일 추가"
        disabled={pending}
        className="border-0 focus-visible:ring-0 px-0"
      />
    </form>
  );
}
