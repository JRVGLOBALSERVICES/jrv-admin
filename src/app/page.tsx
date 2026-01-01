"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ORANGE = "#F15828";
const PINK = "#FF3057";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    if (!email || !password) {
      setLoading(false);
      setErr("Email and password required");
      return;
    }

    const res = await fetch("/admin/login/api", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const raw = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {}

    setLoading(false);

    if (!res.ok) {
      setErr(json?.error || "Login failed");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");

    // allow cookies to flush on mobile Safari
    await new Promise((r) => setTimeout(r, 150));

    router.replace(returnTo?.startsWith("/admin") ? returnTo : "/admin");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#F15828] via-[#FF3057] to-slate-900">
      <Card className="w-full max-w-md p-8 space-y-6 backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl shadow-2xl">
        {/* LOGO CENTERED */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="bg-white rounded-xl p-3 shadow-md">
            <Image src="/logo.png" alt="JRV Admin" width={90} height={90} />
          </div>
          <h1 className="text-2xl font-semibold text-[#FF3057]">Admin Login</h1>
          <p className="text-sm text-black/80">Sign in to continue</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* EMAIL */}
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 outline-none transition-all"
            style={{ border: `2px solid ${ORANGE}` }}
            onFocus={(e) => {
              e.currentTarget.style.border = `2px solid ${PINK}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.border = `2px solid ${ORANGE}`;
            }}
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-lg bg-white text-slate-900 outline-none transition-all pr-14"
              style={{ border: `2px solid ${ORANGE}` }}
              onFocus={(e) => {
                e.currentTarget.style.border = `2px solid ${PINK}`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = `2px solid ${ORANGE}`;
              }}
            />

            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-700 bg-slate-200 px-3 py-1 rounded-md hover:bg-slate-300"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* ERROR (BLACK TEXT AS REQUESTED) */}
          {err && (
            <div className="text-sm text-black bg-white rounded-md px-3 py-2 border border-black/10">
              {err}
            </div>
          )}

          {info && (
            <div className="text-sm text-black bg-white rounded-md px-3 py-2 border border-black/10">
              {info}
            </div>
          )}

          {/* SUBMIT */}
          <Button
            type="submit"
            loading={loading}
            className="w-full py-3 text-white font-semibold rounded-lg shadow-lg"
            style={{ background: `linear-gradient(90deg, ${ORANGE}, ${PINK})` }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {/* Footer */}
          <div className="text-xs text-center text-[#F15828] pt-2">
            © {new Date().getFullYear()} JRV Admin Panel
          </div>
        </form>
      </Card>
    </div>
  );
}
