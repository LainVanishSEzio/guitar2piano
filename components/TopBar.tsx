"use client";

import { useState } from "react";
import { Piano, Download, FileMusic, FileCode, Image as ImageIcon, Printer, Copy, ChevronDown } from "lucide-react";
import { useStore } from "@/store/useStore";

interface Props {
  onExportMidi: () => void;
  onExportXml: () => void;
  onExportPng: () => void;
  onPrint: () => void;
  onCopy: () => void;
  disabled?: boolean;
}

export default function TopBar({
  onExportMidi,
  onExportXml,
  onExportPng,
  onPrint,
  onCopy,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const song = useStore((s) => s.song);

  const items = [
    { icon: FileMusic, label: "MIDI (.mid)", onClick: onExportMidi },
    { icon: FileCode, label: "MusicXML (.musicxml)", onClick: onExportXml },
    { icon: ImageIcon, label: "五线谱 PNG", onClick: onExportPng },
    { icon: Printer, label: "打印 / 存为 PDF", onClick: onPrint },
    { icon: Copy, label: "复制和弦进行", onClick: onCopy },
  ];

  return (
    <header className="no-print sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center gap-3 px-3 py-2.5 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg">
            <Piano className="h-4 w-4 text-white" />
          </div>
          <div className="leading-tight">
            <h1 className="text-[15px] font-bold tracking-tight text-white">
              Guitar2Piano
              <span className="ml-1.5 hidden text-[11px] font-normal text-slate-400 sm:inline">
                吉他谱 → 钢琴和弦
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              {song ? `${song.title} · ${song.events.length} 和弦` : "TAB / 和弦名 → voicing · 五线谱 · 播放"}
            </p>
          </div>
        </div>

        <div className="ml-auto relative">
          <button
            className={`btn ${disabled ? "opacity-40" : ""}`}
            disabled={disabled}
            onClick={() => setOpen((v) => !v)}
          >
            <Download className="h-3.5 w-3.5" />
            导出
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>
          {open && !disabled && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 z-50 mt-1.5 w-[210px] overflow-hidden rounded-lg border border-white/10 bg-ink-850 shadow-2xl">
                {items.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => {
                      setOpen(false);
                      it.onClick();
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-slate-200 transition hover:bg-white/[0.06]"
                  >
                    <it.icon className="h-3.5 w-3.5 text-slate-400" />
                    {it.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
