"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function Modal({ open, title, description, onClose, children, footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close modal" />

      <div className="relative mx-auto mt-10 sm:mt-20 w-[94%] max-w-xl">
        <div className={cn("rounded-2xl border border-black/10 bg-white shadow-lg")}>
          {(title || description) && (
            <div className="px-5 py-4 border-b border-black/10">
              {title ? <div className="text-lg font-semibold">{title}</div> : null}
              {description ? <div className="text-sm opacity-70 mt-1">{description}</div> : null}
            </div>
          )}

          <div className="px-5 py-4">{children}</div>

          <div className="px-5 py-4 border-t border-black/10 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
            {footer ?? (
              <>
                <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button className="w-full sm:w-auto">OK</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
