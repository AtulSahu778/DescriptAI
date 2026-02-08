"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { toast } from "@/components/toaster";
import { motion } from "framer-motion";
import GradientMesh from "@/components/gradient-mesh";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/generate";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast(error.message, "error");
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-white relative overflow-hidden">
          <GradientMesh />

          <div className="relative z-10 min-h-[100dvh] flex items-center justify-center px-5 py-8 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="w-full max-w-[380px]"
            >
              <div className="text-center mb-6 sm:mb-8">
                <Link href="/" className="inline-flex items-center gap-2 mb-5 sm:mb-6">
                  <Image
                    src="/logo.png"
                    alt="DescriptAI Logo"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <span className="text-lg font-bold tracking-tight text-white">
                    DescriptAI
                  </span>
                </Link>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-1.5">
                  Welcome back
                </h1>
                <p className="text-white/40 text-sm">
                  Sign in to pick up where you left off.
                </p>
              </div>

              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 sm:p-6">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-medium text-white/70">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="input-base !py-3 !text-[16px] sm:!text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs font-medium text-white/70">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="input-base !py-3 !text-[16px] sm:!text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black font-semibold px-5 py-3 text-sm rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5 active:scale-[0.98]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : (
                        "Sign in"
                    )}
                  </button>
                </form>
              </div>

              <p className="text-center text-sm text-white/40 mt-5 sm:mt-6">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-white hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
