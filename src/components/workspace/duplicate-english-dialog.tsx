"use client";

import { CopyPlus, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DuplicateEnglishDecision = "create" | "reuse";

export type DuplicateEnglishCandidate = {
  id: string;
  text: string;
  existingEntryId: string;
  existingKey: string;
  decision: DuplicateEnglishDecision;
  sourceValueIndex?: number;
};

export function DuplicateEnglishDialog({
  open,
  items,
  onCancel,
  onConfirm,
  onDecisionChange,
  onSetAll
}: {
  open: boolean;
  items: DuplicateEnglishCandidate[];
  onCancel: () => void;
  onConfirm: () => void;
  onDecisionChange: (id: string, decision: DuplicateEnglishDecision) => void;
  onSetAll: (decision: DuplicateEnglishDecision) => void;
}) {
  if (!open || !items.length) return null;

  const reuseCount = items.filter((item) => item.decision === "reuse").length;
  const createCount = items.length - reuseCount;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">发现相同英文</h2>
            <p className="mt-1 text-sm text-zinc-500">以下英文与现有翻译完全一致，请确认新增还是沿用旧 key。</p>
          </div>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <div className="flex flex-wrap justify-between gap-2 rounded-md border bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">
              沿用旧 key {reuseCount} 条，新增 {createCount} 条
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onSetAll("reuse")}>
                全部沿用旧 key
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => onSetAll("create")}>
                全部新增
              </Button>
            </div>
          </div>

          {items.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0">
                <div className="break-words text-sm leading-6 text-zinc-900">{item.text}</div>
                <div className="mt-2 text-xs text-zinc-500">
                  旧 key: <span className="font-mono text-zinc-700">{item.existingKey}</span>
                </div>
              </div>
              <div className="grid min-w-[220px] grid-cols-2 gap-2 self-start">
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                    item.decision === "reuse"
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                  onClick={() => onDecisionChange(item.id, "reuse")}
                >
                  <KeyRound className="h-4 w-4" />
                  沿用
                </button>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
                    item.decision === "create"
                      ? "border-zinc-950 bg-zinc-950 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  )}
                  onClick={() => onDecisionChange(item.id, "create")}
                >
                  <CopyPlus className="h-4 w-4" />
                  新增
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={onConfirm}>确认处理</Button>
        </div>
      </div>
    </div>
  );
}
