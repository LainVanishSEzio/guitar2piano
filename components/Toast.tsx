"use client";

import { CheckCircle2, XCircle, Info } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function Toast() {
  const toast = useStore((s) => s.toast);
  if (!toast) return null;
  const Icon = toast.kind === "ok" ? CheckCircle2 : toast.kind === "err" ? XCircle : Info;
  const color =
    toast.kind === "ok"
      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
      : toast.kind === "err"
        ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
        : "border-brand-500/40 bg-brand-500/15 text-brand-400";

  return (
    <div className="no-print pointer-events-none fixed bottom-[210px] left-1/2 z-50 -translate-x-1/2 md:bottom-[228px]">
      <div
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] shadow-2xl backdrop-blur ${color}`}
      >
        <Icon className="h-4 w-4" />
        {toast.msg}
      </div>
    </div>
  );
}
