import { prisma } from "@/lib/prisma";
import { maxTagNameLength, normalizeTagName } from "@/lib/tags";
import { z } from "zod";

const tagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .refine((value) => value.length > 0 && value.length <= maxTagNameLength, {
    message: `Tag name must be 1-${maxTagNameLength} characters.`
  });

const updateTranslationSchema = z.object({
  entryId: z.string().min(1),
  languageCode: z.string().min(1),
  value: z.string(),
  isTranslated: z.boolean().optional(),
  isReviewed: z.boolean().optional(),
  refreshTranslatedMeta: z.boolean().optional(),
  actorName: z.string().min(1).default("Admin"),
  tagName: tagNameSchema.optional(),
  tagNames: z.array(tagNameSchema).optional()
});

async function ensureActor(actorName: string) {
  return prisma.user.upsert({
    where: { email: `${actorName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}@local.trans` },
    create: {
      name: actorName,
      email: `${actorName.toLowerCase().replace(/[^a-z0-9]+/g, "_")}@local.trans`,
      emailVerified: true
    },
    update: {
      name: actorName
    }
  });
}

export async function PATCH(request: Request) {
  const parsed = updateTranslationSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    entryId,
    languageCode,
    value,
    isTranslated,
    isReviewed = false,
    refreshTranslatedMeta = false,
    actorName
  } = parsed.data;
  const tagNames = Array.from(
    new Set([...(parsed.data.tagNames ?? []), parsed.data.tagName].filter((name): name is string => Boolean(name)))
  );
  const actor = await ensureActor(actorName);
  const now = new Date();
  const existing = await prisma.translationValue.findUnique({
    where: {
      entryId_languageCode: {
        entryId,
        languageCode
      }
    }
  });
  const nextIsTranslated = isReviewed ? true : isTranslated ?? existing?.isTranslated ?? Boolean(value);
  const nextTranslatedAt = nextIsTranslated ? (refreshTranslatedMeta ? now : existing?.translatedAt ?? now) : null;
  const nextTranslatedById = nextIsTranslated ? (refreshTranslatedMeta ? actor.id : existing?.translatedById ?? actor.id) : null;

  const translationValue = await prisma.translationValue.upsert({
    where: {
      entryId_languageCode: {
        entryId,
        languageCode
      }
    },
    create: {
      entryId,
      languageCode,
      value,
      isTranslated: nextIsTranslated,
      translatedAt: nextTranslatedAt,
      translatedById: nextTranslatedById,
      isReviewed,
      reviewedAt: isReviewed ? now : null,
      reviewedById: isReviewed ? actor.id : null
    },
    update: {
      value,
      isTranslated: nextIsTranslated,
      translatedAt: nextTranslatedAt,
      translatedById: nextTranslatedById,
      isReviewed,
      reviewedAt: isReviewed ? now : null,
      reviewedById: isReviewed ? actor.id : null
    }
  });

  await prisma.translationEntry.update({
    where: { id: entryId },
    data: { updatedAt: now }
  });

  if (tagNames.length) {
    const entry = await prisma.translationEntry.findUnique({
      where: { id: entryId },
      select: { projectId: true }
    });
    if (entry) {
      const tags = await Promise.all(
        tagNames.map((tagName) =>
          prisma.tag.upsert({
            where: {
              projectId_name: {
                projectId: entry.projectId,
                name: tagName
              }
            },
            create: {
              projectId: entry.projectId,
              name: tagName
            },
            update: {}
          })
        )
      );
      const values = await prisma.translationValue.findMany({
        where: { entryId },
        select: { id: true }
      });
      await prisma.translationValueTag.createMany({
        data: values
          .concat(values.some((value) => value.id === translationValue.id) ? [] : [{ id: translationValue.id }])
          .flatMap((value) => tags.map((tag) => ({ translationValueId: value.id, tagId: tag.id }))),
        skipDuplicates: true
      });
    }
  }

  return Response.json({ ok: true });
}
