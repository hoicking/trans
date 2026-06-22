"use client";

import * as React from "react";
import { Copy, ExternalLink, FileJson, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExportTab({
  localesZipUrl,
  onExportAllJson,
  onExportExcel
}: {
  localesZipUrl: string;
  onExportAllJson: () => void;
  onExportExcel: () => void;
}) {
  const [origin, setOrigin] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const absoluteZipUrl = origin ? `${origin}${localesZipUrl}` : localesZipUrl;

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function copyZipUrl() {
    await navigator.clipboard.writeText(absoluteZipUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <FileJson className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">JSON ZIP</h2>
        <p className="mt-1 text-sm text-zinc-500">按语言拆分为 en.json、it.json 等文件。</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={onExportAllJson}>导出 ZIP</Button>
          <Button asChild variant="outline">
            <a href={localesZipUrl}>
              <ExternalLink className="h-4 w-4" />
              打开链接
            </a>
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Input readOnly value={absoluteZipUrl} onFocus={(event) => event.currentTarget.select()} aria-label="ZIP 下载链接" />
          <Button variant="outline" onClick={() => void copyZipUrl()}>
            <Copy className="h-4 w-4" />
            {copied ? "已复制" : "复制链接"}
          </Button>
        </div>
      </div>
      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <FileSpreadsheet className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">Excel 导出</h2>
        <p className="mt-1 text-sm text-zinc-500">仅包含 key、en、it、pl、ro、zh。</p>
        <Button className="mt-5" onClick={onExportExcel}>
          导出 Excel
        </Button>
      </div>
    </section>
  );
}
