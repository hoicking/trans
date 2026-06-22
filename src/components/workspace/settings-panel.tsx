"use client";

import * as React from "react";
import { Bot, Check, Settings, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { defaultTranslationVibe } from "@/lib/ai-defaults";
import type { AiConfig, AiProviderId, TranslationProject } from "@/lib/types";

export function SettingsPanel({
  project,
  saveAiConfig,
  addLanguage,
  requestDeleteProject
}: {
  project: TranslationProject;
  saveAiConfig: (aiConfig: AiConfig) => Promise<void>;
  addLanguage: (code: string, name: string) => void;
  requestDeleteProject: () => void;
}) {
  const [languageCode, setLanguageCode] = React.useState("");
  const [languageName, setLanguageName] = React.useState("");
  const [draftAiConfig, setDraftAiConfig] = React.useState<AiConfig>(project.aiConfig);
  const providerOptions: Array<{ id: AiProviderId; label: string }> = [
    { id: "chatgpt", label: "ChatGPT" },
    { id: "deepseek", label: "DeepSeek" }
  ];

  React.useEffect(() => {
    setDraftAiConfig(project.aiConfig);
  }, [project.aiConfig, project.id]);

  function updateActiveProvider(providerId: AiProviderId) {
    setDraftAiConfig((current) => ({ ...current, activeProvider: providerId }));
  }

  function updateProvider(providerId: AiProviderId, field: "baseUrl" | "model" | "apiKey", value: string) {
    setDraftAiConfig((current) => ({
      ...current,
      providers: {
        ...current.providers,
        [providerId]: {
          ...current.providers[providerId],
          [field]: value
        }
      }
    }));
  }

  function updateTranslationVibe(value: string) {
    setDraftAiConfig((current) => ({ ...current, translationVibe: value }));
  }

  const aiConfigChanged = JSON.stringify(draftAiConfig) !== JSON.stringify(project.aiConfig);

  function maskedKeyLabel(apiKey: string) {
    if (!apiKey) return "未配置";
    return `已配置 ${apiKey.length} 位`;
  }

  function providerDescription(providerId: AiProviderId) {
    if (providerId === "chatgpt") return "OpenAI-compatible ChatGPT endpoint";
    return "DeepSeek OpenAI-compatible endpoint";
  }

  function providerPlaceholder(providerId: AiProviderId, field: "baseUrl" | "model") {
    if (providerId === "chatgpt") {
      return field === "baseUrl" ? "https://api.openai.com/v1" : "gpt-4o-mini";
    }
    return field === "baseUrl" ? "https://api.deepseek.com" : "deepseek-v4-flash";
  }

  function renderProviderConfig(provider: { id: AiProviderId; label: string }) {
    const config = draftAiConfig.providers[provider.id];
    const isActive = draftAiConfig.activeProvider === provider.id;
    return (
      <div key={provider.id} className="border-t pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">{provider.label}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{providerDescription(provider.id)}</div>
          </div>
          <Badge variant={isActive ? "reviewed" : "muted"}>{isActive ? "使用中" : "备用"}</Badge>
        </div>
        <div className="grid gap-3">
          <Input
            value={config.baseUrl}
            onChange={(event) => updateProvider(provider.id, "baseUrl", event.target.value)}
            placeholder={providerPlaceholder(provider.id, "baseUrl")}
          />
          <Input
            value={config.model}
            onChange={(event) => updateProvider(provider.id, "model", event.target.value)}
            placeholder={providerPlaceholder(provider.id, "model")}
          />
          <Input
            type="password"
            value={config.apiKey}
            onChange={(event) => updateProvider(provider.id, "apiKey", event.target.value)}
            placeholder={`${provider.label} API Key`}
          />
          <div className="text-xs text-zinc-500">{maskedKeyLabel(config.apiKey)}</div>
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <Settings className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">项目语言</h2>
        <div className="mt-4 flex gap-2">
          <Input value={languageCode} onChange={(event) => setLanguageCode(event.target.value)} placeholder="语言码，如 ja" />
          <Input value={languageName} onChange={(event) => setLanguageName(event.target.value)} placeholder="语言名称" />
          <Button
            onClick={() => {
              addLanguage(languageCode, languageName);
              setLanguageCode("");
              setLanguageName("");
            }}
          >
            添加
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.languages.map((language) => (
            <Badge key={language.code} variant={language.isDefault ? "reviewed" : "muted"}>
              {language.code} · {language.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-white p-5 shadow-soft">
        <Bot className="h-5 w-5" />
        <h2 className="mt-4 text-lg font-semibold">AI 配置</h2>
        <div className="mt-4 space-y-4">
          <label className="space-y-2 text-sm">
            当前使用
            <Select value={draftAiConfig.activeProvider} onChange={(event) => updateActiveProvider(event.target.value as AiProviderId)}>
              {providerOptions.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-2 text-sm">
            翻译风格
            <Textarea
              value={draftAiConfig.translationVibe}
              onChange={(event) => updateTranslationVibe(event.target.value)}
              placeholder={defaultTranslationVibe}
              className="min-h-[104px] resize-y leading-6"
            />
          </label>

          {providerOptions.map(renderProviderConfig)}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={() => void saveAiConfig(draftAiConfig)} disabled={!aiConfigChanged}>
              <Check className="h-4 w-4" />
              保存 AI 配置
            </Button>
            <Button variant="outline" onClick={() => setDraftAiConfig(project.aiConfig)} disabled={!aiConfigChanged}>
              取消修改
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-white p-5 shadow-soft xl:col-span-2">
        <Trash2 className="h-5 w-5 text-red-600" />
        <h2 className="mt-4 text-lg font-semibold">危险操作</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          删除当前项目及其语言、翻译条目、导入记录和 Tag。此操作无法撤销。
        </p>
        <div className="mt-4">
          <Button variant="destructive" onClick={requestDeleteProject}>
            <Trash2 className="h-4 w-4" />
            删除项目
          </Button>
        </div>
      </div>
    </section>
  );
}
