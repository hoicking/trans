"use client";

import { AlertTriangle, Check, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Language, TranslationEntry, TranslationProject, TranslationValue } from "@/lib/types";
import { cn, formatDateTime } from "@/lib/utils";
import { EmptyState } from "./empty-state";
import { PaginationBar } from "./pagination-bar";
import { TagPicker } from "./tag-picker";

export type ReviewLanguageItem = {
  language: Language;
  translation: TranslationValue;
};

export type ReviewItem = {
  entry: TranslationEntry;
  pendingLanguages: ReviewLanguageItem[];
};

export type ReviewSort = "latest" | "oldest" | "mostPending";

export function ReviewTab({
  project,
  reviewItems,
  reviewQueueItems,
  paginatedReviewItems,
  selectedReview,
  selectedReviewLanguage,
  selectedReviewEntryId,
  activeReviewLanguage,
  reviewDraft,
  reviewSearch,
  reviewLanguage,
  reviewTagNames,
  reviewSort,
  tagOptions,
  tagColors,
  reviewPage,
  reviewPageCount,
  reviewPageSize,
  onReviewSearchChange,
  onReviewLanguageChange,
  onReviewTagChange,
  onReviewSortChange,
  onSelectReview,
  onSelectReviewLanguage,
  onReviewDraftChange,
  onApprove,
  onReject,
  onPageChange
}: {
  project: TranslationProject;
  reviewItems: ReviewItem[];
  reviewQueueItems: Array<{ entry: TranslationEntry; language: Language; translation: TranslationValue }>;
  paginatedReviewItems: ReviewItem[];
  selectedReview?: ReviewItem;
  selectedReviewLanguage?: ReviewLanguageItem;
  selectedReviewEntryId: string | null;
  activeReviewLanguage: string | null;
  reviewDraft: string;
  reviewSearch: string;
  reviewLanguage: string;
  reviewTagNames: string[];
  reviewSort: ReviewSort;
  tagOptions: string[];
  tagColors: Record<string, string>;
  reviewPage: number;
  reviewPageCount: number;
  reviewPageSize: number;
  onReviewSearchChange: (value: string) => void;
  onReviewLanguageChange: (value: string) => void;
  onReviewTagChange: (value: string[]) => void;
  onReviewSortChange: (value: ReviewSort) => void;
  onSelectReview: (item: ReviewItem) => void;
  onSelectReviewLanguage: (item: ReviewLanguageItem) => void;
  onReviewDraftChange: (value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onPageChange: (page: number) => void;
}) {
  function lastTranslatedAt(item: ReviewItem) {
    return item.pendingLanguages
      .map((pending) => pending.translation.translatedAt)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
  }

  return (
    <section className="grid h-[calc(100vh-190px)] min-h-[560px] gap-4 overflow-hidden xl:grid-cols-[380px_minmax(0,980px)]">
      <div className="flex min-h-0 flex-col rounded-lg border bg-white p-3 shadow-soft">
        <div className="mb-3 space-y-3 border-b px-1 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">待审核队列</div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {reviewItems.length} / {reviewQueueItems.length} 项
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <label className="space-y-1 text-xs font-medium text-zinc-500">
              搜索
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input
                  value={reviewSearch}
                  onChange={(event) => onReviewSearchChange(event.target.value)}
                  placeholder="搜索 key / 源文 / 译文"
                  className="pl-9"
                />
              </div>
            </label>
            <TagPicker
              label="Tag"
              tagOptions={tagOptions}
              tagColors={tagColors}
              selectedTagNames={reviewTagNames}
              onChange={onReviewTagChange}
              allowCreate={false}
              emptyText="全部 Tag"
            />
            <label className="space-y-1 text-xs font-medium text-zinc-500">
              语言
              <Select value={reviewLanguage} onChange={(event) => onReviewLanguageChange(event.target.value)}>
                <option value="all">全部语言</option>
                {project.languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.code} · {language.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1 text-xs font-medium text-zinc-500">
              排序
              <Select value={reviewSort} onChange={(event) => onReviewSortChange(event.target.value as ReviewSort)}>
                <option value="latest">最新翻译优先</option>
                <option value="oldest">最早翻译优先</option>
                <option value="mostPending">待审核语言最多优先</option>
              </Select>
            </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {paginatedReviewItems.map((item) => {
            const id = item.entry.id;
            const source = item.entry.translations[item.entry.sourceLanguage]?.value || "";
            const active = selectedReviewEntryId === id;
            return (
              <button
                key={id}
                onClick={() => onSelectReview(item)}
                className={cn(
                  "w-full rounded-md border p-3 text-left transition-colors",
                  active ? "border-zinc-950 bg-zinc-950 text-white" : "bg-white hover:bg-zinc-50"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="break-all font-mono text-sm">{item.entry.key}</span>
                  <Badge variant={active ? "muted" : "translated"}>{item.pendingLanguages.length} pending</Badge>
                </div>
                <p className={cn("mt-2 line-clamp-2 text-xs", active ? "text-zinc-300" : "text-zinc-500")}>
                  {source || "无源文"}
                </p>
                <div className={cn("mt-2 text-xs", active ? "text-zinc-300" : "text-zinc-500")}>
                  {item.pendingLanguages.map((pending) => pending.language.code).join(" · ")}
                </div>
                <div className={cn("mt-2 text-xs", active ? "text-zinc-400" : "text-zinc-400")}>
                  最后翻译 {formatDateTime(lastTranslatedAt(item))}
                </div>
              </button>
            );
          })}
          {!reviewItems.length && (
            <EmptyState
              title="没有待审核内容"
              description={reviewQueueItems.length ? "当前筛选条件下没有待审核内容。" : "所有已翻译内容都已经审核完成。"}
            />
          )}
        </div>
        <PaginationBar
          className="mt-4"
          page={reviewPage}
          pageCount={reviewPageCount}
          total={reviewItems.length}
          pageSize={reviewPageSize}
          onPageChange={onPageChange}
        />
      </div>

      <div className="min-h-0 overflow-y-auto rounded-lg border bg-white p-5 shadow-soft">
        {selectedReview && selectedReviewLanguage ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-mono text-lg font-semibold">{selectedReview.entry.key}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  源语言 {selectedReview.entry.sourceLanguage} · {selectedReview.pendingLanguages.length} 个语言待审核
                </div>
              </div>
              <Badge variant="translated">待审核</Badge>
            </div>
            <div className="rounded-md border bg-zinc-50 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">源文</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {selectedReview.entry.translations[selectedReview.entry.sourceLanguage]?.value || "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedReview.pendingLanguages.map((item) => {
                const active = item.language.code === activeReviewLanguage;
                return (
                  <button
                    key={item.language.code}
                    onClick={() => onSelectReviewLanguage(item)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      active ? "border-zinc-950 bg-zinc-950 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"
                    )}
                  >
                    {item.language.code} 待审
                  </button>
                );
              })}
            </div>
            <div className="rounded-md border p-4">
              <div className="mb-2 text-xs font-medium uppercase text-zinc-500">译文校对</div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">
                    {selectedReviewLanguage.language.name} · {selectedReviewLanguage.language.code}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    翻译人 {selectedReviewLanguage.translation.translatedBy ?? "-"} ·{" "}
                    {formatDateTime(selectedReviewLanguage.translation.translatedAt)}
                  </div>
                </div>
                <Badge variant="translated">待审核</Badge>
              </div>
              <Textarea value={reviewDraft} onChange={(event) => onReviewDraftChange(event.target.value)} className="min-h-[220px] leading-6" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onApprove}>
                <Check className="h-4 w-4" />
                审核通过
              </Button>
              <Button variant="outline" onClick={onReject}>
                <AlertTriangle className="h-4 w-4" />
                退回翻译
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState title="选择待审核项" description="左侧队列会显示所有已翻译但未审核的内容。" />
        )}
      </div>
    </section>
  );
}
