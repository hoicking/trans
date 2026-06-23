import { prisma } from "@/lib/prisma";
import { maxTagNameLength, normalizeTagColor, normalizeTagName } from "@/lib/tags";
import { z } from "zod";

const tagNameSchema = z
  .string()
  .transform(normalizeTagName)
  .refine((value) => value.length > 0 && value.length <= maxTagNameLength, {
    message: `Tag name must be 1-${maxTagNameLength} characters.`
  });

const tagSchema = z.object({
  name: tagNameSchema,
  color: z.string().optional().transform(normalizeTagColor)
});

const updateTagSchema = z.object({
  oldName: tagNameSchema,
  name: tagNameSchema,
  color: z.string().optional().transform((value) => (value ? normalizeTagColor(value) : undefined))
});

async function listTagPayload(projectId: string) {
  const tags = await prisma.tag.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
    select: { name: true, color: true }
  });

  return {
    tags: tags.map((tag) => tag.name),
    tagColors: Object.fromEntries(tags.map((tag) => [tag.name, normalizeTagColor(tag.color)]))
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return Response.json(await listTagPayload(projectId));
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = tagSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.tag.upsert({
    where: {
      projectId_name: {
        projectId,
        name: parsed.data.name
      }
    },
    create: {
      projectId,
      name: parsed.data.name,
      color: parsed.data.color
    },
    update: {
      color: parsed.data.color
    }
  });

  return Response.json(await listTagPayload(projectId));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = updateTagSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { oldName, name, color } = parsed.data;
  if (oldName !== name) {
    const existing = await prisma.tag.findUnique({
      where: {
        projectId_name: {
          projectId,
          name
        }
      },
      select: { id: true }
    });

    if (existing) {
      return Response.json({ error: "Tag already exists." }, { status: 409 });
    }
  }

  const tag = await prisma.tag.findUnique({
    where: {
      projectId_name: {
        projectId,
        name: oldName
      }
    },
    select: { id: true }
  });

  if (!tag) {
    return Response.json({ error: "Tag not found." }, { status: 404 });
  }

  await prisma.tag.update({
    where: { id: tag.id },
    data: {
      name,
      ...(color ? { color } : {})
    }
  });

  return Response.json(await listTagPayload(projectId));
}

export async function DELETE(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = tagSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.tag.deleteMany({
    where: {
      projectId,
      name: parsed.data.name
    }
  });

  return Response.json(await listTagPayload(projectId));
}
