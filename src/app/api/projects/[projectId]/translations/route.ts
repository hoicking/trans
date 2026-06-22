import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateTranslationSchema = z.object({
  entryId: z.string().min(1),
  languageCode: z.string().min(1),
  value: z.string(),
  isTranslated: z.boolean().optional(),
  isReviewed: z.boolean().optional(),
  refreshTranslatedMeta: z.boolean().optional(),
  actorName: z.string().min(1).default("Admin"),
  tagName: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/).optional()
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

  const { entryId, languageCode, value, isTranslated, isReviewed = false, refreshTranslatedMeta = false, actorName, tagName } = parsed.data;
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

  if (tagName) {
    const entry = await prisma.translationEntry.findUnique({
      where: { id: entryId },
      select: { projectId: true }
    });
    if (entry) {
      const tag = await prisma.tag.upsert({
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
      });
      await prisma.translationValueTag.upsert({
        where: {
          translationValueId_tagId: {
            translationValueId: translationValue.id,
            tagId: tag.id
          }
        },
        create: {
          translationValueId: translationValue.id,
          tagId: tag.id
        },
        update: {}
      });
    }
  }

  return Response.json({ ok: true });
}
