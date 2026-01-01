"use client";

import { useEffect, useState } from "react";

type RoleState = {
  role: string | null;
  status: string | null;
  email: string | null;
  loading: boolean;
};

export function useRole(): RoleState {
  const [state, setState] = useState<RoleState>({
    role: null,
    status: null,
    email: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/admin/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          if (!cancelled) {
            setState({
              role: null,
              status: null,
              email: null,
              loading: false,
            });
          }
          return;
        }

        const data = await res.json();

        if (!cancelled) {
          setState({
            role: data?.role ?? null,
            status: data?.status ?? null,
            email: data?.user?.email ?? null,
            loading: false,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            role: null,
            status: null,
            email: null,
            loading: false,
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
