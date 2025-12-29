"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    // ✅ autofill-safe
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };

    setLoading(false);

    if (!res.ok) {
      setErr(json?.error || "Login failed");
      return;
    }

    router.replace("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/logo.png"
              alt="JRV Admin"
              width={110}
              height={110}
              priority
            />
            <div className="text-xl font-semibold">Admin Login</div>
            <div className="text-sm opacity-70">Sign in to continue.</div>
          </div>

          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Email"
            name="email"
            type="email"
            autoComplete="email"
          />

          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Password"
            name="password"
            type="password"
            autoComplete="current-password"
          />

          {err ? <div className="text-sm text-red-600">{err}</div> : null}

          <Button sound="on" haptics="on"type="submit" loading={loading} className="w-full">
            Sign in
          </Button>

          <div className="text-xs text-center opacity-60">JRV Admin Panel</div>
        </form>
      </Card>
    </div>
  );
}
