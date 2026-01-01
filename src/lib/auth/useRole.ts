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
      // Ensure role and email match the API response structure
      setRole((json?.role as Role) ?? null);
      setStatus((json?.status as string | null) ?? null);
      setEmail((json?.email || json?.user?.email) ?? null);
    } catch {
      setRole(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return { role, status, email, loading, refresh: load };
}
