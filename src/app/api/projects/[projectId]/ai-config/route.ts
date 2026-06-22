import { prisma } from "@/lib/prisma";
import { defaultTranslationVibe } from "@/lib/ai-defaults";
import { z } from "zod";

const providerSchema = z.object({
  providerName: z.string().min(1),
  baseUrl: z.string().trim().url(),
  model: z.string().trim().min(1),
  apiKey: z.string()
});

const updateAiConfigSchema = z.object({
  aiConfig: z.object({
    activeProvider: z.enum(["chatgpt", "deepseek"]),
    translationVibe: z.string().trim().max(2000).default(defaultTranslationVibe),
    providers: z.object({
      chatgpt: providerSchema,
      deepseek: providerSchema
    })
  })
});

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = updateAiConfigSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { aiConfig } = parsed.data;
  const activeConfig = aiConfig.providers[aiConfig.activeProvider];
  const chatgptConfig = aiConfig.providers.chatgpt;
  const deepseekConfig = aiConfig.providers.deepseek;
  const translationVibe = aiConfig.translationVibe || defaultTranslationVibe;
  const now = new Date();

  await prisma.projectAiConfig.upsert({
    where: { projectId },
    create: {
      projectId,
      providerName: activeConfig.providerName,
      baseUrl: activeConfig.baseUrl,
      model: activeConfig.model,
      encryptedApiKey: activeConfig.apiKey,
      activeProvider: aiConfig.activeProvider,
      translationVibe,
      chatgptApiKey: chatgptConfig.apiKey,
      chatgptModel: chatgptConfig.model,
      deepseekApiKey: deepseekConfig.apiKey,
      deepseekModel: deepseekConfig.model
    },
    update: {
      providerName: activeConfig.providerName,
      baseUrl: activeConfig.baseUrl,
      model: activeConfig.model,
      encryptedApiKey: activeConfig.apiKey,
      activeProvider: aiConfig.activeProvider,
      translationVibe,
      chatgptApiKey: chatgptConfig.apiKey,
      chatgptModel: chatgptConfig.model,
      deepseekApiKey: deepseekConfig.apiKey,
      deepseekModel: deepseekConfig.model
    }
  });

  await prisma.translationProject.update({
    where: { id: projectId },
    data: { updatedAt: now }
  });

  return Response.json({ ok: true, updatedAt: now.toISOString() });
}
