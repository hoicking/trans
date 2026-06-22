import { prisma } from "@/lib/prisma";
import { createZipBlob } from "@/lib/zip";

function safeFilename(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase() || "translations";
}

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.translationProject.findUnique({
    where: { id: projectId },
    include: {
      languages: { orderBy: { createdAt: "asc" } },
      entries: {
        include: {
          values: true
        }
      }
    }
  });

  if (!project) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const sortedEntries = [...project.entries].sort((left, right) => {
    if (left.key < right.key) return -1;
    if (left.key > right.key) return 1;
    return 0;
  });
  const files = project.languages.map((language) => ({
    name: `${language.code}.json`,
    content: JSON.stringify(
      Object.fromEntries(
        sortedEntries.map((entry) => [
          entry.key,
          entry.values.find((value) => value.languageCode === language.code)?.value ?? ""
        ])
      ),
      null,
      2
    )
  }));
  const zip = await createZipBlob(files);
  const filename = `${safeFilename(project.name)}_locales.zip`;

  return new Response(zip, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.size),
      "Content-Type": "application/zip",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
