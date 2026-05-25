"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invitePartner } from "../server/actions";

export function InviteForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const r = await invitePartner(formData);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("초대를 보냈어요. 상대방이 수락하면 연결돼요.");
      router.refresh();
    });
  };

  return (
    <form
      action={handleSubmit}
      className="space-y-2 rounded-lg border border-border p-4"
    >
      <Label htmlFor="partner-email" className="text-xs">
        상대방 이메일
      </Label>
      <Input
        id="partner-email"
        name="email"
        type="email"
        placeholder="partner@example.com"
        required
        disabled={pending}
      />
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "보내는 중..." : "초대 보내기"}
      </Button>
    </form>
  );
}
