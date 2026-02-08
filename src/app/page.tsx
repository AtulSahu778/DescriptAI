"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { parseGenerateStream } from "@/lib/stream-parser";
import { motion } from "framer-motion";
import GradientMesh from "@/components/gradient-mesh";

const typewriterTexts = [
  "Organic Cotton T-Shirt — 3 variants in seconds...",
  "Bluetooth Noise-Cancelling Headphones...",
  "Handcrafted Leather Weekender Bag...",
];

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [placeholder, setPlaceholder] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{
    seo: string;
    emotional: string;
    short: string;
  } | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<string>("seo");
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/generate");
      } else {
        setLoading(false);
        const generated = localStorage.getItem('hasGeneratedOnce');
        if (generated === 'true') {
          setHasGenerated(true);
        }
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentText = typewriterTexts[textIndex];

      if (isDeleting) {
        setPlaceholder(currentText.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholder(currentText.substring(0, charIndex + 1));
        charIndex++;
      }

      let typeSpeed = isDeleting ? 30 : 60;

      if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typewriterTexts.length;
        typeSpeed = 500;
      }

      timeout = setTimeout(type, typeSpeed);
    };

    timeout = setTimeout(type, 1000);
    return () => clearTimeout(timeout);
  }, []);

  const handleGenerate = async () => {
    if (!inputValue.trim()) return;

    if (hasGenerated) {
      router.push('/signup');
      return;
    }

    setGenerating(true);
    setResults(null);
    setError(null);

    try {
      const res = await fetch("/api/generate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: inputValue,
          category: "",
          features: "",
          audience: "",
          tone: tone
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(data.error || "Generation failed");
      }

      const data = await parseGenerateStream(res);
      setResults(data);
      setHasGenerated(true);
      localStorage.setItem('hasGeneratedOnce', 'true');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
      console.error('Generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white relative overflow-hidden">
      <GradientMesh />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/[0.06]">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-5">
            <Link href="/" className="flex items-center gap-2.5 text-lg sm:text-xl font-semibold tracking-tight text-white">
              <Image
                src="/logo.png"
                alt="DescriptAI"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="tracking-tight">DescriptAI</span>
            </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white/50 hover:text-white transition-colors duration-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-3 sm:px-5 py-1.5 sm:py-2.5 text-xs sm:text-sm font-medium bg-white text-[#0A0A0A] rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/5"
            >
                  Get started free
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto text-center w-full">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[7rem] font-extrabold tracking-tighter leading-[0.9] mb-6 sm:mb-8"
            style={{ letterSpacing: '-0.04em' }}
          >
            <span className="text-white">Product copy</span>
              <br />
              <span className="text-white">that sells itself.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="text-base sm:text-lg md:text-xl text-white/50 font-normal max-w-2xl mx-auto mb-12 sm:mb-16 leading-[1.6] px-4"
            >
              Turn 10 hours of product copywriting into 10 seconds of AI magic. Paste your product, get three SEO-ready descriptions instantly.
          </motion.p>

          {/* Glass-effect Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-2xl mx-auto px-4 sm:px-0"
          >
            <div className="relative group">
              <div
                className="absolute -inset-[1px] rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 100%)',
                  filter: 'blur(20px)',
                }}
              />

              <div className="relative rounded-[18px] overflow-hidden bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/50">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-white placeholder-white/20 resize-none px-4 sm:px-6 py-4 sm:py-5 min-h-[100px] sm:min-h-[120px] focus:outline-none text-sm sm:text-base"
                  style={{
                    fontFamily: '"SF Mono", "Fira Code", "Fira Mono", Menlo, Monaco, monospace',
                    caretColor: '#6366F1',
                  }}
                  rows={3}
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-white/5">
                  <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0">
                    {([
                      { value: "seo", label: "SEO" },
                      { value: "storytelling", label: "Story" },
                      { value: "technical", label: "Technical" },
                    ] as const).map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap ${tone === t.value
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'text-white/40 bg-white/5 hover:bg-white/10 hover:text-white/70 border border-transparent'
                          }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerate}
                    className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 ${inputValue.trim() && !generating
                      ? 'bg-white text-[#0A0A0A] hover:bg-white/90 shadow-lg shadow-white/10 active:scale-[0.98]'
                      : 'bg-white/10 text-white/25 cursor-not-allowed'
                      }`}
                    disabled={!inputValue.trim() || generating}
                  >
                    {generating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Writing your copy...</span>
                      </>
                    ) : hasGenerated ? (
                        <span>Sign up to keep generating</span>
                    ) : (
                      <>
                        <span>Generate free sample</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 px-4 sm:px-0"
            >
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            </motion.div>
          )}

          {/* Results Section */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className="mt-8 sm:mt-12 space-y-3 sm:space-y-4 px-4 sm:px-0"
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                      Here&apos;s your copy — ready to publish
                    </h2>
              </div>

              <div className="stagger-children">
                {([
                  { key: "seo" as const, label: "SEO-Optimized", icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" },
                  { key: "emotional" as const, label: "Emotionally Compelling", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
                  { key: "short" as const, label: "Short-Form", icon: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" },
                ]).map(({ key, label, icon }) => (
                  <div key={key} className="glass-card p-4 sm:p-6 text-left">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-white/90">{label}</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(results[key], key)}
                        className="text-xs font-medium text-white/40 hover:text-white flex items-center gap-1 transition-colors duration-150 px-2 py-1 rounded-md hover:bg-white/5"
                      >
                        <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                          <span className="hidden sm:inline">{copiedKey === key ? 'Copied!' : 'Copy to Clipboard'}</span>
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
                      {results[key]}
                    </p>
                  </div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-6 sm:mt-8 p-4 sm:p-6 glass-card text-center"
              >
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Like what you see?
                  </h3>
                    <p className="text-xs sm:text-sm text-white/40 mb-4">
                      Create a free account and get 500 credits — enough to write descriptions for your entire catalog.
                    </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-white text-black text-sm sm:text-base font-semibold rounded-full hover:bg-white/90 transition-all duration-200 shadow-lg shadow-white/10 active:scale-[0.98]"
                >
                  Create free account
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </motion.div>
            </motion.div>
          )}

          {/* Trust indicators */}
          {!results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-white/25 text-xs sm:text-sm px-4"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                    No credit card required
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    3 description styles per product
                  </span>
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Bulk CSV upload supported
                </span>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
