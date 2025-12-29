"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ACTIONS = ["", "create_post", "update_post", "delete_post"] as const;

type ActorOption = { email: string | null };

function buildUrl(path: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v == null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function MarketingTrackerClient({
  initial = {
    q: "",
    action: "",
    actor_email: "",
    page: 1,
    page_size: 25,
  },
  meta = { total: 0, totalPages: 1 },
  options = { actors: [] },
}: {
  initial?: {
    q: string;
    action: string;
    actor_email: string;
    page: number;
    page_size: number;
  };
  meta?: { total: number; totalPages: number };
  options?: { actors: ActorOption[] };
}) {
  const router = useRouter();
  const path = usePathname();

  // ✅ Safe access to initial props
  const [q, setQ] = useState(initial.q ?? "");
  const [action, setAction] = useState(initial.action ?? "");
  const [actorEmail, setActorEmail] = useState(initial.actor_email ?? "");
  const [pageSize, setPageSize] = useState(initial.page_size ?? 25);

  const page = initial.page ?? 1;
  const totalPages = meta.totalPages ?? 1;

  const nextUrl = useMemo(
    () =>
      buildUrl(path, {
        q,
        action,
        actor_email: actorEmail,
        page: Math.min(totalPages, page + 1),
        page_size: pageSize,
      }),
    [path, q, action, actorEmail, page, totalPages, pageSize]
  );

  const prevUrl = useMemo(
    () =>
      buildUrl(path, {
        q,
        action,
        actor_email: actorEmail,
        page: Math.max(1, page - 1),
        page_size: pageSize,
      }),
    [path, q, action, actorEmail, page, pageSize]
  );

  const apply = () => {
    router.push(
      buildUrl(path, {
        q: q.trim(),
        action,
        actor_email: actorEmail.trim(),
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const clear = () => {
    setQ("");
    setAction("");
    setActorEmail("");
    router.push(buildUrl(path, { page: 1, page_size: 25 }));
  };

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-medium">Filters</div>
          <div className="text-xs opacity-70">
            Total: {meta.total} • Page {page} / {totalPages}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clear}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5"
            type="button"
          >
            Clear
          </button>
          <button
            onClick={apply}
            className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-black/90"
            type="button"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1">
          <div className="text-xs opacity-60 mb-1">Search Details</div>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search JSON details..."
          />
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Action</div>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          >
            <option value="">All</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || "All"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Actor (Email)</div>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
          >
            <option value="">All</option>
            {(options.actors ?? []).map((a) => (
              <option key={a.email ?? ""} value={a.email ?? ""}>
                {a.email || "—"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Page size</div>
          <select
            className="w-full border rounded-lg px-3 py-2 bg-white"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => router.push(prevUrl)}
          disabled={page <= 1}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50 hover:bg-black/5"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={() => router.push(nextUrl)}
          disabled={page >= totalPages}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50 hover:bg-black/5"
        >
          Next
        </button>
      </div>
    </div>
  );
}
