"use client";
import { useEffect, useState } from "react";

export type Role = "superadmin" | "admin" | null;

export function useRole() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/admin/me", { credentials: "include" });
        const json = await res.json();
        if (!alive) return;
        setRole((json?.role as Role) ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  return { role, loading };
}
