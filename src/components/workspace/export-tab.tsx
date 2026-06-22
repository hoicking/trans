"use client";

import { FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportTab({ onExportAllJson, onExportExcel }: { onExportAllJson: () => void; onExportExcel: () => void }) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <FileJson className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">JSON ZIP</h2>
        <p className="mt-1 text-sm text-zinc-500">按语言拆分为 en.json、it.json 等文件。</p>
        <Button className="mt-5" onClick={onExportAllJson}>
          导出 ZIP
        </Button>
      </div>
      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <FileSpreadsheet className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">Excel 导出</h2>
        <p className="mt-1 text-sm text-zinc-500">包含译文、翻译状态、审核状态、操作时间和操作人。</p>
        <Button className="mt-5" onClick={onExportExcel}>
          导出 Excel
        </Button>
      </div>
    </section>
  );
}
