"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { maxTagNameLength, normalizeTagName, uniqueTagNames } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { TagBadge } from "./tag-badge";

export function TagPicker({
  label = "Tag",
  tagOptions,
  tagColors = {},
  selectedTagNames,
  onChange,
  allowCreate = false,
  disabled = false,
  required = false,
  placeholder = "输入 Tag",
  className,
  emptyText
}: {
  label?: string;
  tagOptions: string[];
  tagColors?: Record<string, string>;
  selectedTagNames: string[];
  onChange: (tagNames: string[]) => void;
  allowCreate?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  emptyText?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const selectedSet = React.useMemo(() => new Set(selectedTagNames), [selectedTagNames]);
  const availableOptions = tagOptions.filter((tag) => !selectedSet.has(tag));

  function addTag(tagName: string) {
    const normalized = normalizeTagName(tagName);
    if (!normalized || normalized.length > maxTagNameLength) return;
    onChange(uniqueTagNames([...selectedTagNames, normalized]));
    setDraft("");
  }

  function removeTag(tagName: string) {
    onChange(selectedTagNames.filter((tag) => tag !== tagName));
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-zinc-500">
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </span>
        <span className="text-xs text-zinc-400">{selectedTagNames.length ? `${selectedTagNames.length} 个` : "未选择"}</span>
      </div>
      <div className="min-h-10 rounded-md border bg-white px-2 py-2">
        <div className="flex flex-wrap gap-2">
          {selectedTagNames.map((tag) => (
            <TagBadge key={tag} name={tag} color={tagColors[tag]} className="max-w-[220px]">
              <button
                type="button"
                className="rounded p-0.5 hover:bg-black/10"
                onClick={() => removeTag(tag)}
                disabled={disabled}
                aria-label={`移除 ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </TagBadge>
          ))}
          {!selectedTagNames.length && (
            <span className="px-1 text-sm text-zinc-400">{emptyText ?? (allowCreate ? "选择或输入 Tag" : "未选择 Tag")}</span>
          )}
        </div>
      </div>
      <div className={cn("grid gap-2", allowCreate ? "md:grid-cols-[minmax(140px,1fr)_minmax(160px,1fr)_auto]" : "md:grid-cols-1")}>
        <Select
          value=""
          onChange={(event) => addTag(event.target.value)}
          disabled={disabled || !availableOptions.length}
          aria-label="选择已有 Tag"
        >
          <option value="">{availableOptions.length ? "选择已有 Tag" : "没有可选 Tag"}</option>
          {availableOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </Select>
        {allowCreate && (
          <>
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addTag(draft);
                }
              }}
              placeholder={placeholder}
              disabled={disabled}
            />
            <Button
              variant="outline"
              onClick={() => addTag(draft)}
              disabled={disabled || !normalizeTagName(draft) || normalizeTagName(draft).length > maxTagNameLength}
            >
              <Plus className="h-4 w-4" />
              添加
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
