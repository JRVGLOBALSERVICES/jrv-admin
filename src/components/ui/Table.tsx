import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function TableShell({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Table(props: React.TableHTMLAttributes<HTMLTableElement>) {
  const { className, ...rest } = props;
  return <table className={cn("w-full text-sm", className)} {...rest} />;
}

export function Th(props: React.ThHTMLAttributes<HTMLTableCellElement>) {
  const { className, ...rest } = props;
  return (
    <th className={cn("px-4 py-3 text-left font-semibold bg-black/5 whitespace-nowrap", className)} {...rest} />
  );
}

export function Td(props: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const { className, ...rest } = props;
  return (
    <td className={cn("px-4 py-3 border-t border-black/10 align-middle", className)} {...rest} />
  );
}
