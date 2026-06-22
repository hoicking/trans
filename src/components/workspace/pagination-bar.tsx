"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PaginationBar({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  className
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const safePage = Math.min(page, pageCount);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(safePage * pageSize, total);

  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500", className)}>
      <div>
        {start}-{end} / {total}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => onPageChange(Math.max(1, safePage - 1))}>
          上一页
        </Button>
        <span className="min-w-[76px] text-center text-xs">
          {safePage} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={safePage >= pageCount}
          onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
