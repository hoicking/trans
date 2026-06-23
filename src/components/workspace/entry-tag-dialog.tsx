"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import type { TranslationEntry } from "@/lib/types";
import { TagPicker } from "./tag-picker";

export function EntryTagDialog({
  entry,
  tagOptions,
  tagColors,
  onClose,
  onSave
}: {
  entry: TranslationEntry | null;
  tagOptions: string[];
  tagColors: Record<string, string>;
  onClose: () => void;
  onSave: (entry: TranslationEntry, tagNames: string[]) => void | Promise<void>;
}) {
  const [draftTags, setDraftTags] = React.useState<string[]>([]);

  React.useEffect(() => {
    setDraftTags(entry?.tagNames ?? []);
  }, [entry]);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-2xl flex-col rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">维护 Tag</h2>
            <p className="mt-1 break-all font-mono text-sm text-zinc-500">{entry.key}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <TagPicker
            label="当前 key 的 Tag"
            tagOptions={tagOptions}
            tagColors={tagColors}
            selectedTagNames={draftTags}
            onChange={setDraftTags}
            allowCreate={false}
            required
          />
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => void onSave(entry, draftTags)} disabled={!draftTags.length}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}
