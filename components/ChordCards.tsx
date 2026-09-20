"use client";

import { useStore } from "@/store/useStore";
import { transposeChordSymbol } from "@/lib/music";
import type { Voicing } from "@/lib/types";

interface Props {
  voicings: Voicing[];
  degrees: string[];
}

const INV_LABEL = ["原位", "第一转位", "第二转位", "第三转位", "第四转位"];

export default function ChordCards({ voicings, degrees }: Props) {
  const song = useStore((s) => s.song);
  const transpose = useStore((s) => s.transpose);
  const concert = useStore((s) => s.concertPitch);
  const activeIndex = useStore((s) => s.activeIndex);
  const select = useStore((s) => s.select);
  const setActiveIndex = useStore((s) => s.setActiveIndex);

  if (!song || !song.events.length) return null;
  const shift = transpose + (concert ? song.capo : 0);

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {song.events.map((ev, i) => {
        const v = voicings[i];
        const sym = transposeChordSymbol(ev.symbol, shift);
        const active = activeIndex === i;
        return (
          <button
            key={ev.id}
            onClick={() => {
              select(ev.id);
              setActiveIndex(i);
            }}
            className={`min-w-[104px] shrink-0 rounded-xl border px-3 py-2 text-left transition ${
              active
                ? "border-brand-500 bg-brand-500/15 shadow-[0_0_0_1px_rgba(109,92,246,0.35)]"
                : "border-white/[0.07] bg-ink-900/70 hover:border-white/20"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[19px] font-bold leading-none tracking-tight text-white">
                {sym}
              </span>
              <span className="tabular text-[10px] text-slate-500">{ev.beats}拍</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-400">{degrees[i] ?? ""}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(v?.rh ?? []).map((n) => (
                <span
                  key={n.midi}
                  className="rounded bg-brand-500/20 px-1 py-[1px] text-[10px] tabular text-brand-400"
                >
                  {n.name}
                </span>
              ))}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(v?.lh ?? []).map((n) => (
                <span
                  key={n.midi}
                  className="rounded bg-accent-cyan/15 px-1 py-[1px] text-[10px] tabular text-accent-cyan"
                >
                  {n.name}
                </span>
              ))}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {INV_LABEL[v?.inversion ?? 0] ?? ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}
