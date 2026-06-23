export type Role = "ADMIN" | "TRANSLATOR" | "REVIEWER";

export type KeyGenerationMode = "semantic" | "text";
export type AiProviderId = "chatgpt" | "deepseek";

export type Language = {
  code: string;
  name: string;
  isDefault?: boolean;
};

export type TranslationValue = {
  value: string;
  isTranslated: boolean;
  translatedAt?: string | null;
  translatedBy?: string | null;
  isReviewed: boolean;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  tagNames?: string[];
};

export type TranslationEntry = {
  id: string;
  key: string;
  sourceLanguage: string;
  keyGenerationMode: KeyGenerationMode;
  createdAt: string;
  updatedAt: string;
  tagNames?: string[];
  translations: Record<string, TranslationValue>;
};

export type AiConfig = {
  activeProvider: AiProviderId;
  translationVibe: string;
  providers: Record<
    AiProviderId,
    {
      providerName: string;
      baseUrl: string;
      model: string;
      apiKey: string;
    }
  >;
};

export type ProjectMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type TranslationProject = {
  id: string;
  name: string;
  description?: string;
  languages: Language[];
  entries: TranslationEntry[];
  members: ProjectMember[];
  aiConfig: AiConfig;
  tags?: string[];
  tagColors?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ImportRow = {
  key?: string;
  sourceLanguage?: string;
  values: Record<string, string>;
};

export type ConflictAction = "overwrite" | "append" | "keep";

export type ImportConflict = {
  id: string;
  key: string;
  incoming: ImportRow;
  action: ConflictAction;
};
