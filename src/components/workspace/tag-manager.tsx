"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatDateTag, tagToDateInputValue, todayDateInputValue } from "./tag-utils";

export function TagManager({
  tagOptions,
  selectedTagName,
  onSelectTag,
  onCreateTag,
  onRenameTag,
  onDeleteTag,
  disabled
}: {
  tagOptions: string[];
  selectedTagName: string;
  onSelectTag: (tagName: string) => void;
  onCreateTag: (tagName: string) => void | Promise<void>;
  onRenameTag: (nextTagName: string) => void | Promise<void>;
  onDeleteTag: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [createDate, setCreateDate] = React.useState(todayDateInputValue());
  const [renameDate, setRenameDate] = React.useState(tagToDateInputValue(selectedTagName));

  React.useEffect(() => {
    setRenameDate(tagToDateInputValue(selectedTagName));
  }, [selectedTagName]);

  const createTagName = formatDateTag(createDate);
  const renameTagName = formatDateTag(renameDate);
  const canRename = Boolean(selectedTagName && renameTagName && selectedTagName !== renameTagName);

  return (
    <div className="rounded-md border bg-zinc-50 p-4">
      <div className="mb-4 text-sm font-medium">Tag 维护</div>
      <div className="space-y-3">
        <div className="grid items-center gap-2 sm:grid-cols-[96px_minmax(0,1fr)_128px]">
          <div className="text-xs font-medium text-zinc-500">当前 Tag</div>
          <Select value={selectedTagName} onChange={(event) => onSelectTag(event.target.value)} disabled={disabled || !tagOptions.length}>
            {!tagOptions.length && <option value="">暂无 Tag</option>}
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
          <Button variant="destructive" onClick={() => void onDeleteTag()} disabled={disabled || !selectedTagName}>
            <Trash2 className="h-4 w-4" />
            删除
          </Button>
        </div>

        <div className="grid items-center gap-2 sm:grid-cols-[96px_minmax(0,1fr)_128px]">
          <div className="text-xs font-medium text-zinc-500">新建 Tag</div>
          <Input type="date" value={createDate} onChange={(event) => setCreateDate(event.target.value)} disabled={disabled} />
          <Button variant="outline" onClick={() => void onCreateTag(createTagName)} disabled={disabled || !createTagName}>
            <Plus className="h-4 w-4" />
            创建
          </Button>
        </div>

        <div className="grid items-center gap-2 sm:grid-cols-[96px_minmax(0,1fr)_128px]">
          <div className="text-xs font-medium text-zinc-500">修改 Tag</div>
          <Input type="date" value={renameDate} onChange={(event) => setRenameDate(event.target.value)} disabled={disabled || !selectedTagName} />
          <Button variant="outline" onClick={() => void onRenameTag(renameTagName)} disabled={disabled || !canRename}>
            <Pencil className="h-4 w-4" />
            修改
          </Button>
        </div>
      </div>
    </div>
  );
}
