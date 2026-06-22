import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/)
});

const updateTagSchema = z.object({
  oldName: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  name: z.string().trim().regex(/^\d{4}\/\d{2}\/\d{2}$/)
});

async function listTagNames(projectId: string) {
  const tags = await prisma.tag.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
    select: { name: true }
  });

  return tags.map((tag) => tag.name);
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return Response.json({ tags: await listTagNames(projectId) });
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
      name: parsed.data.name
    },
    update: {}
  });

  return Response.json({ tags: await listTagNames(projectId) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const parsed = updateTagSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { oldName, name } = parsed.data;
  if (oldName === name) {
    return Response.json({ tags: await listTagNames(projectId) });
  }

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
    data: { name }
  });

  return Response.json({ tags: await listTagNames(projectId) });
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

  return Response.json({ tags: await listTagNames(projectId) });
}
