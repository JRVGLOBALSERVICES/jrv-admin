"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const ACTIONS = ["", "created", "updated_regenerated", "deleted"] as const;

type ActorOption = { email: string | null };
type AgreementOption = { id: string; plate_number: string | null; customer_name: string | null };

function buildUrl(path: string, params: Record<string, any>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v == null) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export default function AgreementLogsClient({
  initial,
  meta,
  options,
}: {
  initial: {
    q: string;
    action: string;
    agreement_id: string;
    actor_email: string;
    page: number;
    page_size: number;
  };
  meta: { total: number; totalPages: number };
  options: { actors: ActorOption[]; agreements: AgreementOption[] };
}) {
  const router = useRouter();
  const path = usePathname();

  const [q, setQ] = useState(initial.q);
  const [action, setAction] = useState(initial.action);
  const [agreementId, setAgreementId] = useState(initial.agreement_id);
  const [actorEmail, setActorEmail] = useState(initial.actor_email);
  const [pageSize, setPageSize] = useState(initial.page_size);

  const page = initial.page;
  const totalPages = meta.totalPages;

  const nextUrl = useMemo(
    () =>
      buildUrl(path, {
        q,
        action,
        agreement_id: agreementId,
        actor_email: actorEmail,
        page: Math.min(totalPages, page + 1),
        page_size: pageSize,
      }),
    [path, q, action, agreementId, actorEmail, page, totalPages, pageSize]
  );

  const prevUrl = useMemo(
    () =>
      buildUrl(path, {
        q,
        action,
        agreement_id: agreementId,
        actor_email: actorEmail,
        page: Math.max(1, page - 1),
        page_size: pageSize,
      }),
    [path, q, action, agreementId, actorEmail, page, pageSize]
  );

  const apply = () => {
    router.push(
      buildUrl(path, {
        q: q.trim(),
        action,
        agreement_id: agreementId.trim(),
        actor_email: actorEmail.trim(),
        page: 1,
        page_size: pageSize,
      })
    );
  };

  const clear = () => {
    setQ("");
    setAction("");
    setAgreementId("");
    setActorEmail("");
    router.push(buildUrl(path, { page: 1, page_size: 25 }));
  };

  const agreementsSorted = useMemo(() => {
    const list = (options.agreements ?? []).slice();
    list.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    return list;
  }, [options.agreements]);

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
          <button onClick={clear} className="rounded-lg border px-3 py-2 text-sm hover:bg-black/5" type="button">
            Clear
          </button>
          <button onClick={apply} className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-black/90" type="button">
            Apply
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <div className="text-xs opacity-60 mb-1">Search</div>
          <input className="w-full border rounded-lg px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="action / email / agreement id" />
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Action</div>
          <select className="w-full border rounded-lg px-3 py-2 bg-white" value={action} onChange={(e) => setAction(e.target.value)}>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a || "All"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Actor (Email)</div>
          <select className="w-full border rounded-lg px-3 py-2 bg-white" value={actorEmail} onChange={(e) => setActorEmail(e.target.value)}>
            <option value="">All</option>
            {(options.actors ?? []).map((a) => (
              <option key={a.email ?? ""} value={a.email ?? ""}>
                {a.email || "—"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Agreement</div>
          <select className="w-full border rounded-lg px-3 py-2 bg-white" value={agreementId} onChange={(e) => setAgreementId(e.target.value)}>
            <option value="">All</option>
            {agreementsSorted.map((a) => (
              <option key={a.id} value={a.id}>
                {(a.plate_number || "—") + " • " + (a.customer_name || "—")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs opacity-60 mb-1">Page size</div>
          <select className="w-full border rounded-lg px-3 py-2 bg-white" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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
