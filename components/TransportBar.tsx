"use client";

import { Play, Square, Pause, Repeat, Timer, Volume2, Zap } from "lucide-react";
import { useStore } from "@/store/useStore";

interface Props {
  onPlay: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const TS_OPTIONS: [number, number][] = [
  [4, 4],
  [3, 4],
  [2, 4],
  [6, 8],
];

export default function TransportBar({ onPlay, onStop, disabled }: Props) {
  const play = useStore((s) => s.play);
  const setPlay = useStore((s) => s.setPlay);
  const setBpm = useStore((s) => s.setBpm);
  const setTimeSignature = useStore((s) => s.setTimeSignature);
  const isPlaying = useStore((s) => s.isPlaying);

  return (
    <div className="panel flex flex-wrap items-center gap-2 px-3 py-2">
      <button
        className={`btn ${isPlaying ? "" : "btn-primary"} min-w-[92px]`}
        disabled={disabled}
        onClick={() => (isPlaying ? onStop() : onPlay())}
      >
        {isPlaying ? (
          <>
            <Pause className="h-3.5 w-3.5" />
            暂停
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5" />
            播放
          </>
        )}
      </button>
      <button className="btn" disabled={disabled} onClick={onStop} title="停止并回到开头">
        <Square className="h-3 w-3" />
      </button>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wider text-slate-500">BPM</span>
        <input
          type="range"
          min={40}
          max={240}
          value={play.bpm}
          onChange={(e) => setBpm(parseInt(e.target.value, 10))}
          className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500 md:w-32"
        />
        <input
          type="number"
          value={play.bpm}
          onChange={(e) => setBpm(parseInt(e.target.value, 10) || 90)}
          className="field tabular w-16 py-1 text-center"
        />
      </div>

      <select
        className="field w-[76px] py-1"
        value={`${play.timeSignature[0]}/${play.timeSignature[1]}`}
        onChange={(e) => {
          const [a, b] = e.target.value.split("/").map(Number);
          setTimeSignature([a, b]);
        }}
      >
        {TS_OPTIONS.map(([a, b]) => (
          <option key={`${a}/${b}`} value={`${a}/${b}`}>
            {a}/{b}
          </option>
        ))}
      </select>

      <button
        className={`btn ${play.arpeggio ? "border-brand-500/60 bg-brand-500/20 text-white" : ""}`}
        onClick={() => setPlay({ arpeggio: !play.arpeggio })}
        title="琶音：右手音依次发声"
      >
        <Zap className="h-3.5 w-3.5" />
        {play.arpeggio ? "琶音" : "柱式"}
      </button>

      <button
        className={`btn ${play.metronome ? "border-brand-500/60 bg-brand-500/20 text-white" : ""}`}
        onClick={() => setPlay({ metronome: !play.metronome })}
      >
        <Timer className="h-3.5 w-3.5" />
        节拍器
      </button>

      <button
        className={`btn ${play.loop ? "border-brand-500/60 bg-brand-500/20 text-white" : ""}`}
        onClick={() => setPlay({ loop: !play.loop })}
      >
        <Repeat className="h-3.5 w-3.5" />
        循环
      </button>

      <div className="flex min-w-[130px] items-center gap-1.5">
        <Volume2 className="h-3.5 w-3.5 text-slate-400" />
        <input
          type="range"
          min={-40}
          max={0}
          value={play.volume}
          onChange={(e) => setPlay({ volume: parseInt(e.target.value, 10) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
        />
      </div>
    </div>
  );
}
