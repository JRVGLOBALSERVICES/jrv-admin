"use client";

type CarRow = {
  id: string;
  plate_number: string | null;
  location: string | null;
  make?: string | null;
  model?: string | null;
  frees_at?: string | null;
};

function fmt(dt?: string | null) {
  if (!dt) return "";
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  return d.toLocaleString("en-MY", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AvailableTomorrow({
  title,
  rows,
}: {
  title: string;
  rows: CarRow[];
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b flex items-center justify-between bg-blue-50">
        <div>
          <div className="font-bold text-blue-900">{title}</div>
          <div className="text-xs text-blue-700 opacity-80">
            Cars that end tomorrow
          </div>
        </div>
        <span className="text-xs text-blue-800 font-semibold">
          {rows.length}
        </span>
      </div>

      {!rows.length ? (
        <div className="p-6 text-sm opacity-60 text-center">No cars.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {rows.slice(0, 8).map((c) => (
            <div key={c.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-bold text-gray-900">{c.plate_number}</div>
                <div className="text-xs text-gray-500">
                  {(c.make || "").trim()} {(c.model || "").trim()}
                  {c.location ? ` • ${c.location}` : ""}
                </div>
                {c.frees_at ? (
                  <div className="text-xs text-blue-700 mt-1">
                    Ends: <span className="font-semibold">{fmt(c.frees_at)}</span>
                  </div>
                ) : null}
              </div>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded">
                tomorrow
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
