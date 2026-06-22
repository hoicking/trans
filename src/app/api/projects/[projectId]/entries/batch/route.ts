import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/project-store";
import { semanticKey, slugKey, uniqueKey } from "@/lib/utils";
import { z } from "zod";

const createBatchEntriesSchema = z.object({
  sourceLanguage: z.string().min(1).default("en"),
  sourceValues: z.array(z.string().trim().min(1)).min(1).max(200),
  keyGenerationMode: z.enum(["semantic", "text"]),
  tagName: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/)
});

function emptyTranslation(value: string, now: Date, actorId: string | null) {
  return {
    value,
    isTranslated: Boolean(value),
    translatedAt: value ? now : null,
    translatedById: value ? actorId : null,
    isReviewed: false,
    reviewedAt: null,
    reviewedById: null
  };
}

async function ensureActor() {
  return prisma.user.upsert({
    where: { email: "admin@local.trans" },
    create: {
      name: "Admin",
      email: "admin@local.trans",
      emailVerified: true
    },
    update: {
      name: "Admin"
    }
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = createBatchEntriesSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sourceLanguage, sourceValues, keyGenerationMode, tagName } = parsed.data;
  const actor = await ensureActor();
  const now = new Date();
  const entryIds = await prisma.$transaction(async (tx) => {
    const languages = await tx.projectLanguage.findMany({ where: { projectId } });
    const existingEntries = await tx.translationEntry.findMany({
      where: { projectId },
      select: { key: true }
    });
    const keySet = new Set(existingEntries.map((entry) => entry.key));
    const tag = await tx.tag.upsert({
      where: {
        projectId_name: {
          projectId,
          name: tagName.trim()
        }
      },
      create: {
        projectId,
        name: tagName.trim()
      },
      update: {}
    });
    const createdEntryIds: string[] = [];

    for (const sourceValue of sourceValues) {
      const baseKey = keyGenerationMode === "semantic" ? semanticKey(sourceValue) : slugKey(sourceValue);
      const key = uniqueKey(baseKey, keySet);
      keySet.add(key);
      const entry = await tx.translationEntry.create({
        data: {
          projectId,
          key,
          sourceLanguage,
          keyGenerationMode: keyGenerationMode === "semantic" ? "SEMANTIC" : "TEXT",
          values: {
            create: languages.map((language) => ({
              languageCode: language.code,
              ...emptyTranslation(language.code === sourceLanguage ? sourceValue : "", now, actor.id)
            }))
          }
        }
      });
      createdEntryIds.push(entry.id);

      const sourceValueRecord = await tx.translationValue.findUnique({
        where: {
          entryId_languageCode: {
            entryId: entry.id,
            languageCode: sourceLanguage
          }
        }
      });
      if (sourceValueRecord) {
        await tx.translationValueTag.upsert({
          where: {
            translationValueId_tagId: {
              translationValueId: sourceValueRecord.id,
              tagId: tag.id
            }
          },
          create: {
            translationValueId: sourceValueRecord.id,
            tagId: tag.id
          },
          update: {}
        });
      }
    }

    await tx.translationProject.update({
      where: { id: projectId },
      data: { updatedAt: now }
    });

    return createdEntryIds;
  });

  const project = (await listProjects()).find((item) => item.id === projectId);
  return Response.json({ project, entryIds }, { status: 201 });
}
