"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import SplashScreen from "@/components/ui/SplashScreen";
import FooterSignature from "@/components/FooterSignature";

const ORANGE = "#F15828";
const PINK = "#FF3057";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // ✅ State to control splash screen visibility
  const [showSplash, setShowSplash] = useState(true);

  // We rely on the SplashScreen component's timer, but we also sync state here
  const handleSplashFinish = () => {
    setShowSplash(false);
  };

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const raw = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(raw);
    } catch {}

    if (!res.ok) {
      setLoading(false);
      setErr(json?.error || "Login failed");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    router.replace(returnTo?.startsWith("/admin") ? returnTo : "/admin");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-linear-to-br from-[#F15828] via-[#FF3057] to-slate-900">
      {/* ✅ Show Splash Screen if state is true */}
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}

      <Card className="w-full max-w-md p-8 space-y-6 backdrop-blur-xl bg-black/30 border border-white/20 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-500">
        {/* LOGO CENTERED */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="bg-white rounded-xl p-3 shadow-md">
            <Image
              src="/logo.png"
              alt="JRV Admin"
              width={90}
              height={90}
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-[#FF3057]">Admin Login</h1>
          <p className="text-sm text-black">Sign in to continue</p>
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
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-700 bg-slate-200 px-3 py-1 rounded-md hover:bg-slate-300"
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>

          {/* ERROR */}
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
            disabled={loading}
            loading={loading}
            className="w-full py-3 text-white font-semibold rounded-lg shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ background: `linear-gradient(90deg, ${ORANGE}, ${PINK})` }}
          >
            {loading ? "Redirecting..." : "Sign In"}
          </Button>

          {/* Footer */}
          <div className="text-xs text-center text-white/60 pt-2">
            © {new Date().getFullYear()} JRV Admin Panel
          </div>
        </form>
      </Card>

      {/* JRV Systems Footer */}
      <div className="w-full max-w-5xl mt-12">
        <FooterSignature
          companyName="JRV Admin"
          companyTagline="All Systems Operational"
          legalPages={[]}
          accentColor="#F15828"
          logoUrl="https://res.cloudinary.com/de3gn7o77/image/upload/v1769591082/logo.png"
        />
      </div>
    </div>
  );
}
