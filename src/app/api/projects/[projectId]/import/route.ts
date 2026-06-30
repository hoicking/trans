import { prisma } from "@/lib/prisma";
import { maxTagNameLength, normalizeTagName } from "@/lib/tags";
import { semanticKey, slugKey, uniqueKey } from "@/lib/utils";
import { z } from "zod";

const importRowSchema = z.object({
  key: z.string().optional(),
  sourceLanguage: z.string().optional(),
  values: z.record(z.string(), z.string())
});

const tagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .refine((value) => value.length > 0 && value.length <= maxTagNameLength, {
    message: `Tag name must be 1-${maxTagNameLength} characters.`
  });

const importSchema = z.object({
  rows: z.array(importRowSchema),
  conflictActions: z.record(z.string(), z.enum(["overwrite", "append", "keep"])).default({}),
  keyGenerationMode: z.enum(["semantic", "text"]).default("semantic"),
  tagNames: z.array(tagNameSchema).min(1)
});

const languageNames: Record<string, string> = {
  en: "English",
  zh: "中文",
  ro: "Romana",
  pl: "Polski",
  it: "Italiano"
};

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
  const parsed = importSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { rows, conflictActions, keyGenerationMode, tagNames } = parsed.data;
  const usableRows = rows.filter((row) => Object.keys(row.values).length);
  const now = new Date();
  const actor = await ensureActor();
  let imported = 0;
  let skipped = 0;
  const cleanTagNames = Array.from(new Set(tagNames));

  await prisma.$transaction(
    async (tx) => {
      const tags = new Map<string, string>();
      for (const tagName of cleanTagNames) {
        const tag = await tx.tag.upsert({
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
        });
        tags.set(tagName, tag.id);
      }

      const currentLanguages = await tx.projectLanguage.findMany({ where: { projectId } });
      const currentLanguageCodes = new Set(currentLanguages.map((language) => language.code));
      const importLanguageCodes = Array.from(
        new Set(usableRows.flatMap((row) => Object.keys(row.values).map((code) => code.toLowerCase())))
      );

      for (const code of importLanguageCodes) {
        if (!currentLanguageCodes.has(code)) {
          await tx.projectLanguage.create({
            data: {
              projectId,
              code,
              name: languageNames[code] ?? code.toUpperCase()
            }
          });
          currentLanguageCodes.add(code);
        }
      }

      const existingEntries = await tx.translationEntry.findMany({
        where: { projectId },
        select: {
          id: true,
          key: true,
          values: {
            select: {
              languageCode: true,
              value: true
            }
          }
        }
      });
      const entryByKey = new Map(
        existingEntries.map((entry) => [
          entry.key,
          {
            id: entry.id,
            key: entry.key,
            values: new Map(entry.values.map((value) => [value.languageCode, value.value]))
          }
        ])
      );
      const keySet = new Set(existingEntries.map((entry) => entry.key));

      for (const row of usableRows) {
        const sourceLanguage = row.sourceLanguage || (row.values.en ? "en" : Object.keys(row.values)[0] ?? "en");
        const sourceText = row.values[sourceLanguage] || row.values.en || Object.values(row.values)[0] || "";
        const requestedKey =
          row.key?.trim() || (keyGenerationMode === "semantic" ? semanticKey(sourceText) : slugKey(sourceText));
        const existing = entryByKey.get(requestedKey);
        const action = existing ? conflictActions[requestedKey] ?? "overwrite" : undefined;

        if (existing && action === "keep") {
          skipped += 1;
          continue;
        }

        const incomingValues = Object.entries(row.values).map(([languageCode, value]) => [
          languageCode.toLowerCase(),
          value.trim()
        ] as const);
        const valuesToWrite =
          existing && action === "overwrite"
            ? incomingValues.filter(([languageCode, value]) => existing.values.get(languageCode) !== value)
            : incomingValues;

        if (existing && action === "overwrite" && valuesToWrite.length === 0) {
          skipped += 1;
          continue;
        }

        const resolvedKey = existing && action === "append" ? uniqueKey(requestedKey, keySet) : requestedKey;
        keySet.add(resolvedKey);

        const entry =
          existing && action === "overwrite"
            ? await tx.translationEntry.update({
                where: { id: existing.id },
                data: {
                  sourceLanguage,
                  keyGenerationMode: keyGenerationMode === "semantic" ? "SEMANTIC" : "TEXT",
                  updatedAt: now
                }
              })
            : await tx.translationEntry.create({
                data: {
                  projectId,
                  key: resolvedKey,
                  sourceLanguage,
                  keyGenerationMode: keyGenerationMode === "semantic" ? "SEMANTIC" : "TEXT",
                  createdAt: now,
                  updatedAt: now
                }
              });

        for (const [languageCode, cleanValue] of valuesToWrite) {
          await tx.translationValue.upsert({
            where: {
              entryId_languageCode: {
                entryId: entry.id,
                languageCode
              }
            },
            create: {
              entryId: entry.id,
              languageCode,
              value: cleanValue,
              isTranslated: Boolean(cleanValue),
              translatedAt: cleanValue ? now : null,
              translatedById: cleanValue ? actor.id : null,
              isReviewed: false,
              reviewedAt: null,
              reviewedById: null
            },
            update: {
              value: cleanValue,
              isTranslated: Boolean(cleanValue),
              translatedAt: cleanValue ? now : null,
              translatedById: cleanValue ? actor.id : null,
              isReviewed: false,
              reviewedAt: null,
              reviewedById: null
            }
          });
        }
        const entryValues = await tx.translationValue.findMany({
          where: { entryId: entry.id },
          select: { id: true }
        });
        await tx.translationValueTag.createMany({
          data: entryValues.flatMap((value) =>
            Array.from(tags.values()).map((tagId) => ({ translationValueId: value.id, tagId }))
          ),
          skipDuplicates: true
        });
        const updatedValues = new Map(existing?.values ?? []);
        for (const [languageCode, value] of valuesToWrite) {
          updatedValues.set(languageCode, value);
        }
        entryByKey.set(resolvedKey, {
          id: entry.id,
          key: resolvedKey,
          values: updatedValues
        });
        if (resolvedKey === requestedKey) {
          entryByKey.set(requestedKey, {
            id: entry.id,
            key: requestedKey,
            values: updatedValues
          });
        }
        imported += 1;
      }

      await tx.translationProject.update({
        where: { id: projectId },
        data: { updatedAt: now }
      });
    },
    { timeout: 120_000 }
  );

  return Response.json({ ok: true, imported, skipped });
}
