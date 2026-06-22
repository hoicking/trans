import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/project-store";
import { semanticKey, slugKey, uniqueKey } from "@/lib/utils";
import { z } from "zod";

const createEntrySchema = z.object({
  key: z.string().optional(),
  sourceLanguage: z.string().min(1),
  sourceValue: z.string().min(1),
  keyGenerationMode: z.enum(["semantic", "text"]),
  tagName: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/)
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

  const { sourceLanguage, sourceValue, keyGenerationMode, tagName } = parsed.data;
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
  const tag = await prisma.tag.upsert({
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

  const entry = await prisma.translationEntry.create({
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
  const sourceValueRecord = await prisma.translationValue.findUnique({
    where: {
      entryId_languageCode: {
        entryId: entry.id,
        languageCode: sourceLanguage
      }
    }
  });
  if (sourceValueRecord) {
    await prisma.translationValueTag.upsert({
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
