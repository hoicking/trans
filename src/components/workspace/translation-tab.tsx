"use client";

import * as React from "react";
import { ListPlus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Language } from "@/lib/types";
import { TagBadge } from "./tag-badge";

export type StatusFilter = "all" | "missing" | "translated" | "reviewed" | "unreviewed";

function CompactTagFilter({
  tagOptions,
  tagColors,
  selectedTagNames,
  onChange
}: {
  tagOptions: string[];
  tagColors: Record<string, string>;
  selectedTagNames: string[];
  onChange: (tagNames: string[]) => void;
}) {
  const selected = React.useMemo(() => new Set(selectedTagNames), [selectedTagNames]);
  const availableTags = tagOptions.filter((tag) => !selected.has(tag));

  function addTag(tagName: string) {
    if (!tagName) return;
    onChange([...selectedTagNames, tagName]);
  }

  function removeTag(tagName: string) {
    onChange(selectedTagNames.filter((tag) => tag !== tagName));
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <Select
        value=""
        onChange={(event) => addTag(event.target.value)}
        aria-label="Tag 筛选"
      >
        <option value="">{selectedTagNames.length ? "继续选择 Tag" : "全部 Tag"}</option>
        {availableTags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </Select>
      {selectedTagNames.length > 0 && (
        <div className="flex max-h-[58px] flex-wrap gap-1 overflow-y-auto pr-1">
          {selectedTagNames.map((tag) => (
            <TagBadge key={tag} name={tag} color={tagColors[tag]} className="max-w-[150px]">
              <button
                type="button"
                className="rounded p-0.5 hover:bg-black/10"
                onClick={() => removeTag(tag)}
                aria-label={`移除 ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </TagBadge>
          ))}
          <button
            type="button"
            className="rounded-md border px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-50"
            onClick={() => onChange([])}
          >
            清空
          </button>
        </div>
      )}
    </div>
  );
}

export function TranslationTab({
  search,
  activeLanguage,
  statusFilter,
  tagFilters,
  languages,
  tagOptions,
  tagColors,
  children,
  onSearchChange,
  onSearchSubmit,
  onActiveLanguageChange,
  onStatusFilterChange,
  onTagFiltersChange,
  onOpenAddDialog,
  onOpenBatchAddDialog
}: {
  search: string;
  activeLanguage: string;
  statusFilter: StatusFilter;
  tagFilters: string[];
  languages: Language[];
  tagOptions: string[];
  tagColors: Record<string, string>;
  children: React.ReactNode;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onActiveLanguageChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTagFiltersChange: (value: string[]) => void;
  onOpenAddDialog: () => void;
  onOpenBatchAddDialog: () => void;
}) {
  const statusScopeLabel = activeLanguage === "all" ? "任意语言" : "当前语言";

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4 shadow-soft">
        <div className="grid gap-3 2xl:grid-cols-[minmax(320px,1fr)_auto_330px_minmax(220px,300px)_auto] 2xl:items-start">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSearchSubmit();
              }}
              placeholder="搜索 key 或译文"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={onSearchSubmit}>
            查询
          </Button>
          <div className="grid h-9 grid-cols-2 overflow-hidden rounded-md border bg-white shadow-sm">
            <Select
              aria-label="语言"
              className="rounded-none border-0 shadow-none focus-visible:ring-0"
              value={activeLanguage}
              onChange={(event) => onActiveLanguageChange(event.target.value)}
            >
              <option value="all">全部语言</option>
              {languages.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.code} · {language.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label="状态"
              className="rounded-none border-0 border-l shadow-none focus-visible:ring-0"
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value as StatusFilter)}
            >
              <option value="all">全部状态</option>
              <option value="missing">{statusScopeLabel}未翻译</option>
              <option value="translated">{statusScopeLabel}已翻译</option>
              <option value="unreviewed">{statusScopeLabel}待审核</option>
              <option value="reviewed">{statusScopeLabel}已审核</option>
            </Select>
          </div>
          <CompactTagFilter
            tagOptions={tagOptions}
            tagColors={tagColors}
            selectedTagNames={tagFilters}
            onChange={onTagFiltersChange}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={onOpenAddDialog}>
              <Plus className="h-4 w-4" />
              新增翻译
            </Button>
            <Button variant="outline" onClick={onOpenBatchAddDialog}>
              <ListPlus className="h-4 w-4" />
              批量新增
            </Button>
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}
