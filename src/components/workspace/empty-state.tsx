"use client";

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-zinc-500">{description}</div>
    </div>
  );
}
