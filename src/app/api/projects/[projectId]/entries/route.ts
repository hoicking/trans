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

const createEntrySchema = z.object({
  key: z.string().optional(),
  sourceLanguage: z.string().min(1),
  sourceValue: z.string().min(1),
  keyGenerationMode: z.enum(["semantic", "text"]),
  tagName: tagNameSchema.optional(),
  tagNames: z.array(tagNameSchema).optional()
});

const deleteEntrySchema = z.object({
  entryId: z.string().min(1)
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
  const parsed = createEntrySchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sourceLanguage, sourceValue, keyGenerationMode } = parsed.data;
  const tagNames = Array.from(
    new Set([...(parsed.data.tagNames ?? []), parsed.data.tagName].filter((name): name is string => Boolean(name)))
  );
  if (!tagNames.length) {
    return Response.json({ error: "At least one tag is required." }, { status: 400 });
  }

  const languages = await prisma.projectLanguage.findMany({ where: { projectId } });
  const existingEntries = await prisma.translationEntry.findMany({
    where: { projectId },
    select: { key: true }
  });
  const existingKeys = existingEntries.map((entry) => entry.key);
  const baseKey =
    parsed.data.key?.trim() ||
    (keyGenerationMode === "semantic" ? semanticKey(sourceValue) : slugKey(sourceValue));
  const key = uniqueKey(baseKey, existingKeys);
  const now = new Date();
  const actor = await ensureActor();
  const entry = await prisma.$transaction(async (tx) => {
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

    const createdEntry = await tx.translationEntry.create({
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
    const values = await tx.translationValue.findMany({
      where: { entryId: createdEntry.id },
      select: { id: true }
    });
    await tx.translationValueTag.createMany({
      data: values.flatMap((value) => tags.map((tag) => ({ translationValueId: value.id, tagId: tag.id }))),
      skipDuplicates: true
    });
    await tx.translationProject.update({
      where: { id: projectId },
      data: { updatedAt: now }
    });
    return createdEntry;
  });

  const project = (await listProjects()).find((item) => item.id === projectId);
  return Response.json({ project, entryId: entry.id }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = deleteEntrySchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.translationEntry.deleteMany({
    where: {
      id: parsed.data.entryId,
      projectId
    }
  });

  await prisma.translationProject.update({
    where: { id: projectId },
    data: { updatedAt: new Date() }
  });

  const project = (await listProjects()).find((item) => item.id === projectId);
  return Response.json({ project });
}
