"use client";

import { Plus, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { KeyGenerationMode, Language } from "@/lib/types";
import { TagPicker } from "./tag-picker";

export function AddTranslationDialog({
  open,
  languages,
  tagOptions,
  tagColors,
  selectedTagNames,
  sourceLanguage,
  newEntryKey,
  keyMode,
  sourceText,
  aiBusy,
  onClose,
  onTagNamesChange,
  onSourceLanguageChange,
  onNewEntryKeyChange,
  onKeyModeChange,
  onSourceTextChange,
  onAdd,
  onAddWithAi
}: {
  open: boolean;
  languages: Language[];
  tagOptions: string[];
  tagColors: Record<string, string>;
  selectedTagNames: string[];
  sourceLanguage: string;
  newEntryKey: string;
  keyMode: KeyGenerationMode;
  sourceText: string;
  aiBusy: boolean;
  onClose: () => void;
  onTagNamesChange: (tagNames: string[]) => void;
  onSourceLanguageChange: (languageCode: string) => void;
  onNewEntryKeyChange: (key: string) => void;
  onKeyModeChange: (mode: KeyGenerationMode) => void;
  onSourceTextChange: (text: string) => void;
  onAdd: () => void;
  onAddWithAi: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="flex max-h-[calc(100vh-32px)] w-full max-w-3xl flex-col rounded-lg border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">新增翻译</h2>
            <p className="mt-1 text-sm text-zinc-500">选择文本语言和 Tag 后创建单条翻译。</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <TagPicker
            tagOptions={tagOptions}
            tagColors={tagColors}
            selectedTagNames={selectedTagNames}
            onChange={onTagNamesChange}
            allowCreate={false}
            required
            disabled={aiBusy}
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-medium text-zinc-500">
              文本语言
              <Select value={sourceLanguage} onChange={(event) => onSourceLanguageChange(event.target.value)}>
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.code} · {language.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-zinc-500">
              Key 生成
              <Select value={keyMode} onChange={(event) => onKeyModeChange(event.target.value as KeyGenerationMode)}>
                <option value="semantic">语义化 key</option>
                <option value="text">文本 key</option>
              </Select>
            </label>
          </div>

          <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
            Key
            <Input value={newEntryKey} onChange={(event) => onNewEntryKeyChange(event.target.value)} placeholder="手动 key，可留空自动生成" />
          </label>

          <label className="block space-y-1.5 text-xs font-medium text-zinc-500">
            文本
            <Textarea
              value={sourceText}
              onChange={(event) => onSourceTextChange(event.target.value)}
              placeholder={sourceLanguage === "en" ? "录入英文文本" : `录入 ${sourceLanguage} 文本`}
              className="min-h-[150px] resize-none leading-6"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onAdd} disabled={!sourceText.trim() || !selectedTagNames.length || aiBusy}>
            <Plus className="h-4 w-4" />
            添加
          </Button>
          <Button onClick={onAddWithAi} disabled={!sourceText.trim() || !selectedTagNames.length || aiBusy}>
            <WandSparkles className="h-4 w-4" />
            添加并 AI 补全
          </Button>
        </div>
      </div>
    </div>
  );
}
