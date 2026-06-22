"use client";

import { ListPlus, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KeyGenerationMode } from "@/lib/types";
import { TagManager } from "./tag-manager";

export function BatchAddTranslationDialog({
  open,
  tagOptions,
  selectedTagName,
  keyMode,
  batchText,
  aiBusy,
  onClose,
  onSelectTag,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  onKeyModeChange,
  onBatchTextChange,
  onAddWithAi
}: {
  open: boolean;
  tagOptions: string[];
  selectedTagName: string;
  keyMode: KeyGenerationMode;
  batchText: string;
  aiBusy: boolean;
  onClose: () => void;
  onSelectTag: (tagName: string) => void;
  onCreateTag: (tagName: string) => void | Promise<void>;
  onRenameTag: (nextTagName: string) => void | Promise<void>;
  onDeleteTag: () => void | Promise<void>;
  onKeyModeChange: (mode: KeyGenerationMode) => void;
  onBatchTextChange: (text: string) => void;
  onAddWithAi: () => void;
}) {
  if (!open) return null;

  const rows = batchText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rowCount = rows.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">批量新增</h2>
            <p className="mt-1 text-sm text-zinc-500">每行一条英文，创建后自动补全其他语言。</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <TagManager
            tagOptions={tagOptions}
            selectedTagName={selectedTagName}
            onSelectTag={onSelectTag}
            onCreateTag={onCreateTag}
            onRenameTag={onRenameTag}
            onDeleteTag={onDeleteTag}
            disabled={aiBusy}
          />

          <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
            Key 生成
            <Select value={keyMode} onChange={(event) => onKeyModeChange(event.target.value as KeyGenerationMode)} disabled={aiBusy}>
              <option value="semantic">语义化 key</option>
              <option value="text">文本 key</option>
            </Select>
          </label>

          <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
            英文文本
            <Textarea
              value={batchText}
              onChange={(event) => onBatchTextChange(event.target.value)}
              placeholder={"Plan vs Actual comparison\nExecution Progress\nGrid Feed-in Today"}
              className="min-h-[260px] resize-y leading-6"
              disabled={aiBusy}
            />
          </label>

          <div className="flex items-center justify-between rounded-md border bg-zinc-50 px-3 py-2 text-sm">
            <span className="text-zinc-500">待新增</span>
            <span className="font-medium">{rowCount} 条</span>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose} disabled={aiBusy}>
            取消
          </Button>
          <Button onClick={onAddWithAi} disabled={!rowCount || !selectedTagName || aiBusy}>
            {aiBusy ? <WandSparkles className="h-4 w-4" /> : <ListPlus className="h-4 w-4" />}
            新增并补全
          </Button>
        </div>
      </div>
    </div>
  );
}
