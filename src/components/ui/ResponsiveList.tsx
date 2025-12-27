import * as React from "react";
import { Card } from "@/components/ui/Card";

export function MobileCardList<T>({
  items,
  getKey,
  renderTitle,
  renderMeta,
  renderRight,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderTitle: (item: T) => React.ReactNode;
  renderMeta: (item: T) => React.ReactNode;
  renderRight?: (item: T) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={getKey(item)} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{renderTitle(item)}</div>
              <div className="mt-1 text-sm opacity-80">{renderMeta(item)}</div>
            </div>
            {renderRight ? <div className="shrink-0">{renderRight(item)}</div> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
