import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  value = 0,
  className,
  indicatorClassName
}: {
  value?: number;
  className?: string;
  indicatorClassName?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-zinc-100", className)}>
      <div
        className={cn("h-full rounded-full bg-zinc-950 transition-all", indicatorClassName)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
