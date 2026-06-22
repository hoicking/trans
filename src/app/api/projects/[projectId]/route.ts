import { deleteProjectRecord, saveProject } from "@/lib/project-store";
import type { TranslationProject } from "@/lib/types";

export async function PUT(request: Request) {
  try {
    const project = (await request.json()) as TranslationProject;
    await saveProject(project);
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save project.";
    console.error("Failed to save project", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const deleted = await deleteProjectRecord(projectId);
    if (!deleted) {
      return Response.json({ error: "Project not found." }, { status: 404 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete project.";
    console.error("Failed to delete project", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
