"use client";

import { useTransition } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportMyData } from "../server/actions";

export function DataExportSection() {
  const [pending, startTransition] = useTransition();

  const handleExport = () => {
    startTransition(async () => {
      const r = await exportMyData();
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const blob = new Blob([r.data.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("다운로드 시작됐어요");
    });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Download className="h-4 w-4" strokeWidth={1.8} />
        데이터 내보내기
      </h2>
      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          내가 등록한 모든 데이터(일정, 가계부, 할 일 등)를 JSON 파일로
          내보냅니다.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={pending}
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
          {pending ? "준비 중..." : "JSON 다운로드"}
        </Button>
      </div>
    </section>
  );
}
