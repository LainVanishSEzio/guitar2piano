"use client";

import { useMemo } from "react";
import { midiToName } from "@/lib/music";

const WHITE_PC = new Set([0, 2, 4, 5, 7, 9, 11]);
const isWhite = (m: number) => WHITE_PC.has(((m % 12) + 12) % 12);

interface Props {
  lowMidi?: number;
  highMidi?: number;
  rhNotes?: number[];
  lhNotes?: number[];
  /** 预览/试听高亮 */
  preview?: number | null;
  onKey?: (midi: number) => void;
  showLabels?: boolean;
}

export default function PianoKeyboard({
  lowMidi = 36,
  highMidi = 96,
  rhNotes = [],
  lhNotes = [],
  preview = null,
  onKey,
  showLabels = true,
}: Props) {
  const { whites, blacks, whiteWidth } = useMemo(() => {
    const w: number[] = [];
    const b: { midi: number; left: number }[] = [];
    let whiteCount = 0;
    for (let m = lowMidi; m <= highMidi; m++) {
      if (isWhite(m)) {
        w.push(m);
        whiteCount++;
      } else {
        b.push({ midi: m, left: whiteCount }); // 位于第 whiteCount 个白键左侧边界
      }
    }
    return { whites: w, blacks: b, whiteWidth: 100 / Math.max(1, w.length) };
  }, [lowMidi, highMidi]);

  const rhSet = new Set(rhNotes);
  const lhSet = new Set(lhNotes);
  const blackW = whiteWidth * 0.62;

  const stateOf = (m: number) => {
    if (rhSet.has(m)) return "rh";
    if (lhSet.has(m)) return "lh";
    if (preview === m) return "preview";
    return "";
  };

  return (
    <div className="select-none">
      <div className="relative h-[132px] w-full min-w-[640px] overflow-hidden rounded-lg border border-black/60 bg-[#0b0d13] p-[6px] shadow-inner">
        {/* 白键 */}
        <div className="flex h-full">
          {whites.map((m) => {
            const st = stateOf(m);
            const isC = ((m % 12) + 12) % 12 === 0;
            return (
              <button
                key={m}
                type="button"
                onClick={() => onKey?.(m)}
                className={`key-white relative flex-1 rounded-b-[5px] text-[10px] font-medium transition-colors ${
                  isC ? "text-[#8a90a6]" : "text-transparent"
                }`}
                data-on={st && st !== "lh" ? "1" : undefined}
                data-lh={st === "lh" ? "1" : undefined}
                title={midiToName(m)}
                style={{ marginRight: 1 }}
              >
                <span className="pointer-events-none absolute bottom-1 left-0 right-0 text-center">
                  {showLabels && isC ? midiToName(m) : ""}
                </span>
              </button>
            );
          })}
        </div>

        {/* 黑键 */}
        {blacks.map(({ midi, left }) => {
          const st = stateOf(midi);
          return (
            <button
              key={midi}
              type="button"
              onClick={() => onKey?.(midi)}
              className="key-black absolute top-[6px] z-10 h-[62%] rounded-b-[4px] transition-colors"
              style={{
                left: `calc(${left * whiteWidth}% - ${blackW / 2}% )`,
                width: `${blackW}%`,
              }}
              data-on={st && st !== "lh" ? "1" : undefined}
              data-lh={st === "lh" ? "1" : undefined}
              title={midiToName(midi)}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-4 px-1 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-4 rounded-sm bg-gradient-to-b from-[#8b7cff] to-[#5444e0]" />
          右手
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-2.5 w-4 rounded-sm bg-gradient-to-b from-[#3ad6d6] to-[#1c8f9c]" />
          左手
        </span>
        <span className="ml-auto hidden sm:inline">点击琴键可试听</span>
      </div>
    </div>
  );
}
