"use client";

import * as React from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Language } from "@/lib/types";

export type StatusFilter = "all" | "missing" | "translated" | "reviewed" | "unreviewed";

export function TranslationTab({
  search,
  activeLanguage,
  statusFilter,
  tagFilter,
  languages,
  tagOptions,
  children,
  onSearchChange,
  onSearchSubmit,
  onActiveLanguageChange,
  onStatusFilterChange,
  onTagFilterChange,
  onOpenAddDialog
}: {
  search: string;
  activeLanguage: string;
  statusFilter: StatusFilter;
  tagFilter: string;
  languages: Language[];
  tagOptions: string[];
  children: React.ReactNode;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onActiveLanguageChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onTagFilterChange: (value: string) => void;
  onOpenAddDialog: () => void;
}) {
  const statusScopeLabel = activeLanguage === "all" ? "任意语言" : "当前语言";

  return (
    <div className="space-y-4">
      <section className="rounded-lg border bg-white p-4 shadow-soft">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_330px_170px_auto]">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
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
          </div>
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
          <Select value={tagFilter} onChange={(event) => onTagFilterChange(event.target.value)}>
            <option value="all">全部 Tag</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
          <Button onClick={onOpenAddDialog}>
            <Plus className="h-4 w-4" />
            新增翻译
          </Button>
        </div>
      </section>
      {children}
    </div>
  );
}
