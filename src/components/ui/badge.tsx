import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-950 text-white",
        translated: "border-emerald-200 bg-emerald-50 text-emerald-700",
        pending: "border-amber-200 bg-amber-50 text-amber-800",
        reviewed: "border-sky-200 bg-sky-50 text-sky-700",
        muted: "border-zinc-200 bg-zinc-50 text-zinc-600",
        danger: "border-red-200 bg-red-50 text-red-700"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
