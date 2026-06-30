"use client";

import { CheckCheck, CopyPlus, ReplaceAll, Upload, WandSparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { ConflictAction, ImportConflict, ImportRow, TranslationProject } from "@/lib/types";
import { Metric } from "./metric";
import { PaginationBar } from "./pagination-bar";
import { TagPicker } from "./tag-picker";

export function ImportTab({
  project,
  activeLanguage,
  importRows,
  conflicts,
  paginatedImportRows,
  paginatedConflicts,
  selectedTagNames,
  tagOptions,
  tagColors,
  aiTargetLanguages,
  aiBusy,
  aiMessage,
  importPage,
  importPageCount,
  importPageSize,
  conflictPage,
  conflictPageCount,
  conflictPageSize,
  onParseFile,
  onSelectedTagNamesChange,
  onAiTargetLanguagesChange,
  onTranslateImportPreview,
  onSetConflictAction,
  onSetAllConflictActions,
  onImportPageChange,
  onConflictPageChange,
  onApplyImport
}: {
  project: TranslationProject;
  activeLanguage: string;
  importRows: ImportRow[];
  conflicts: ImportConflict[];
  paginatedImportRows: ImportRow[];
  paginatedConflicts: ImportConflict[];
  selectedTagNames: string[];
  tagOptions: string[];
  tagColors: Record<string, string>;
  aiTargetLanguages: string;
  aiBusy: boolean;
  aiMessage: string;
  importPage: number;
  importPageCount: number;
  importPageSize: number;
  conflictPage: number;
  conflictPageCount: number;
  conflictPageSize: number;
  onParseFile: (file: File) => void;
  onSelectedTagNamesChange: (value: string[]) => void;
  onAiTargetLanguagesChange: (value: string) => void;
  onTranslateImportPreview: () => void;
  onSetConflictAction: (conflictId: string, action: ConflictAction) => void;
  onSetAllConflictActions: (action: ConflictAction) => void;
  onImportPageChange: (page: number) => void;
  onConflictPageChange: (page: number) => void;
  onApplyImport: () => void;
}) {
  const conflictActionSummary = conflicts.reduce<Record<ConflictAction, number>>(
    (summary, conflict) => {
      summary[conflict.action] += 1;
      return summary;
    },
    { keep: 0, overwrite: 0, append: 0 }
  );

  return (
    <section className="space-y-4 rounded-lg border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">导入 JSON / Excel</h2>
          <p className="mt-1 text-sm text-zinc-500">导入时只处理 key 与译文，不覆盖系统内状态和操作时间。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white">
            <Upload className="h-4 w-4" />
            选择文件
            <input
              type="file"
              accept=".json,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onParseFile(file);
              }}
            />
          </label>
          <Button onClick={onApplyImport} disabled={!importRows.length || !selectedTagNames.length}>
            应用导入
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-zinc-50 p-3">
        <TagPicker
          label="导入 Tag"
          tagOptions={tagOptions}
          tagColors={tagColors}
          selectedTagNames={selectedTagNames}
          onChange={onSelectedTagNamesChange}
          allowCreate={false}
          required
        />
      </div>

      <div className="grid gap-3 rounded-md border bg-zinc-50 p-3 md:grid-cols-[1fr_auto]">
        <label className="space-y-1.5 text-xs font-medium text-zinc-500">
          AI 目标语言
          <Input value={aiTargetLanguages} onChange={(event) => onAiTargetLanguagesChange(event.target.value)} placeholder="zh,ro,pl,it" />
        </label>
        <div className="flex items-end">
          <Button onClick={onTranslateImportPreview} disabled={!importRows.length || aiBusy}>
            <WandSparkles className="h-4 w-4" />
            AI 补全导入预览
          </Button>
        </div>
      </div>
      {aiMessage && <p className="text-sm text-zinc-500">{aiMessage}</p>}

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="待导入" value={importRows.length} />
        <Metric label="冲突 key" value={conflicts.length} tone={conflicts.length ? "danger" : "default"} />
        <Metric label="新增" value={importRows.filter((row) => row.key && !project.entries.some((entry) => entry.key === row.key)).length} />
        <Metric label="未翻译" value={project.entries.filter((entry) => !entry.translations[activeLanguage]?.value).length} />
      </div>

      {conflicts.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-red-800">发现译文不一致的重复 key，请选择处理方式</div>
              <div className="mt-1 text-xs text-red-700">
                当前：沿用 {conflictActionSummary.keep} · 覆盖 {conflictActionSummary.overwrite} · 追加 {conflictActionSummary.append}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={conflictActionSummary.keep === conflicts.length ? "default" : "outline"}
                onClick={() => onSetAllConflictActions("keep")}
              >
                <CheckCheck className="h-4 w-4" />
                全部沿用
              </Button>
              <Button
                type="button"
                size="sm"
                variant={conflictActionSummary.overwrite === conflicts.length ? "default" : "outline"}
                onClick={() => onSetAllConflictActions("overwrite")}
              >
                <ReplaceAll className="h-4 w-4" />
                全部覆盖
              </Button>
              <Button
                type="button"
                size="sm"
                variant={conflictActionSummary.append === conflicts.length ? "default" : "outline"}
                onClick={() => onSetAllConflictActions("append")}
              >
                <CopyPlus className="h-4 w-4" />
                全部追加
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {paginatedConflicts.map((conflict) => (
              <div key={conflict.id} className="grid gap-2 rounded-md border bg-white p-3 md:grid-cols-[1fr_220px]">
                <div>
                  <div className="font-mono text-sm">{conflict.key}</div>
                  <div className="mt-1 text-xs text-zinc-500">新译文语言：{Object.keys(conflict.incoming.values).join(", ")}</div>
                </div>
                <Select value={conflict.action} onChange={(event) => onSetConflictAction(conflict.id, event.target.value as ConflictAction)}>
                  <option value="keep">沿用老翻译</option>
                  <option value="overwrite">覆盖为新翻译</option>
                  <option value="append">新增并自动加后缀</option>
                </Select>
              </div>
            ))}
          </div>
          <PaginationBar
            className="mt-4"
            page={conflictPage}
            pageCount={conflictPageCount}
            total={conflicts.length}
            pageSize={conflictPageSize}
            onPageChange={onConflictPageChange}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">key</th>
              <th className="px-3 py-2">语言</th>
              <th className="px-3 py-2">预览</th>
              <th className="px-3 py-2">状态</th>
            </tr>
          </thead>
          <tbody>
            {paginatedImportRows.map((row, index) => (
              <tr key={`${row.key}-${index}`} className="border-t">
                <td className="px-3 py-2 font-mono">{row.key}</td>
                <td className="px-3 py-2">{Object.keys(row.values).join(", ")}</td>
                <td className="max-w-[520px] px-3 py-2 text-xs text-zinc-500">
                  {Object.entries(row.values)
                    .map(([languageCode, value]) => `${languageCode}: ${value}`)
                    .join(" · ")}
                </td>
                <td className="px-3 py-2">
                  {conflicts.some((conflict) => conflict.key === row.key) ? (
                    <Badge variant="danger">冲突</Badge>
                  ) : (
                    <Badge variant="translated">可导入</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar page={importPage} pageCount={importPageCount} total={importRows.length} pageSize={importPageSize} onPageChange={onImportPageChange} />
    </section>
  );
}
