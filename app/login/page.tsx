"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Mascot } from "@/components/ui/Mascot";
import { Logo } from "@/components/ui/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push(searchParams.get("next") || "/");
      router.refresh();
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b-[1.5px] border-ink px-6 py-4">
        <Logo />
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="flex flex-col items-center max-w-sm w-full">
          <Mascot pose="hi" size={140} className="mb-4" />
          <p className="eyebrow mb-2">LemFi Candidate Intent</p>
          <h1 className="text-3xl font-bold text-center mb-6">
            Who&apos;s open to moving <span className="highlight-mark">right now</span>?
          </h1>

          <Card className="w-full p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <label htmlFor="password" className="text-sm font-medium">
                Team password
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="hard-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-lime"
                placeholder="••••••••"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading || password.length === 0}
                className="mt-2 hard-border hard-shadow-sm rounded-lg bg-lime px-4 py-2 font-bold disabled:opacity-50"
              >
                {loading ? "Checking…" : "Enter"}
              </button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
