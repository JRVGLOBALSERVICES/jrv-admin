import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-black/10 bg-white shadow-sm", className)}
      {...props}
    />
  );
}
