import { createProjectRecord, listProjects } from "@/lib/project-store";
import { z } from "zod";

const createProjectSchema = z.object({
  name: z.string().min(1)
});

export async function GET() {
  return Response.json({ projects: await listProjects() });
}

export async function POST(request: Request) {
  const parsed = createProjectSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await createProjectRecord(parsed.data.name);
  return Response.json({ project }, { status: 201 });
}
