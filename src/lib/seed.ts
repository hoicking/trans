import { makeId } from "@/lib/utils";
import { defaultTranslationVibe } from "@/lib/ai-defaults";
import type { Language, TranslationEntry, TranslationProject } from "@/lib/types";

export const defaultLanguages: Language[] = [
  { code: "en", name: "English", isDefault: true },
  { code: "zh", name: "中文" },
  { code: "ro", name: "Romana" },
  { code: "pl", name: "Polski" },
  { code: "it", name: "Italiano" }
];

const now = new Date().toISOString();

function value(value: string, translated = Boolean(value), reviewed = false) {
  return {
    value,
    isTranslated: translated,
    translatedAt: translated ? now : null,
    translatedBy: translated ? "Mira Translator" : null,
    isReviewed: reviewed,
    reviewedAt: reviewed ? now : null,
    reviewedBy: reviewed ? "Ada Reviewer" : null
  };
}

export const seedEntries: TranslationEntry[] = [
  {
    id: makeId("entry"),
    key: "mode_a",
    sourceLanguage: "en",
    keyGenerationMode: "text",
    createdAt: now,
    updatedAt: now,
    translations: {
      en: value("Mode A", true, true),
      zh: value("模式 A", true, true),
      ro: value("Mod A", true, false),
      pl: value("Tryb A", true, false),
      it: value("", false, false)
    }
  },
  {
    id: makeId("entry"),
    key: "save_changes",
    sourceLanguage: "en",
    keyGenerationMode: "semantic",
    createdAt: now,
    updatedAt: now,
    translations: {
      en: value("Save changes", true, true),
      zh: value("保存更改", true, false),
      ro: value("", false, false),
      pl: value("Zapisz zmiany", true, false),
      it: value("Salva modifiche", true, false)
    }
  },
  {
    id: makeId("entry"),
    key: "connection_lost",
    sourceLanguage: "en",
    keyGenerationMode: "semantic",
    createdAt: now,
    updatedAt: now,
    translations: {
      en: value("Connection lost. Try again.", true, true),
      zh: value("", false, false),
      ro: value("", false, false),
      pl: value("", false, false),
      it: value("", false, false)
    }
  }
];

export const seedProjects: TranslationProject[] = [
  {
    id: "project-core",
    name: "Core Product",
    description: "主应用的多语言文案库",
    languages: defaultLanguages,
    entries: seedEntries,
    members: [
      { id: "u_admin", name: "Admin", email: "admin@example.com", role: "ADMIN" },
      { id: "u_translator", name: "Mira Translator", email: "translator@example.com", role: "TRANSLATOR" },
      { id: "u_reviewer", name: "Ada Reviewer", email: "reviewer@example.com", role: "REVIEWER" }
    ],
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
  }
];
