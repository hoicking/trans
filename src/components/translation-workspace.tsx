"use client";

import * as React from "react";
import {
  ChevronRight,
  Download,
  Languages,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  WandSparkles
} from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AddTranslationDialog } from "@/components/workspace/add-translation-dialog";
import { ConfirmDialog } from "@/components/workspace/confirm-dialog";
import { ExportTab } from "@/components/workspace/export-tab";
import { ImportTab } from "@/components/workspace/import-tab";
import { Metric } from "@/components/workspace/metric";
import { PaginationBar } from "@/components/workspace/pagination-bar";
import { ReviewTab, type ReviewItem, type ReviewSort } from "@/components/workspace/review-tab";
import { SettingsPanel } from "@/components/workspace/settings-panel";
import { formatDateTag, latestTagName, tagToDateInputValue, todayDateInputValue } from "@/components/workspace/tag-utils";
import { TranslationTab, type StatusFilter } from "@/components/workspace/translation-tab";
import { useProjects } from "@/components/workspace/use-projects";
import { defaultTranslationVibe } from "@/lib/ai-defaults";
import { defaultLanguages } from "@/lib/seed";
import type {
  ConflictAction,
  ImportConflict,
  ImportRow,
  KeyGenerationMode,
  AiConfig,
  TranslationEntry,
  TranslationProject,
  TranslationValue
} from "@/lib/types";
import { cn, formatDateTime, makeId, semanticKey, slugKey, uniqueKey } from "@/lib/utils";
import { createZipBlob } from "@/lib/zip";

type Tab = "dashboard" | "translations" | "review" | "import" | "export" | "settings";

const currentUser = "Admin";
const importChunkSize = 200;
const reservedImportColumns = new Set([
  "key",
  "sourcelanguage",
  "source_language",
  "translated",
  "reviewed",
  "translatedat",
  "reviewedat"
]);

function aiErrorMessage(raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error && typeof parsed.error === "object") return JSON.stringify(parsed.error);
  } catch {
    // The provider may return plain text or HTML for upstream errors.
  }
  return raw || "AI 服务调用失败";
}

function parseLanguageCodes(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function emptyValue(): TranslationValue {
  return {
    value: "",
    isTranslated: false,
    translatedAt: null,
    translatedBy: null,
    isReviewed: false,
    reviewedAt: null,
    reviewedBy: null
  };
}

function projectStats(project: TranslationProject) {
  const languageCount = project.languages.length;
  const total = project.entries.length * languageCount;
  const translated = project.entries.reduce(
    (sum, entry) => sum + project.languages.filter((language) => entry.translations[language.code]?.isTranslated).length,
    0
  );
  const reviewed = project.entries.reduce(
    (sum, entry) => sum + project.languages.filter((language) => entry.translations[language.code]?.isReviewed).length,
    0
  );

  return {
    keys: project.entries.length,
    languageCount,
    total,
    translated,
    reviewed,
    translatedRate: total ? Math.round((translated / total) * 100) : 0,
    reviewedRate: total ? Math.round((reviewed / total) * 100) : 0
  };
}

function languageStats(project: TranslationProject, code: string) {
  const total = project.entries.length;
  const translated = project.entries.filter((entry) => entry.translations[code]?.isTranslated).length;
  const reviewed = project.entries.filter((entry) => entry.translations[code]?.isReviewed).length;

  return {
    translated,
    reviewed,
    translatedRate: total ? Math.round((translated / total) * 100) : 0,
    reviewedRate: total ? Math.round((reviewed / total) * 100) : 0
  };
}

function createProject(name: string): TranslationProject {
  const now = new Date().toISOString();
  return {
    id: makeId("project"),
    name,
    description: "新的多语言项目",
    languages: defaultLanguages,
    entries: [],
    members: [{ id: makeId("member"), name: "Admin", email: "admin@example.com", role: "ADMIN" }],
    aiConfig: {
      activeProvider: "deepseek",
      translationVibe: defaultTranslationVibe,
      providers: {
        chatgpt: {
          providerName: "ChatGPT",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4o-mini",
          apiKey: ""
        },
        deepseek: {
          providerName: "DeepSeek",
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-v4-flash",
          apiKey: ""
        }
      }
    },
    createdAt: now,
    updatedAt: now
  };
}

function downloadFile(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function cellStatus(value?: TranslationValue) {
  if (!value?.value) return { label: "未翻译", variant: "pending" as const };
  if (value.isReviewed) return { label: "已审核", variant: "reviewed" as const };
  if (value.isTranslated) return { label: "待审核", variant: "translated" as const };
  return { label: "未完成", variant: "pending" as const };
}

function TranslationValueEditor({
  entryId,
  languageCode,
  translation,
  onCommit
}: {
  entryId: string;
  languageCode: string;
  translation: TranslationValue;
  onCommit: (entryId: string, languageCode: string, value: string) => void;
}) {
  const [draft, setDraft] = React.useState(translation.value);
  const [isFocused, setIsFocused] = React.useState(false);
  const status = cellStatus(translation);

  React.useEffect(() => {
    if (!isFocused) {
      setDraft(translation.value);
    }
  }, [isFocused, translation.value]);

  function commitDraft() {
    setIsFocused(false);
    const shouldMarkTranslated = Boolean(draft.trim());
    if (draft !== translation.value || (!translation.isTranslated && shouldMarkTranslated)) {
      onCommit(entryId, languageCode, draft);
    }
  }

  return (
    <div className="w-[220px] space-y-2">
      <Textarea
        value={draft}
        onFocus={() => setIsFocused(true)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        className="h-[72px] min-h-[72px] resize-none overflow-y-auto leading-relaxed"
        placeholder="待翻译"
      />
      <div className="flex items-center justify-between gap-2">
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="text-xs text-zinc-400">{formatDateTime(translation.reviewedAt ?? translation.translatedAt)}</span>
      </div>
    </div>
  );
}

function normalizeImportHeader(header: string) {
  return header.trim().replace(/^\uFEFF/, "");
}

function isLanguageImportColumn(header: string) {
  const normalized = normalizeImportHeader(header);
  const compact = normalized.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!normalized || reservedImportColumns.has(compact)) return false;
  if (compact.endsWith("_translated") || compact.endsWith("_reviewed")) return false;
  if (compact.endsWith("_translatedat") || compact.endsWith("_reviewedat")) return false;
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(normalized);
}

export function TranslationWorkspace() {
  const { projects, setProjects, activeProjectId, setActiveProjectId, isLoading } = useProjects();
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeTab, setActiveTab] = React.useState<Tab>("dashboard");
  const [search, setSearch] = React.useState("");
  const [appliedSearch, setAppliedSearch] = React.useState("");
  const [searchResultEntryIds, setSearchResultEntryIds] = React.useState<string[] | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [entryTagFilter, setEntryTagFilter] = React.useState("all");
  const [activeLanguage, setActiveLanguage] = React.useState("all");
  const [entryPage, setEntryPage] = React.useState(1);
  const [reviewPage, setReviewPage] = React.useState(1);
  const [importPage, setImportPage] = React.useState(1);
  const [conflictPage, setConflictPage] = React.useState(1);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newEntryKey, setNewEntryKey] = React.useState("");
  const [sourceText, setSourceText] = React.useState("");
  const [sourceLanguage, setSourceLanguage] = React.useState("en");
  const [entryDialogOpen, setEntryDialogOpen] = React.useState(false);
  const [keyMode, setKeyMode] = React.useState<KeyGenerationMode>("semantic");
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [conflicts, setConflicts] = React.useState<ImportConflict[]>([]);
  const [selectedTagName, setSelectedTagName] = React.useState("");
  const [tagDate, setTagDate] = React.useState(todayDateInputValue());
  const [selectedReviewEntryId, setSelectedReviewEntryId] = React.useState<string | null>(null);
  const [activeReviewLanguage, setActiveReviewLanguage] = React.useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = React.useState("");
  const [reviewSearch, setReviewSearch] = React.useState("");
  const deferredReviewSearch = React.useDeferredValue(reviewSearch);
  const [reviewLanguage, setReviewLanguage] = React.useState("all");
  const [reviewTagName, setReviewTagName] = React.useState("");
  const [reviewSort, setReviewSort] = React.useState<ReviewSort>("latest");
  const [deleteEntryTarget, setDeleteEntryTarget] = React.useState<TranslationEntry | null>(null);
  const [deleteTagRequested, setDeleteTagRequested] = React.useState(false);
  const [deleteProjectRequested, setDeleteProjectRequested] = React.useState(false);
  const [aiTargetLanguages, setAiTargetLanguages] = React.useState("zh,ro,pl,it");
  const [aiMessage, setAiMessage] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const reviewDefaultedProjectId = React.useRef("");

  const emptyProject = React.useMemo(() => createProject(""), []);
  const loadedProject = projects.find((project) => project.id === activeProjectId) ?? projects[0] ?? null;
  const activeProject = loadedProject ?? emptyProject;
  const hasActiveProject = Boolean(loadedProject);
  const tagOptions = React.useMemo(() => {
    return Array.from(new Set([...(activeProject?.tags ?? []), selectedTagName].filter(Boolean))).sort();
  }, [activeProject?.tags, selectedTagName]);

  React.useEffect(() => {
    if (!activeProject) return;
    const projectTags = activeProject.tags ?? [];
    if (!projectTags.length) {
      if (selectedTagName) setSelectedTagName("");
      return;
    }
    const nextTag = latestTagName(projectTags);
    if (!selectedTagName || !projectTags.includes(selectedTagName)) {
      setSelectedTagName(nextTag);
      setTagDate(tagToDateInputValue(nextTag));
    }
  }, [activeProject, selectedTagName]);

  React.useEffect(() => {
    if (reviewDefaultedProjectId.current === activeProject.id) return;
    reviewDefaultedProjectId.current = activeProject.id;
    const projectTags = activeProject.tags ?? [];
    setReviewTagName(projectTags.length ? latestTagName(projectTags) : "all");
  }, [activeProject.id, activeProject.tags]);

  React.useEffect(() => {
    if (reviewTagName === "all") return;
    const projectTags = activeProject.tags ?? [];
    if (!reviewTagName || !projectTags.includes(reviewTagName)) {
      setReviewTagName(projectTags.length ? latestTagName(projectTags) : "all");
    }
  }, [activeProject.tags, reviewTagName]);

  const stats = projectStats(activeProject);

  const persistProject = React.useCallback(async (project: TranslationProject) => {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(project)
      });
      if (!response.ok) throw new Error(await response.text());
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  }, []);

  const persistAiConfig = React.useCallback(async (projectId: string, aiConfig: AiConfig) => {
    const normalizedAiConfig = {
      ...aiConfig,
      translationVibe: aiConfig.translationVibe.trim() || defaultTranslationVibe
    };
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${projectId}/ai-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig: normalizedAiConfig })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { updatedAt?: string };
      const updatedAt = payload.updatedAt ?? new Date().toISOString();
      setProjects((current) =>
        current.map((project) => (project.id === projectId ? { ...project, aiConfig: normalizedAiConfig, updatedAt } : project))
      );
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
      throw new Error("AI config save failed.");
    }
  }, [setProjects]);

  const persistTranslation = React.useCallback(
    async (entryId: string, languageCode: string, value: string, isTranslated: boolean, isReviewed = false) => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/projects/${activeProject.id}/translations`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryId,
            languageCode,
            value,
            isTranslated,
            isReviewed,
            actorName: currentUser
          })
        });
        if (!response.ok) throw new Error(await response.text());
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1600);
      } catch {
        setSaveState("error");
      }
    },
    [activeProject.id]
  );

  const createDateTag = React.useCallback(async (requestedTagName?: string) => {
    const tagName = requestedTagName ?? formatDateTag(tagDate);
    if (!tagName) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { tags?: string[] };
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProject.id
            ? { ...project, tags: payload.tags ?? Array.from(new Set([...(project.tags ?? []), tagName])).sort() }
            : project
        )
      );
      setSelectedTagName(tagName);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  }, [activeProject.id, setProjects, tagDate]);

  const renameDateTag = React.useCallback(async (nextTagName: string) => {
    if (!selectedTagName || !nextTagName || selectedTagName === nextTagName) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/tags`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldName: selectedTagName, name: nextTagName })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { tags?: string[] };
      const tags = payload.tags ?? [];
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                tags,
                entries: project.entries.map((entry) => ({
                  ...entry,
                  translations: Object.fromEntries(
                    Object.entries(entry.translations).map(([languageCode, translation]) => [
                      languageCode,
                      {
                        ...translation,
                        tagNames: translation.tagNames?.map((tag) => (tag === selectedTagName ? nextTagName : tag))
                      }
                    ])
                  )
                }))
              }
            : project
        )
      );
      setSelectedTagName(nextTagName);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    }
  }, [activeProject.id, selectedTagName, setProjects]);

  const deleteDateTag = React.useCallback(async () => {
    if (!selectedTagName) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedTagName })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { tags?: string[] };
      const tags = payload.tags ?? [];
      setProjects((current) =>
        current.map((project) =>
          project.id === activeProject.id
            ? {
                ...project,
                tags,
                entries: project.entries.map((entry) => ({
                  ...entry,
                  translations: Object.fromEntries(
                    Object.entries(entry.translations).map(([languageCode, translation]) => [
                      languageCode,
                      {
                        ...translation,
                        tagNames: translation.tagNames?.filter((tag) => tag !== selectedTagName)
                      }
                    ])
                  )
                }))
              }
            : project
        )
      );
      const nextTag = tags.length ? latestTagName(tags) : "";
      setSelectedTagName(nextTag);
      setTagDate(nextTag ? tagToDateInputValue(nextTag) : todayDateInputValue());
      setEntryTagFilter((current) => (current === selectedTagName ? "all" : current));
      setReviewTagName((current) => (current === selectedTagName ? "all" : current));
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    } finally {
      setDeleteTagRequested(false);
    }
  }, [activeProject.id, selectedTagName, setProjects]);

  const deleteEntry = React.useCallback(async (entryId: string) => {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { project?: TranslationProject };
      if (payload.project) {
        setProjects((current) => current.map((project) => (project.id === payload.project?.id ? payload.project : project)));
      } else {
        setProjects((current) =>
          current.map((project) =>
            project.id === activeProject.id
              ? { ...project, entries: project.entries.filter((entry) => entry.id !== entryId), updatedAt: new Date().toISOString() }
              : project
          )
        );
      }
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    } finally {
      setDeleteEntryTarget(null);
    }
  }, [activeProject.id, setProjects]);

  const deleteProject = React.useCallback(async () => {
    const projectId = activeProject.id;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE"
      });
      if (!response.ok) throw new Error(await response.text());

      const nextProjects = projects.filter((project) => project.id !== projectId);
      setProjects(nextProjects);
      setActiveProjectId(nextProjects[0]?.id ?? null);
      setActiveTab("dashboard");
      setSelectedTagName("");
      setEntryTagFilter("all");
      setReviewTagName("all");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      setSaveState("error");
    } finally {
      setDeleteProjectRequested(false);
    }
  }, [activeProject.id, projects, setActiveProjectId, setProjects]);

  const updateProject = React.useCallback(
    (updater: (project: TranslationProject) => TranslationProject, options?: { persist?: boolean }) => {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== activeProject.id) return project;
          const nextProject = updater(project);
          if (options?.persist) {
            queueMicrotask(() => void persistProject(nextProject));
          }
          return nextProject;
        })
      );
    },
    [activeProject.id, persistProject, setProjects]
  );

  const getTargetLanguages = React.useCallback(
    (project: TranslationProject, sourceLanguageCode: string, requestedLanguages?: string) => {
      const requested = requestedLanguages ? parseLanguageCodes(requestedLanguages) : project.languages.map((language) => language.code);
      const available = new Set(project.languages.map((language) => language.code.toLowerCase()));
      return requested.filter((languageCode) => languageCode !== sourceLanguageCode.toLowerCase() && available.has(languageCode));
    },
    []
  );

  const getMissingTargetLanguages = React.useCallback(
    (project: TranslationProject, entry: TranslationEntry, sourceLanguageCode: string, requestedLanguages?: string) => {
      return getTargetLanguages(project, sourceLanguageCode, requestedLanguages).filter(
        (languageCode) => !entry.translations[languageCode]?.value?.trim()
      );
    },
    [getTargetLanguages]
  );

  const buildImportConflicts = React.useCallback(
    (rows: ImportRow[]) => {
      const existingKeys = new Set(activeProject.entries.map((entry) => entry.key));
      return rows
        .filter((row): row is ImportRow & { key: string } => Boolean(row.key && existingKeys.has(row.key)))
        .map((row) => ({
          id: makeId("conflict"),
          key: row.key,
          incoming: row,
          action: "keep" as ConflictAction
        }));
    },
    [activeProject.entries]
  );

  const requestAiTranslations = React.useCallback(
    async (
      project: TranslationProject,
      sourceLanguageCode: string,
      targetLanguages: string[],
      items: Array<{ key: string; text: string }>
    ) => {
      const cleanItems = items.filter((item) => item.key && item.text.trim());
      if (!cleanItems.length || !targetLanguages.length) {
        return { translations: {}, failure: "" };
      }

      const activeConfig = project.aiConfig.providers[project.aiConfig.activeProvider];
      let translations: Record<string, Record<string, string>> = {};
      let failure = "";
      if (!activeConfig.apiKey) {
        return { translations: {}, failure: "请先在设置中配置 AI API Key。" };
      }

      try {
        const response = await fetch("/api/ai/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: {
              ...activeConfig,
              translationVibe: project.aiConfig.translationVibe
            },
            sourceLanguage: sourceLanguageCode,
            targetLanguages,
            items: cleanItems
          })
        });
        const body = await response.text();
        if (!response.ok) throw new Error(aiErrorMessage(body));
        const payload = JSON.parse(body) as { translations?: Record<string, Record<string, string>> };
        if (!payload.translations) throw new Error("AI 返回结果缺少 translations 字段");
        translations = payload.translations;
      } catch (error) {
        failure = error instanceof Error ? error.message : "AI 服务调用失败";
      }

      return {
        translations,
        failure
      };
    },
    []
  );

  const mergeProjectTranslations = React.useCallback(
    async (
      project: TranslationProject,
      generated: Record<string, Record<string, string>>,
      targetLanguages: string[],
      tagName?: string,
      options?: { overwrite?: boolean }
    ) => {
      const now = new Date().toISOString();
      const overwrite = Boolean(options?.overwrite);
      const valuesToPersist: Array<{ entryId: string; languageCode: string; value: string; refreshTranslatedMeta: boolean }> = [];
      const nextProject = {
        ...project,
        entries: project.entries.map((entry) => {
          const generatedForEntry = generated[entry.key];
          if (!generatedForEntry) return entry;

          const updates: Record<string, TranslationValue> = {};
          for (const languageCode of targetLanguages) {
            const existingValue = entry.translations[languageCode]?.value?.trim();
            if (existingValue && !overwrite) continue;
            const text = generatedForEntry[languageCode];
            if (!text) continue;
            valuesToPersist.push({ entryId: entry.id, languageCode, value: text, refreshTranslatedMeta: overwrite });
            updates[languageCode] = {
              ...(entry.translations[languageCode] ?? emptyValue()),
              value: text,
              isTranslated: true,
              translatedAt: now,
              translatedBy: "AI",
              isReviewed: false,
              reviewedAt: null,
              reviewedBy: null
            };
          }

          return {
            ...entry,
            translations: {
              ...entry.translations,
              ...updates
            },
            updatedAt: now
          };
        }),
        updatedAt: now
      };

      setProjects((current) => current.map((item) => (item.id === nextProject.id ? nextProject : item)));
      if (valuesToPersist.length) {
        setSaveState("saving");
        try {
          for (const item of valuesToPersist) {
            const response = await fetch(`/api/projects/${project.id}/translations`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                entryId: item.entryId,
                languageCode: item.languageCode,
                value: item.value,
                isTranslated: true,
                isReviewed: false,
                actorName: "AI",
                refreshTranslatedMeta: item.refreshTranslatedMeta,
                tagName
              })
            });
            if (!response.ok) throw new Error(await response.text());
          }
          setSaveState("saved");
          window.setTimeout(() => setSaveState("idle"), 1600);
        } catch {
          setSaveState("error");
          throw new Error("AI translations save failed.");
        }
      }
      return nextProject;
    },
    [setProjects]
  );

  const translateProjectEntries = React.useCallback(
    async (
      project: TranslationProject,
      entries: TranslationEntry[],
      sourceLanguageCode: string,
      targetLanguages: string[],
      tagName?: string,
      options?: {
        overwrite?: boolean;
        busyMessage?: string;
        successMessage?: string;
        emptyTargetsMessage?: string;
      }
    ) => {
      const items = entries
        .map((entry) => ({
          key: entry.key,
          text:
            entry.translations[sourceLanguageCode]?.value ||
            Object.values(entry.translations).find((translation) => translation.value)?.value ||
            ""
        }))
        .filter((item) => item.text);

      if (!items.length) {
        setAiMessage("没有可用于 AI 翻译的源文本。");
        return project;
      }
      if (!targetLanguages.length) {
        setAiMessage(options?.emptyTargetsMessage ?? "没有需要补全的目标语言。");
        return project;
      }

      setAiBusy(true);
      setAiMessage(options?.busyMessage ?? "正在 AI 补全译文...");
      try {
        const result = await requestAiTranslations(project, sourceLanguageCode, targetLanguages, items);
        if (result.failure) {
          setAiMessage(`AI 服务调用失败：${result.failure}。未写入译文。`);
          return project;
        }
        const nextProject = await mergeProjectTranslations(project, result.translations, targetLanguages, tagName, {
          overwrite: options?.overwrite
        });
        setAiMessage(options?.successMessage ?? "AI 已补全缺漏语言，结果进入待审核。");
        return nextProject;
      } finally {
        setAiBusy(false);
      }
    },
    [mergeProjectTranslations, requestAiTranslations]
  );

  const entryMatchesSearch = React.useCallback((entry: TranslationEntry, query: string) => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return true;
    const values = Object.values(entry.translations).map((value) => value.value.toLowerCase());
    return entry.key.toLowerCase().includes(cleanQuery) || values.some((value) => value.includes(cleanQuery));
  }, []);

  const runEntrySearch = React.useCallback(() => {
    const query = search.trim();
    setAppliedSearch(query);
    setSearchResultEntryIds(query ? activeProject.entries.filter((entry) => entryMatchesSearch(entry, query)).map((entry) => entry.id) : null);
    setEntryPage(1);
  }, [activeProject.entries, entryMatchesSearch, search]);

  const filteredEntries = React.useMemo(() => {
    const searchResultSet = searchResultEntryIds ? new Set(searchResultEntryIds) : null;
    return activeProject.entries.filter((entry) => {
      const matchesSearch = !appliedSearch || Boolean(searchResultSet?.has(entry.id));
      const statusValues =
        activeLanguage === "all"
          ? activeProject.languages.map((language) => entry.translations[language.code])
          : [entry.translations[activeLanguage]];
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "missing" && statusValues.some((translation) => !translation?.value)) ||
        (statusFilter === "translated" && statusValues.some((translation) => Boolean(translation?.isTranslated))) ||
        (statusFilter === "reviewed" && statusValues.some((translation) => Boolean(translation?.isReviewed))) ||
        (statusFilter === "unreviewed" &&
          statusValues.some((translation) => Boolean(translation?.isTranslated) && !translation?.isReviewed));
      const matchesTag =
        entryTagFilter === "all" ||
        Object.values(entry.translations).some((value) => value.tagNames?.includes(entryTagFilter));

      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [activeLanguage, activeProject.entries, activeProject.languages, appliedSearch, entryTagFilter, searchResultEntryIds, statusFilter]);

  const entryPageSize = 10;
  const entryPageCount = Math.max(1, Math.ceil(filteredEntries.length / entryPageSize));
  const paginatedEntries = React.useMemo(() => {
    const safePage = Math.min(entryPage, entryPageCount);
    const start = (safePage - 1) * entryPageSize;
    return filteredEntries.slice(start, start + entryPageSize);
  }, [entryPage, entryPageCount, filteredEntries]);

  const reviewQueueItems = React.useMemo(() => {
    return activeProject.entries.flatMap((entry) =>
      activeProject.languages
        .filter((language) => {
          const translation = entry.translations[language.code];
          return translation?.value && translation.isTranslated && !translation.isReviewed;
        })
        .map((language) => ({ entry, language, translation: entry.translations[language.code] }))
    );
  }, [activeProject.entries, activeProject.languages]);

  const reviewItems = React.useMemo(() => {
    const query = deferredReviewSearch.trim().toLowerCase();
    const itemTimestamp = (item: ReviewItem, mode: "latest" | "oldest") => {
      const times = item.pendingLanguages
        .map((pending) => pending.translation.translatedAt)
        .filter((value): value is string => Boolean(value))
        .map((value) => new Date(value).getTime())
        .filter((value) => Number.isFinite(value));
      if (!times.length) return new Date(item.entry.updatedAt || item.entry.createdAt).getTime();
      return mode === "latest" ? Math.max(...times) : Math.min(...times);
    };

    const items = activeProject.entries
      .map((entry) => {
        const pendingLanguages = activeProject.languages
          .map((language) => ({
            language,
            translation: entry.translations[language.code]
          }))
          .filter((item) => {
            const matchesLanguage = reviewLanguage === "all" || item.language.code === reviewLanguage;
            const matchesTag = reviewTagName === "all" || item.translation?.tagNames?.includes(reviewTagName);
            return (
              matchesLanguage &&
              matchesTag &&
              item.translation?.value &&
              item.translation.isTranslated &&
              !item.translation.isReviewed
            );
          });

        const source = entry.translations[entry.sourceLanguage]?.value ?? "";
        const matchesSearch =
          !query ||
          entry.key.toLowerCase().includes(query) ||
          source.toLowerCase().includes(query) ||
          pendingLanguages.some((item) => item.translation.value.toLowerCase().includes(query));

        return {
          entry,
          pendingLanguages: matchesSearch ? pendingLanguages : []
        };
      })
      .filter((item) => item.pendingLanguages.length > 0);

    return items.sort((left, right) => {
      if (reviewSort === "mostPending") {
        const pendingDiff = right.pendingLanguages.length - left.pendingLanguages.length;
        if (pendingDiff !== 0) return pendingDiff;
        return itemTimestamp(right, "latest") - itemTimestamp(left, "latest");
      }
      if (reviewSort === "oldest") {
        return itemTimestamp(left, "oldest") - itemTimestamp(right, "oldest");
      }
      return itemTimestamp(right, "latest") - itemTimestamp(left, "latest");
    });
  }, [activeProject.entries, activeProject.languages, deferredReviewSearch, reviewLanguage, reviewSort, reviewTagName]);

  const reviewPageSize = 10;
  const reviewPageCount = Math.max(1, Math.ceil(reviewItems.length / reviewPageSize));
  const paginatedReviewItems = React.useMemo(() => {
    const safePage = Math.min(reviewPage, reviewPageCount);
    const start = (safePage - 1) * reviewPageSize;
    return reviewItems.slice(start, start + reviewPageSize);
  }, [reviewItems, reviewPage, reviewPageCount]);

  const importPageSize = 100;
  const importPageCount = Math.max(1, Math.ceil(importRows.length / importPageSize));
  const paginatedImportRows = React.useMemo(() => {
    const safePage = Math.min(importPage, importPageCount);
    const start = (safePage - 1) * importPageSize;
    return importRows.slice(start, start + importPageSize);
  }, [importPage, importPageCount, importRows]);

  const conflictPageSize = 50;
  const conflictPageCount = Math.max(1, Math.ceil(conflicts.length / conflictPageSize));
  const paginatedConflicts = React.useMemo(() => {
    const safePage = Math.min(conflictPage, conflictPageCount);
    const start = (safePage - 1) * conflictPageSize;
    return conflicts.slice(start, start + conflictPageSize);
  }, [conflictPage, conflictPageCount, conflicts]);

  React.useEffect(() => {
    setEntryPage(1);
  }, [activeLanguage, appliedSearch, entryTagFilter, statusFilter, activeProject.id]);

  React.useEffect(() => {
    setSearch("");
    setAppliedSearch("");
    setSearchResultEntryIds(null);
  }, [activeProject.id]);

  React.useEffect(() => {
    if (activeLanguage === "all") return;
    const languageStillExists = activeProject.languages.some((language) => language.code === activeLanguage);
    if (!languageStillExists) {
      setActiveLanguage("all");
    }
  }, [activeLanguage, activeProject.languages]);

  React.useEffect(() => {
    setReviewPage(1);
  }, [deferredReviewSearch, reviewLanguage, reviewSort, reviewTagName, activeProject.id]);

  React.useEffect(() => {
    setImportPage(1);
    setConflictPage(1);
  }, [importRows.length, conflicts.length]);

  React.useEffect(() => {
    if (!reviewItems.length) {
      setSelectedReviewEntryId(null);
      setActiveReviewLanguage(null);
      setReviewDraft("");
      return;
    }
    const selectedItem = reviewItems.find((item) => item.entry.id === selectedReviewEntryId) ?? reviewItems[0];
    const selectedLanguage =
      selectedItem.pendingLanguages.find((item) => item.language.code === activeReviewLanguage) ?? selectedItem.pendingLanguages[0];

    setSelectedReviewEntryId(selectedItem.entry.id);
    setActiveReviewLanguage(selectedLanguage.language.code);
    setReviewDraft(selectedLanguage.translation.value);
  }, [activeReviewLanguage, reviewItems, selectedReviewEntryId]);

  React.useEffect(() => {
    if (reviewLanguage === "all") return;
    const languageStillExists = activeProject.languages.some((language) => language.code === reviewLanguage);
    if (!languageStillExists) {
      setReviewLanguage("all");
    }
  }, [activeProject.languages, reviewLanguage]);

  const setTranslation = React.useCallback((entryId: string, languageCode: string, value: string) => {
    const now = new Date().toISOString();
    const translated = Boolean(value.trim());
    updateProject((project) => ({
      ...project,
      updatedAt: now,
      entries: project.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              updatedAt: now,
              translations: {
                ...entry.translations,
                [languageCode]: {
                  ...(entry.translations[languageCode] ?? emptyValue()),
                  value,
                  isTranslated: translated && Boolean(value),
                  translatedAt: translated && value ? now : entry.translations[languageCode]?.translatedAt ?? null,
                  translatedBy: translated && value ? currentUser : entry.translations[languageCode]?.translatedBy ?? null,
                  isReviewed: false,
                  reviewedAt: null,
                  reviewedBy: null
                }
              }
            }
          : entry
        )
    }));
    void persistTranslation(entryId, languageCode, value, translated);
  }, [persistTranslation, updateProject]);

  function approveReview() {
    if (!selectedReviewEntryId || !activeReviewLanguage) return;
    const entryId = selectedReviewEntryId;
    const languageCode = activeReviewLanguage;
    const now = new Date().toISOString();

    updateProject((project) => ({
      ...project,
      updatedAt: now,
      entries: project.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              updatedAt: now,
              translations: {
                ...entry.translations,
                [languageCode]: {
                  ...(entry.translations[languageCode] ?? emptyValue()),
                  value: reviewDraft,
                  isTranslated: true,
                  translatedAt: entry.translations[languageCode]?.translatedAt ?? now,
                  translatedBy: entry.translations[languageCode]?.translatedBy ?? currentUser,
                  isReviewed: true,
                  reviewedAt: now,
                  reviewedBy: currentUser
                }
              }
            }
          : entry
      )
    }));
    void persistTranslation(entryId, languageCode, reviewDraft, true, true);
  }

  function rejectReview() {
    if (!selectedReviewEntryId || !activeReviewLanguage) return;
    const entryId = selectedReviewEntryId;
    const languageCode = activeReviewLanguage;
    const now = new Date().toISOString();
    updateProject((project) => ({
      ...project,
      updatedAt: now,
      entries: project.entries.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              updatedAt: now,
              translations: {
                ...entry.translations,
                [languageCode]: {
                  ...(entry.translations[languageCode] ?? emptyValue()),
                  value: reviewDraft,
                  isTranslated: false,
                  translatedAt: null,
                  translatedBy: null,
                  isReviewed: false,
                  reviewedAt: null,
                  reviewedBy: null
                }
              }
            }
          : entry
      )
    }));
    void persistTranslation(entryId, languageCode, reviewDraft, false, false);
  }

  async function addEntry(options?: { translate?: boolean }) {
    const text = sourceText.trim();
    if (!text) return;
    const shouldTranslate = Boolean(options?.translate);
    setSaveState("saving");
    try {
      const response = await fetch(`/api/projects/${activeProject.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newEntryKey.trim() || undefined,
          sourceLanguage,
          sourceValue: text,
          keyGenerationMode: keyMode,
          tagName: selectedTagName
        })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { project?: TranslationProject; entryId?: string };
      if (payload.project) {
        setProjects((current) => current.map((project) => (project.id === payload.project?.id ? payload.project : project)));
      }
      setNewEntryKey("");
      setSourceText("");
      setEntryDialogOpen(false);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
      setActiveTab("translations");
      if (shouldTranslate && payload.project && payload.entryId) {
        const entry = payload.project.entries.find((item) => item.id === payload.entryId);
        if (entry) {
          await translateProjectEntries(
            payload.project,
            [entry],
            sourceLanguage,
            getMissingTargetLanguages(payload.project, entry, sourceLanguage),
            selectedTagName
          );
        }
      }
    } catch {
      setSaveState("error");
    }
  }

  async function addProject() {
    const name = newProjectName.trim();
    if (!name) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { project?: TranslationProject };
      const project = payload.project ?? createProject(name);
      setProjects((current) => [project, ...current]);
      setActiveProjectId(project.id);
      setNewProjectName("");
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
    } catch {
      const project = createProject(name);
      setProjects((current) => [project, ...current]);
      setActiveProjectId(project.id);
      setNewProjectName("");
      setSaveState("error");
    }
  }

  function addLanguage(code: string, name: string) {
    const cleanCode = code.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanCode || !cleanName || activeProject.languages.some((language) => language.code === cleanCode)) return;
    updateProject((project) => ({
      ...project,
      languages: [...project.languages, { code: cleanCode, name: cleanName }],
      entries: project.entries.map((entry) => ({
        ...entry,
        translations: {
          ...entry.translations,
          [cleanCode]: emptyValue()
        }
      }))
    }), { persist: true });
  }

  async function parseImportFile(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "json") {
      const parsed = JSON.parse(await file.text()) as Record<string, string>;
      const importLanguage = activeLanguage === "all" ? "en" : activeLanguage;
      prepareImport(Object.entries(parsed).map(([key, value]) => ({ key, sourceLanguage: importLanguage, values: { [importLanguage]: String(value) } })));
      return;
    }

    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
    const headers = Object.keys(rows[0] ?? {}).map(normalizeImportHeader);
    const languageColumns = headers.filter(isLanguageImportColumn);
    const importRowsFromExcel = rows.map((row) => {
      const values = Object.fromEntries(
        languageColumns
          .map((languageCode) => [languageCode.toLowerCase(), String(row[languageCode] ?? "").trim()])
          .filter(([, value]) => value)
      );
      const sourceLanguageFromRow = String(row.sourceLanguage ?? row.source_language ?? "").trim();
      return {
        key: String(row.key ?? "").trim() || undefined,
        sourceLanguage: sourceLanguageFromRow || (values.en ? "en" : Object.keys(values)[0] ?? "en"),
        values
      };
    });
    prepareImport(importRowsFromExcel);
  }

  function prepareImport(rows: ImportRow[]) {
    const incomingRows = rows.filter((row) => Object.keys(row.values).length);
    const existingKeys = new Set(activeProject.entries.map((entry) => entry.key));
    const generatedRows = incomingRows.map((row) => {
      if (row.key) return row;
      const sourceLanguageForRow = row.sourceLanguage ?? "en";
      const text = row.values.en || row.values[sourceLanguageForRow] || Object.values(row.values)[0] || "translation";
      return {
        ...row,
        key: uniqueKey(keyMode === "semantic" ? semanticKey(text) : slugKey(text), existingKeys),
        sourceLanguage: sourceLanguageForRow
      };
    });

    setImportRows(generatedRows);
    setConflicts(buildImportConflicts(generatedRows));
  }

  const translateEntryWithAi = React.useCallback(async (entry: TranslationEntry) => {
    const sourceLanguageCode = entry.sourceLanguage || sourceLanguage;
    await translateProjectEntries(
      activeProject,
      [entry],
      sourceLanguageCode,
      getMissingTargetLanguages(activeProject, entry, sourceLanguageCode),
      selectedTagName
    );
  }, [activeProject, getMissingTargetLanguages, selectedTagName, sourceLanguage, translateProjectEntries]);

  const retranslateEntryFromEnglish = React.useCallback(async (entry: TranslationEntry) => {
    const englishText = entry.translations.en?.value.trim();
    if (!englishText) {
      setAiMessage("缺少英文源文。");
      return;
    }

    const targetLanguages = activeProject.languages.filter((language) => language.code !== "en").map((language) => language.code);
    await translateProjectEntries(activeProject, [entry], "en", targetLanguages, selectedTagName, {
      overwrite: true,
      busyMessage: "正在按英语重翻...",
      successMessage: "已按英语重翻，结果进入待审核。",
      emptyTargetsMessage: "没有可重翻语言。"
    });
  }, [activeProject, selectedTagName, translateProjectEntries]);

  async function translateImportPreview() {
    if (!importRows.length) return;
    const targetRequest = aiTargetLanguages.trim();
    let nextRows = importRows;
    const failures: string[] = [];
    let generatedCount = 0;

    setAiBusy(true);
    setAiMessage("正在 AI 补全导入预览...");
    try {
      const sourceLanguages = Array.from(
        new Set(
          importRows.map((row) => {
            const valueLanguages = Object.keys(row.values);
            return (row.sourceLanguage || (row.values.en ? "en" : valueLanguages[0] ?? sourceLanguage)).toLowerCase();
          })
        )
      );

      for (const sourceLanguageCode of sourceLanguages) {
        const targetLanguages = getTargetLanguages(activeProject, sourceLanguageCode, targetRequest);
        const rowsForSource = nextRows.filter((row) => {
          const valueLanguages = Object.keys(row.values);
          const rowSourceLanguage = (row.sourceLanguage || (row.values.en ? "en" : valueLanguages[0] ?? sourceLanguage)).toLowerCase();
          return rowSourceLanguage === sourceLanguageCode;
        });
        const missingTargetLanguages = targetLanguages.filter((languageCode) =>
          rowsForSource.some((row) => !row.values[languageCode]?.trim())
        );
        const items = rowsForSource
          .map((row) => ({
            key: row.key ?? "",
            text: row.values[sourceLanguageCode] || row.values.en || Object.values(row.values).find(Boolean) || ""
          }))
          .filter((item) => item.key && item.text);

        if (!items.length || !missingTargetLanguages.length) continue;

        const result = await requestAiTranslations(activeProject, sourceLanguageCode, missingTargetLanguages, items);
        if (result.failure) {
          failures.push(result.failure);
          continue;
        }
        nextRows = nextRows.map((row) => {
          if (!row.key) return row;
          const generatedForRow = result.translations[row.key];
          if (!generatedForRow) return row;
          return {
            ...row,
            values: {
              ...row.values,
              ...Object.fromEntries(
                missingTargetLanguages
                  .map((languageCode) => [languageCode, generatedForRow[languageCode]] as const)
                  .filter(([languageCode, value]) => {
                    if (row.values[languageCode]?.trim()) return false;
                    if (value) generatedCount += 1;
                    return Boolean(value);
                  })
              )
            }
          };
        });
      }

      setImportRows(nextRows);
      setConflicts(buildImportConflicts(nextRows));
      setAiMessage(
        generatedCount === 0
          ? failures.length
            ? `AI 服务调用失败：${Array.from(new Set(failures)).join("；")}。未写入预览译文。`
            : "没有可补全的导入内容，请确认导入行包含源文本和目标语言。"
          : failures.length
          ? `部分 AI 服务调用失败：${Array.from(new Set(failures)).join("；")}。已保留成功补全的预览译文。`
          : "AI 已补全导入预览，确认后可应用导入。"
      );
    } finally {
      setAiBusy(false);
    }
  }

  function setConflictAction(conflictId: string, action: ConflictAction) {
    setConflicts((current) => current.map((conflict) => (conflict.id === conflictId ? { ...conflict, action } : conflict)));
  }

  async function applyImport() {
    if (!importRows.length || !selectedTagName) return;
    setSaveState("saving");
    try {
      const conflictActions = Object.fromEntries(conflicts.map((conflict) => [conflict.key, conflict.action]));
      const tagNames = [selectedTagName];
      for (let start = 0; start < importRows.length; start += importChunkSize) {
        const rows = importRows.slice(start, start + importChunkSize);
        const response = await fetch(`/api/projects/${activeProject.id}/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows,
            conflictActions,
            keyGenerationMode: keyMode,
            tagNames
          })
        });
        if (!response.ok) throw new Error(await response.text());
      }

      const refreshed = await fetch("/api/projects", { cache: "no-store" });
      if (!refreshed.ok) throw new Error(await refreshed.text());
      const payload = (await refreshed.json()) as { projects: TranslationProject[] };
      setProjects(payload.projects);
      if (!payload.projects.some((project) => project.id === activeProject.id)) {
        setActiveProjectId(payload.projects[0]?.id ?? activeProject.id);
      }
      setImportRows([]);
      setConflicts([]);
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1600);
      setActiveTab("translations");
    } catch {
      setSaveState("error");
    }
  }

  function exportAllJson() {
    const sortedEntries = [...activeProject.entries].sort((left, right) => {
      if (left.key < right.key) return -1;
      if (left.key > right.key) return 1;
      return 0;
    });
    const files = activeProject.languages.map((language) => ({
      name: `${language.code}.json`,
      content: JSON.stringify(
        Object.fromEntries(sortedEntries.map((entry) => [entry.key, entry.translations[language.code]?.value ?? ""])),
        null,
        2
      )
    }));
    const filename = `${activeProject.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_locales.zip`;
    downloadFile(filename, createZipBlob(files), "application/zip");
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = activeProject.entries.map((entry) => {
      const base: Record<string, string> = {
        key: entry.key,
        sourceLanguage: entry.sourceLanguage
      };
      for (const language of activeProject.languages) {
        const translation = entry.translations[language.code] ?? emptyValue();
        base[language.code] = translation.value;
        base[`${language.code}_translated`] = translation.isTranslated ? "yes" : "no";
        base[`${language.code}_translatedAt`] = translation.translatedAt ?? "";
        base[`${language.code}_reviewed`] = translation.isReviewed ? "yes" : "no";
        base[`${language.code}_reviewedAt`] = translation.reviewedAt ?? "";
      }
      return base;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "translations");
    XLSX.writeFile(workbook, `${activeProject.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}_translations.xlsx`);
  }

  const columns = React.useMemo<ColumnDef<TranslationEntry>[]>(() => {
    const languageColumns: ColumnDef<TranslationEntry>[] = activeProject.languages.map((language) => ({
      id: language.code,
      header: language.code,
      cell: ({ row }) => {
        const entry = row.original;
        const translation = entry.translations[language.code] ?? emptyValue();
        return (
          <TranslationValueEditor
            entryId={entry.id}
            languageCode={language.code}
            translation={translation}
            onCommit={setTranslation}
          />
        );
      }
    }));

    return [
      {
        accessorKey: "key",
        header: "Key",
        cell: ({ row }) => (
          <div className="w-[190px] space-y-2">
            <div className="break-all font-mono text-sm font-medium leading-5">{row.original.key}</div>
            <div className="mt-1 text-xs text-zinc-500">source: {row.original.sourceLanguage}</div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void translateEntryWithAi(row.original)} disabled={aiBusy}>
                  <WandSparkles className="h-3.5 w-3.5" />
                  AI 补全
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDeleteEntryTarget(row.original)} title="删除翻译">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => void retranslateEntryFromEnglish(row.original)}
                disabled={aiBusy || !row.original.translations.en?.value.trim()}
                title="根据英语重新翻译"
              >
                <Languages className="h-3.5 w-3.5" />
                英译重翻
              </Button>
            </div>
          </div>
        )
      },
      ...languageColumns
    ];
  }, [activeProject.languages, aiBusy, retranslateEntryFromEnglish, setTranslation, translateEntryWithAi]);

  const table = useReactTable({
    data: paginatedEntries,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  const selectedReview = reviewItems.find((item) => item.entry.id === selectedReviewEntryId);
  const selectedReviewLanguage = selectedReview?.pendingLanguages.find((item) => item.language.code === activeReviewLanguage);

  if (!hasActiveProject) {
    return (
      <main className="min-h-screen bg-[#fbfbfa] p-6 text-zinc-950">
        <section className="mx-auto mt-16 max-w-xl rounded-lg border bg-white p-6 shadow-soft">
          <div className="mb-2 text-lg font-semibold">{isLoading ? "正在加载项目" : "暂无项目"}</div>
          <p className="text-sm text-zinc-500">
            {isLoading ? "正在从接口读取项目数据，请稍候。" : "当前没有可用项目，请创建一个新项目。"}
          </p>
          {!isLoading && (
            <div className="mt-4 flex gap-2">
              <Input value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} placeholder="新项目名称" />
              <Button onClick={() => void addProject()}>
                <Plus className="h-4 w-4" />
                创建
              </Button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbfbfa] text-zinc-950">
      <div className="flex min-h-screen">
        <aside className="hidden w-[292px] shrink-0 border-r bg-white/90 px-4 py-5 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-950 text-white">
              <Languages className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Trans</div>
              <div className="text-xs text-zinc-500">多语言维护后台</div>
            </div>
          </div>

          <div className="mb-3 flex gap-2">
            <Input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="新项目名称"
            />
            <Button size="icon" onClick={addProject} title="创建项目">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {projects.map((project) => {
              const itemStats = projectStats(project);
              const selected = project.id === activeProject.id;
              return (
                <button
                  key={project.id}
                  onClick={() => setActiveProjectId(project.id)}
                  className={cn(
                    "w-full rounded-md border px-3 py-3 text-left transition-colors",
                    selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </div>
                  <div className={cn("mt-2 text-xs", selected ? "text-zinc-300" : "text-zinc-500")}>
                    {itemStats.keys} keys · {itemStats.languageCount} languages
                  </div>
                  <Progress
                    value={itemStats.translatedRate}
                    className={cn("mt-3", selected && "bg-zinc-800")}
                    indicatorClassName={selected ? "bg-white" : "bg-zinc-950"}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b bg-[#fbfbfa]/90 px-5 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Workspace</span>
                  <ChevronRight className="h-3 w-3" />
                  <span>{activeProject.name}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-semibold tracking-normal">{activeProject.name}</h1>
                  {isLoading && <Badge variant="muted">数据库加载中</Badge>}
                  {saveState === "saving" && <Badge variant="pending">保存中</Badge>}
                  {saveState === "saved" && <Badge variant="translated">已保存到 Postgres</Badge>}
                  {saveState === "error" && <Badge variant="danger">保存失败</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select
                  className="w-[190px] lg:hidden"
                  value={activeProject.id}
                  onChange={(event) => setActiveProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </Select>
                <Button variant="outline" onClick={() => setActiveTab("import")}>
                  <Upload className="h-4 w-4" />
                  导入
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("export")}>
                  <Download className="h-4 w-4" />
                  导出
                </Button>
              </div>
            </div>
            <nav className="mt-5 flex gap-1 overflow-x-auto">
              {[
                ["dashboard", "看板"],
                ["translations", "翻译"],
                ["review", `未审核 ${reviewQueueItems.length}`],
                ["import", "导入"],
                ["export", "导出"],
                ["settings", "设置"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as Tab)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm transition-colors",
                    activeTab === key ? "bg-zinc-950 text-white" : "text-zinc-600 hover:bg-white hover:text-zinc-950"
                  )}
                >
                  {label}
                </button>
              ))}
            </nav>
          </header>

          <div className="p-5">
            {activeTab === "dashboard" && (
              <DashboardPanel project={activeProject} stats={stats} setActiveTab={setActiveTab} />
            )}

            {activeTab === "translations" && (
              <TranslationTab
                search={search}
                activeLanguage={activeLanguage}
                statusFilter={statusFilter}
                tagFilter={entryTagFilter}
                languages={activeProject.languages}
                tagOptions={tagOptions}
                onSearchChange={setSearch}
                onSearchSubmit={runEntrySearch}
                onActiveLanguageChange={setActiveLanguage}
                onStatusFilterChange={setStatusFilter}
                onTagFilterChange={setEntryTagFilter}
                onOpenAddDialog={() => setEntryDialogOpen(true)}
              >
                <section className="rounded-lg border bg-white p-4 shadow-soft">
                  {aiMessage && <p className="mb-4 text-sm text-zinc-500">{aiMessage}</p>}

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[1360px] table-fixed border-separate border-spacing-0 text-left">
                      <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <th
                                key={header.id}
                                className="border-b bg-zinc-50 px-3 py-3 text-xs font-medium uppercase text-zinc-500"
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      <tbody>
                        {table.getRowModel().rows.map((row) => (
                          <tr key={row.id} className="align-top">
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="border-b px-3 py-3 align-top">
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    className="mt-4"
                    page={entryPage}
                    pageCount={entryPageCount}
                    total={filteredEntries.length}
                    pageSize={entryPageSize}
                    onPageChange={setEntryPage}
                  />
                </section>
              </TranslationTab>
            )}

            {activeTab === "review" && (
              <ReviewTab
                project={activeProject}
                reviewItems={reviewItems}
                reviewQueueItems={reviewQueueItems}
                paginatedReviewItems={paginatedReviewItems}
                selectedReview={selectedReview}
                selectedReviewLanguage={selectedReviewLanguage}
                selectedReviewEntryId={selectedReviewEntryId}
                activeReviewLanguage={activeReviewLanguage}
                reviewDraft={reviewDraft}
                reviewSearch={reviewSearch}
                reviewLanguage={reviewLanguage}
                reviewTagName={reviewTagName}
                reviewSort={reviewSort}
                tagOptions={tagOptions}
                reviewPage={reviewPage}
                reviewPageCount={reviewPageCount}
                reviewPageSize={reviewPageSize}
                onReviewSearchChange={setReviewSearch}
                onReviewLanguageChange={setReviewLanguage}
                onReviewTagChange={setReviewTagName}
                onReviewSortChange={setReviewSort}
                onSelectReview={(item: ReviewItem) => {
                  setSelectedReviewEntryId(item.entry.id);
                  const nextLanguage = item.pendingLanguages[0];
                  setActiveReviewLanguage(nextLanguage.language.code);
                  setReviewDraft(nextLanguage.translation.value);
                }}
                onSelectReviewLanguage={(item) => {
                  setActiveReviewLanguage(item.language.code);
                  setReviewDraft(item.translation.value);
                }}
                onReviewDraftChange={setReviewDraft}
                onApprove={approveReview}
                onReject={rejectReview}
                onPageChange={setReviewPage}
              />
            )}

            {activeTab === "import" && (
              <ImportTab
                project={activeProject}
                activeLanguage={activeLanguage}
                importRows={importRows}
                conflicts={conflicts}
                paginatedImportRows={paginatedImportRows}
                paginatedConflicts={paginatedConflicts}
                selectedTagName={selectedTagName}
                tagOptions={tagOptions}
                tagDate={tagDate}
                aiTargetLanguages={aiTargetLanguages}
                aiBusy={aiBusy}
                aiMessage={aiMessage}
                importPage={importPage}
                importPageCount={importPageCount}
                importPageSize={importPageSize}
                conflictPage={conflictPage}
                conflictPageCount={conflictPageCount}
                conflictPageSize={conflictPageSize}
                onParseFile={(file) => void parseImportFile(file)}
                onSelectedTagChange={setSelectedTagName}
                onTagDateChange={setTagDate}
                onCreateDateTag={() => void createDateTag()}
                onAiTargetLanguagesChange={setAiTargetLanguages}
                onTranslateImportPreview={() => void translateImportPreview()}
                onSetConflictAction={setConflictAction}
                onImportPageChange={setImportPage}
                onConflictPageChange={setConflictPage}
                onApplyImport={() => void applyImport()}
              />
            )}

            {activeTab === "export" && <ExportTab onExportAllJson={exportAllJson} onExportExcel={() => void exportExcel()} />}

            {activeTab === "settings" && (
              <SettingsPanel
                project={activeProject}
                saveAiConfig={(aiConfig) => persistAiConfig(activeProject.id, aiConfig)}
                addLanguage={addLanguage}
                requestDeleteProject={() => setDeleteProjectRequested(true)}
              />
            )}
          </div>
        </section>
      </div>
      <AddTranslationDialog
        open={entryDialogOpen}
        languages={activeProject.languages}
        tagOptions={tagOptions}
        selectedTagName={selectedTagName}
        sourceLanguage={sourceLanguage}
        newEntryKey={newEntryKey}
        keyMode={keyMode}
        sourceText={sourceText}
        aiBusy={aiBusy}
        onClose={() => setEntryDialogOpen(false)}
        onSelectTag={setSelectedTagName}
        onCreateTag={(tagName) => void createDateTag(tagName)}
        onRenameTag={(tagName) => void renameDateTag(tagName)}
        onDeleteTag={() => setDeleteTagRequested(true)}
        onSourceLanguageChange={setSourceLanguage}
        onNewEntryKeyChange={setNewEntryKey}
        onKeyModeChange={setKeyMode}
        onSourceTextChange={setSourceText}
        onAdd={() => void addEntry()}
        onAddWithAi={() => void addEntry({ translate: true })}
      />
      <ConfirmDialog
        open={Boolean(deleteEntryTarget)}
        title="删除翻译"
        description={deleteEntryTarget ? `确认删除翻译条目 "${deleteEntryTarget.key}" 吗？这个操作只删除该翻译条目，不会删除项目或语言配置。` : ""}
        confirmLabel="删除"
        onCancel={() => setDeleteEntryTarget(null)}
        onConfirm={() => {
          if (deleteEntryTarget) void deleteEntry(deleteEntryTarget.id);
        }}
      />
      <ConfirmDialog
        open={deleteTagRequested}
        title="删除 Tag"
        description={selectedTagName ? `确认删除 Tag "${selectedTagName}" 吗？历史翻译内容会保留，只会移除这个 Tag 的关联。` : ""}
        confirmLabel="删除 Tag"
        onCancel={() => setDeleteTagRequested(false)}
        onConfirm={() => void deleteDateTag()}
      />
      <ConfirmDialog
        open={deleteProjectRequested}
        title="删除项目"
        description={`确认删除项目 "${activeProject.name}" 吗？项目内的语言、翻译条目、导入记录和 Tag 都会一起删除，此操作无法撤销。`}
        confirmLabel="删除项目"
        onCancel={() => setDeleteProjectRequested(false)}
        onConfirm={() => void deleteProject()}
      />
    </main>
  );
}

function DashboardPanel({
  project,
  stats,
  setActiveTab
}: {
  project: TranslationProject;
  stats: ReturnType<typeof projectStats>;
  setActiveTab: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Key 总数" value={stats.keys} />
        <Metric label="语言" value={stats.languageCount} />
        <Metric label="翻译完成" value={`${stats.translatedRate}%`} tone="success" />
        <Metric label="审核完成" value={`${stats.reviewedRate}%`} tone="info" />
      </div>
      <section className="rounded-lg border bg-white p-5 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">语言进度</h2>
            <p className="mt-1 text-sm text-zinc-500">按语言查看翻译和审核百分比。</p>
          </div>
          <Button variant="outline" onClick={() => setActiveTab("review")}>
            <ShieldCheck className="h-4 w-4" />
            处理未审核
          </Button>
        </div>
        <div className="grid gap-3">
          {project.languages.map((language) => {
            const item = languageStats(project, language.code);
            return (
              <div key={language.code} className="rounded-md border p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {language.name} <span className="font-mono text-sm text-zinc-500">{language.code}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      翻译 {item.translated}/{project.entries.length} · 审核 {item.reviewed}/{project.entries.length}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="translated">{item.translatedRate}% translated</Badge>
                    <Badge variant="reviewed">{item.reviewedRate}% reviewed</Badge>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Progress value={item.translatedRate} indicatorClassName="bg-emerald-600" />
                  <Progress value={item.reviewedRate} indicatorClassName="bg-sky-600" />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
