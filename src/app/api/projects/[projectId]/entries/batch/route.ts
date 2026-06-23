import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/project-store";
import { maxTagNameLength, normalizeTagName } from "@/lib/tags";
import { semanticKey, slugKey, uniqueKey } from "@/lib/utils";
import { z } from "zod";

const tagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .refine((value) => value.length > 0 && value.length <= maxTagNameLength, {
    message: `Tag name must be 1-${maxTagNameLength} characters.`
  });

const createBatchEntriesSchema = z.object({
  sourceLanguage: z.string().min(1).default("en"),
  sourceValues: z.array(z.string().trim().min(1)).min(1).max(200),
  keyGenerationMode: z.enum(["semantic", "text"]),
  tagName: tagNameSchema.optional(),
  tagNames: z.array(tagNameSchema).optional()
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

  const { sourceLanguage, sourceValues, keyGenerationMode } = parsed.data;
  const tagNames = Array.from(
    new Set([...(parsed.data.tagNames ?? []), parsed.data.tagName].filter((name): name is string => Boolean(name)))
  );
  if (!tagNames.length) {
    return Response.json({ error: "At least one tag is required." }, { status: 400 });
  }

  const actor = await ensureActor();
  const now = new Date();
  const entryIds = await prisma.$transaction(async (tx) => {
    const languages = await tx.projectLanguage.findMany({ where: { projectId } });
    const existingEntries = await tx.translationEntry.findMany({
      where: { projectId },
      select: { key: true }
    });
    const keySet = new Set(existingEntries.map((entry) => entry.key));
    const tags = await Promise.all(
      tagNames.map((tagName) =>
        tx.tag.upsert({
          where: {
            projectId_name: {
              projectId,
              name: tagName
            }
          },
          create: {
            projectId,
            name: tagName
          },
          update: {}
        })
      )
    );
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

      const values = await tx.translationValue.findMany({
        where: { entryId: entry.id },
        select: { id: true }
      });
      await tx.translationValueTag.createMany({
        data: values.flatMap((value) => tags.map((tag) => ({ translationValueId: value.id, tagId: tag.id }))),
        skipDuplicates: true
      });
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
