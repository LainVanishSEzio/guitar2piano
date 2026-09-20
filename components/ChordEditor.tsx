"use client";

import { Copy, Trash2, Lock, Unlock, Plus } from "lucide-react";
import { useStore } from "@/store/useStore";
import { transposeChordSymbol } from "@/lib/music";
import type { Voicing } from "@/lib/types";

interface Props {
  voicings: Voicing[];
  degrees: string[];
}

export default function ChordEditor({ voicings, degrees }: Props) {
  const song = useStore((s) => s.song);
  const transpose = useStore((s) => s.transpose);
  const concert = useStore((s) => s.concertPitch);
  const selectedId = useStore((s) => s.selectedId);
  const activeIndex = useStore((s) => s.activeIndex);
  const updateEvent = useStore((s) => s.updateEvent);
  const removeEvent = useStore((s) => s.removeEvent);
  const insertEventAfter = useStore((s) => s.insertEventAfter);
  const select = useStore((s) => s.select);

  if (!song || !song.events.length) {
    return (
      <div className="panel px-3 py-6 text-center text-[13px] text-slate-500">
        还没有和弦。先在左侧输入并解析谱子。
      </div>
    );
  }

  const shift = transpose + (concert ? song.capo : 0);

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-head">
        <span>和弦编辑</span>
        <span className="text-[11px] font-normal text-slate-500">{song.events.length} 项</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {song.events.map((ev, i) => {
            const v = voicings[i];
            const sym = transposeChordSymbol(ev.symbol, shift);
            const isSel = selectedId === ev.id;
            const isActive = activeIndex === i;
            return (
              <div
                key={ev.id}
                onClick={() => select(ev.id)}
                className={`group grid grid-cols-[38px_1fr_58px_58px_auto] items-center gap-1.5 rounded-lg border px-1.5 py-1 transition ${
                  isActive
                    ? "border-brand-500/70 bg-brand-500/15"
                    : isSel
                      ? "border-white/20 bg-ink-800"
                      : "border-transparent hover:bg-ink-800/60"
                }`}
              >
                <span className="tabular text-[11px] text-slate-500">{i + 1}</span>

                <input
                  defaultValue={sym}
                  key={sym}
                  onChange={(e) => updateEvent(ev.id, { symbol: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value !== sym) updateEvent(ev.id, { symbol: e.target.value });
                  }}
                  className="field py-1 font-semibold"
                  title="和弦符号"
                />

                <input
                  type="number"
                  step="0.5"
                  min="0.25"
                  max="16"
                  defaultValue={ev.beats}
                  key={`b${ev.beats}-${ev.id}`}
                  onChange={(e) =>
                    updateEvent(ev.id, { beats: Math.max(0.25, parseFloat(e.target.value) || 1) })
                  }
                  className="field py-1 text-center tabular"
                  title="时值（拍）"
                />

                <span
                  className="truncate rounded bg-ink-850 px-1.5 py-1 text-center text-[11px] text-slate-400"
                  title={`右手：${v?.rh.map((n) => n.name).join(" ") || "-"}`}
                >
                  {v?.rh.length ? `${v.rh[0].name}` : "—"}
                </span>

                <div className="flex items-center gap-0.5 opacity-60 transition group-hover:opacity-100">
                  <button
                    className="rounded p-1 hover:bg-white/10"
                    title="锁定/解锁（锁定后重新解析不覆盖）"
                    onClick={() => updateEvent(ev.id, { locked: !ev.locked })}
                  >
                    {ev.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  </button>
                  <button
                    className="rounded p-1 hover:bg-white/10"
                    title="在后面插入一个相同和弦"
                    onClick={() => insertEventAfter(ev.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    className="rounded p-1 hover:bg-rose-500/20"
                    title="删除"
                    onClick={() => removeEvent(ev.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                <div className="col-span-5 -mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 px-1 pb-0.5 text-[10.5px] text-slate-500">
                  <span>{degrees[i] ?? ""}</span>
                  <span className="text-slate-600">·</span>
                  <span>
                    R: {v?.rh.map((n) => n.name.replace(/-?\d/, "")).join(" ") || "—"}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>L: {v?.lh.map((n) => n.name).join(" ") || "—"}</span>
                  {ev.source === "tab" && (
                    <span className="text-slate-600">
                      · 推断置信度 {Math.round((ev.confidence ?? 0) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-white/[0.06] px-3 py-1.5 text-[11px] text-slate-500">
        <Plus className="mr-1 inline h-3 w-3" />
        点击和弦右侧 + 图标可插入；直接改符号即可手动修正识别结果
      </div>
    </div>
  );
}
