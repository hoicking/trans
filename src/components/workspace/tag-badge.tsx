"use client";

import * as React from "react";
import { defaultTagColor, normalizeTagColor } from "@/lib/tags";
import { cn } from "@/lib/utils";

function hexToRgb(color: string) {
  const normalized = normalizeTagColor(color);
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16)
  };
}

export function tagBadgeStyle(color?: string): React.CSSProperties {
  const normalized = normalizeTagColor(color ?? defaultTagColor);
  const { r, g, b } = hexToRgb(normalized);
  return {
    borderColor: `rgba(${r}, ${g}, ${b}, 0.28)`,
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
    color: normalized
  };
}

export function TagBadge({
  name,
  color,
  className,
  children
}: {
  name: string;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", className)}
      style={tagBadgeStyle(color)}
    >
      <span className="truncate">{name}</span>
      {children}
    </span>
  );
}
