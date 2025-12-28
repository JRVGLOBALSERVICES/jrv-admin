"use client";

import { useEffect, useState } from "react";

export type Role = "superadmin" | "admin" | null;

export function useRole() {
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch("/admin/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "cache-control": "no-store" },
      });

      const json = await res.json();
      setRole((json?.role as Role) ?? null);
      setStatus((json?.status as string | null) ?? null);
      setEmail((json?.user?.email as string | null) ?? null);
    } catch {
      setRole(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;

    const run = async () => {
      await load();
      if (!alive) return;
    };

    run();

    // refresh when tab refocuses (prevents “role null again”)
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { role, status, email, loading, refresh: load };
}
