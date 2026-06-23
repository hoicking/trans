"use client";

import * as React from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TranslationProject } from "@/lib/types";
import { defaultTagColor, normalizeTagColor, normalizeTagName, tagColorPalette } from "@/lib/tags";
import { cn } from "@/lib/utils";
import { TagBadge } from "./tag-badge";

function ColorSwatches({
  value,
  onChange
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tagColorPalette.map((color) => {
        const selected = normalizeTagColor(value) === color;
        return (
          <button
            key={color}
            type="button"
            className={cn(
              "h-6 w-6 rounded-full border transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "scale-110 border-zinc-950 ring-2 ring-white" : "border-zinc-200"
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`选择颜色 ${color}`}
            title={color}
          />
        );
      })}
    </div>
  );
}

export function TagTab({
  project,
  onCreateTag,
  onRenameTag,
  onRequestDeleteTag
}: {
  project: TranslationProject;
  onCreateTag: (tagName: string, color: string) => void | Promise<void>;
  onRenameTag: (oldName: string, nextName: string, color: string) => void | Promise<void>;
  onRequestDeleteTag: (tagName: string) => void;
}) {
  const [newTagName, setNewTagName] = React.useState("");
  const [newTagColor, setNewTagColor] = React.useState(defaultTagColor);
  const [renameDrafts, setRenameDrafts] = React.useState<Record<string, string>>({});
  const [colorDrafts, setColorDrafts] = React.useState<Record<string, string>>({});
  const tags = React.useMemo(() => project.tags ?? [], [project.tags]);
  const tagColors = project.tagColors ?? {};
  const tagCounts = React.useMemo(() => {
    return Object.fromEntries(
      tags.map((tag) => [
        tag,
        project.entries.filter((entry) => (entry.tagNames ?? []).includes(tag)).length
      ])
    );
  }, [project.entries, tags]);

  async function createTag() {
    const tagName = normalizeTagName(newTagName);
    if (!tagName) return;
    await onCreateTag(tagName, newTagColor);
    setNewTagName("");
  }

  return (
    <section className="space-y-4 rounded-lg border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tag 维护</h2>
          <p className="mt-1 text-sm text-zinc-500">在这里统一创建、改名、选择颜色和删除 Tag。录入翻译时只允许选择这里已有的 Tag。</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-md border bg-zinc-50 p-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto]">
        <label className="space-y-1.5 text-xs font-medium text-zinc-500">
          新 Tag
          <Input
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void createTag();
            }}
            placeholder="例如 release-1.0 / EMS / high-risk"
          />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-zinc-500">
          颜色
          <ColorSwatches value={newTagColor} onChange={setNewTagColor} />
        </label>
        <div className="flex items-end">
          <Button onClick={() => void createTag()} disabled={!normalizeTagName(newTagName)}>
            <Plus className="h-4 w-4" />
            新建
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Tag</th>
              <th className="px-3 py-2">关联 key</th>
              <th className="px-3 py-2">名称</th>
              <th className="px-3 py-2">颜色</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => {
              const draft = renameDrafts[tag] ?? tag;
              const colorDraft = colorDrafts[tag] ?? tagColors[tag] ?? defaultTagColor;
              const normalizedDraft = normalizeTagName(draft);
              const currentColor = normalizeTagColor(tagColors[tag]);
              const nextColor = normalizeTagColor(colorDraft);
              const canSave = Boolean(normalizedDraft && (normalizedDraft !== tag || nextColor !== currentColor));
              return (
                <tr key={tag} className="border-t align-middle">
                  <td className="px-3 py-3">
                    <TagBadge name={tag} color={tagColors[tag]} className="max-w-[220px]" />
                  </td>
                  <td className="px-3 py-3 text-zinc-500">{tagCounts[tag] ?? 0}</td>
                  <td className="px-3 py-3">
                    <Input
                      value={draft}
                      onChange={(event) =>
                        setRenameDrafts((current) => ({
                          ...current,
                          [tag]: event.target.value
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ColorSwatches
                      value={colorDraft}
                      onChange={(color) =>
                        setColorDrafts((current) => ({
                          ...current,
                          [tag]: color
                        }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void onRenameTag(tag, normalizedDraft, nextColor)}
                        disabled={!canSave}
                      >
                        <Save className="h-3.5 w-3.5" />
                        保存
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onRequestDeleteTag(tag)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!tags.length && (
              <tr>
                <td className="px-3 py-8 text-center text-sm text-zinc-500" colSpan={5}>
                  暂无 Tag，请先新建一个。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
