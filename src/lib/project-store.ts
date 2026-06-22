import { prisma } from "@/lib/prisma";
import { defaultLanguages, seedProjects } from "@/lib/seed";
import { defaultTranslationVibe } from "@/lib/ai-defaults";
import type { AiConfig, TranslationProject, TranslationEntry, TranslationValue } from "@/lib/types";

type ProjectWithRelations = Awaited<ReturnType<typeof getProjectRecords>>[number];

async function getProjectRecords() {
  return prisma.translationProject.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      languages: { orderBy: { createdAt: "asc" } },
      members: { orderBy: { createdAt: "asc" } },
      aiConfig: true,
      tags: { orderBy: { name: "asc" } },
      entries: {
        orderBy: { createdAt: "desc" },
        include: {
          values: {
            include: {
              translatedBy: true,
              reviewedBy: true,
              tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        }
      }
    }
  });
}

function toIso(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function defaultAiConfig(): AiConfig {
  return {
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
  };
}

function mapAiConfig(project: ProjectWithRelations): AiConfig {
  const defaults = defaultAiConfig();
  const aiConfig = project.aiConfig;
  if (!aiConfig) return defaults;

  const legacyLooksDeepSeek =
    aiConfig.providerName.toLowerCase().includes("deepseek") || aiConfig.baseUrl.toLowerCase().includes("deepseek");
  const activeProvider = aiConfig.activeProvider === "chatgpt" || aiConfig.activeProvider === "deepseek"
    ? aiConfig.activeProvider
    : legacyLooksDeepSeek
      ? "deepseek"
      : "chatgpt";

  return {
    activeProvider,
    translationVibe: aiConfig.translationVibe || defaults.translationVibe,
    providers: {
      chatgpt: {
        ...defaults.providers.chatgpt,
        model: aiConfig.chatgptModel || (!legacyLooksDeepSeek ? aiConfig.model : defaults.providers.chatgpt.model),
        apiKey: aiConfig.chatgptApiKey || (!legacyLooksDeepSeek ? aiConfig.encryptedApiKey : "")
      },
      deepseek: {
        ...defaults.providers.deepseek,
        model: aiConfig.deepseekModel || (legacyLooksDeepSeek ? aiConfig.model : defaults.providers.deepseek.model),
        apiKey: aiConfig.deepseekApiKey || (legacyLooksDeepSeek ? aiConfig.encryptedApiKey : "")
      }
    }
  };
}

function mapProject(project: ProjectWithRelations): TranslationProject {
  return {
    id: project.id,
    name: project.name,
    description: project.description ?? undefined,
    languages: project.languages.map((language) => ({
      code: language.code,
      name: language.name,
      isDefault: language.isDefault
    })),
    entries: project.entries.map((entry): TranslationEntry => {
      const translations = Object.fromEntries(
        entry.values.map((value): [string, TranslationValue] => [
          value.languageCode,
          {
            value: value.value,
            isTranslated: value.isTranslated,
            translatedAt: toIso(value.translatedAt),
            translatedBy: value.translatedBy?.name ?? null,
            isReviewed: value.isReviewed,
            reviewedAt: toIso(value.reviewedAt),
            reviewedBy: value.reviewedBy?.name ?? null,
            tagNames: value.tags.map((item) => item.tag.name)
          }
        ])
      );

      return {
        id: entry.id,
        key: entry.key,
        sourceLanguage: entry.sourceLanguage,
        keyGenerationMode: entry.keyGenerationMode === "SEMANTIC" ? "semantic" : "text",
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString(),
        translations
      };
    }),
    members: project.members.map((member) => ({
      id: member.id,
      name: member.userId,
      email: `${member.userId}@local`,
      role: member.role
    })),
    aiConfig: mapAiConfig(project),
    tags: project.tags.map((tag) => tag.name),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString()
  };
}

export async function listProjects() {
  if (process.env.NODE_ENV !== "production") {
    await ensureSeeded();
  }
  return (await getProjectRecords()).map(mapProject);
}

export async function ensureSeeded() {
  const count = await prisma.translationProject.count();
  if (count > 0) return;

  for (const project of seedProjects) {
    await saveProject(project);
  }
}

export async function saveProject(project: TranslationProject) {
  await prisma.$transaction(async (tx) => {
    await tx.translationProject.upsert({
      where: { id: project.id },
      create: {
        id: project.id,
        name: project.name,
        description: project.description,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt)
      },
      update: {
        name: project.name,
        description: project.description,
        updatedAt: new Date(project.updatedAt)
      }
    });

    const activeProviderConfig = project.aiConfig.providers[project.aiConfig.activeProvider];
    const chatgptConfig = project.aiConfig.providers.chatgpt;
    const deepseekConfig = project.aiConfig.providers.deepseek;
    await tx.projectAiConfig.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        providerName: activeProviderConfig.providerName,
        baseUrl: activeProviderConfig.baseUrl,
        model: activeProviderConfig.model,
        encryptedApiKey: activeProviderConfig.apiKey,
        activeProvider: project.aiConfig.activeProvider,
        translationVibe: project.aiConfig.translationVibe || defaultTranslationVibe,
        chatgptApiKey: chatgptConfig.apiKey,
        chatgptModel: chatgptConfig.model,
        deepseekApiKey: deepseekConfig.apiKey,
        deepseekModel: deepseekConfig.model
      },
      update: {
        providerName: activeProviderConfig.providerName,
        baseUrl: activeProviderConfig.baseUrl,
        model: activeProviderConfig.model,
        encryptedApiKey: activeProviderConfig.apiKey,
        activeProvider: project.aiConfig.activeProvider,
        translationVibe: project.aiConfig.translationVibe || defaultTranslationVibe,
        chatgptApiKey: chatgptConfig.apiKey,
        chatgptModel: chatgptConfig.model,
        deepseekApiKey: deepseekConfig.apiKey,
        deepseekModel: deepseekConfig.model
      }
    });

    await tx.projectLanguage.deleteMany({ where: { projectId: project.id } });
    await tx.projectLanguage.createMany({
      data: project.languages.map((language) => ({
        projectId: project.id,
        code: language.code,
        name: language.name,
        isDefault: Boolean(language.isDefault)
      }))
    });

    const existingEntries = await tx.translationEntry.findMany({
      where: { projectId: project.id },
      select: { id: true }
    });
    await tx.translationValue.deleteMany({
      where: { entryId: { in: existingEntries.map((entry) => entry.id) } }
    });
    await tx.translationEntry.deleteMany({ where: { projectId: project.id } });

    for (const entry of project.entries) {
      await tx.translationEntry.create({
        data: {
          id: entry.id,
          projectId: project.id,
          key: entry.key,
          sourceLanguage: entry.sourceLanguage,
          keyGenerationMode: entry.keyGenerationMode === "semantic" ? "SEMANTIC" : "TEXT",
          createdAt: new Date(entry.createdAt),
          updatedAt: new Date(entry.updatedAt),
          values: {
            create: project.languages.map((language) => {
              const value = entry.translations[language.code] ?? {
                value: "",
                isTranslated: false,
                translatedAt: null,
                translatedBy: null,
                isReviewed: false,
                reviewedAt: null,
                reviewedBy: null
              };
              return {
                languageCode: language.code,
                value: value.value,
                isTranslated: value.isTranslated,
                translatedAt: value.translatedAt ? new Date(value.translatedAt) : null,
                isReviewed: value.isReviewed,
                reviewedAt: value.reviewedAt ? new Date(value.reviewedAt) : null
              };
            })
          }
        }
      });
    }
  });
}

export async function deleteProjectRecord(projectId: string) {
  const result = await prisma.translationProject.deleteMany({
    where: { id: projectId }
  });

  return result.count > 0;
}

export async function createProjectRecord(name: string) {
  const now = new Date();
  const project = await prisma.translationProject.create({
    data: {
      name,
      description: "新的多语言项目",
      languages: {
        create: defaultLanguages.map((language) => ({
          code: language.code,
          name: language.name,
          isDefault: Boolean(language.isDefault)
        }))
      },
      aiConfig: {
        create: {
          providerName: "DeepSeek",
          baseUrl: "https://api.deepseek.com",
          model: "deepseek-v4-flash",
          encryptedApiKey: "",
          activeProvider: "deepseek",
          translationVibe: defaultTranslationVibe,
          chatgptApiKey: "",
          chatgptModel: "gpt-4o-mini",
          deepseekApiKey: "",
          deepseekModel: "deepseek-v4-flash"
        }
      },
      updatedAt: now
    }
  });

  await prisma.projectMember.create({
    data: {
      projectId: project.id,
      userId: "Admin",
      role: "ADMIN"
    }
  });

  return (await getProjectRecords()).map(mapProject).find((item) => item.id === project.id);
}
