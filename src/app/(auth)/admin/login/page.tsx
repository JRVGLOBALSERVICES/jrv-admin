"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const res = await fetch("/admin/login/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);

    if (!res.ok) return setErr(json.error || "Login failed");

    router.replace("/admin");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <div>
          <div className="text-xl font-semibold">Admin Login</div>
          <div className="text-sm opacity-70">Sign in to continue.</div>
        </div>

        <input className="w-full border rounded-lg px-3 py-2" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded-lg px-3 py-2" placeholder="Password" type="password"
          value={password} onChange={(e) => setPassword(e.target.value)} />

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <button disabled={loading} className="w-full rounded-lg bg-black text-white py-2 disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
