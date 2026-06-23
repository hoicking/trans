import { prisma } from "@/lib/prisma";
import { listProjects } from "@/lib/project-store";
import { maxTagNameLength, normalizeTagName } from "@/lib/tags";
import { z } from "zod";

const tagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .refine((value) => value.length > 0 && value.length <= maxTagNameLength, {
    message: `Tag name must be 1-${maxTagNameLength} characters.`
  });

const updateEntryTagsSchema = z.object({
  tagNames: z.array(tagNameSchema).min(1)
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; entryId: string }> }
) {
  const { projectId, entryId } = await params;
  const parsed = updateEntryTagsSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tagNames = Array.from(new Set(parsed.data.tagNames));

  let notFound = false;
  await prisma.$transaction(async (tx) => {
    const entry = await tx.translationEntry.findFirst({
      where: {
        id: entryId,
        projectId
      },
      select: { id: true }
    });

    if (!entry) {
      notFound = true;
      return;
    }

    const values = await tx.translationValue.findMany({
      where: { entryId },
      select: { id: true }
    });
    const valueIds = values.map((value) => value.id);
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

    await tx.translationValueTag.deleteMany({
      where: {
        translationValueId: {
          in: valueIds
        }
      }
    });
    await tx.translationValueTag.createMany({
      data: values.flatMap((value) => tags.map((tag) => ({ translationValueId: value.id, tagId: tag.id }))),
      skipDuplicates: true
    });
    await tx.translationEntry.update({
      where: { id: entryId },
      data: { updatedAt: new Date() }
    });
    await tx.translationProject.update({
      where: { id: projectId },
      data: { updatedAt: new Date() }
    });
  });

  if (notFound) {
    return Response.json({ error: "Entry not found." }, { status: 404 });
  }

  const project = (await listProjects()).find((item) => item.id === projectId);
  return Response.json({ project });
}
