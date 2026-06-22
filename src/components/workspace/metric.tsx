"use client";

import { cn } from "@/lib/utils";

export function Metric({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "info" | "danger";
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-soft">
      <div className="text-xs font-medium uppercase text-zinc-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-2xl font-semibold",
          tone === "success" && "text-emerald-700",
          tone === "info" && "text-sky-700",
          tone === "danger" && "text-red-700"
        )}
      >
        {value}
      </div>
    </div>
  );
}
