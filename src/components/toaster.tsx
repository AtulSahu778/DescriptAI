"use client";

import { useState, useEffect } from "react";

type Toast = {
  id: string;
  message: string;
  type?: "success" | "error";
};

let toastListeners: ((toast: Toast) => void)[] = [];

export function toast(message: string, type: "success" | "error" = "success") {
  const t: Toast = { id: Date.now().toString(), message, type };
  toastListeners.forEach((fn) => fn(t));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    toastListeners.push(listener);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== listener);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right-full transition-all ${t.type === "error"
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-white text-foreground border border-border"
            }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
