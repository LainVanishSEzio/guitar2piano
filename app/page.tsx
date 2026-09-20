"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { KeyboardMusic, Sparkles } from "lucide-react";

import { useStore } from "@/store/useStore";
import { voiceSong } from "@/lib/voicing";
import { analyzeKey } from "@/lib/key";
import { transposeChordSymbol } from "@/lib/music";
import { player } from "@/lib/audio";
import type { PlayItem } from "@/lib/audio";
import {
  chordProgressionText,
  copyText,
  exportMidi,
  exportMusicXml,
  exportPng,
} from "@/lib/exporter";
import type { StaffMeasure } from "@/lib/staff";

import TopBar from "@/components/TopBar";
import InputPanel from "@/components/InputPanel";
import ChordEditor from "@/components/ChordEditor";
import ChordCards from "@/components/ChordCards";
import SettingsPanel from "@/components/SettingsPanel";
import TransportBar from "@/components/TransportBar";
import PianoKeyboard from "@/components/PianoKeyboard";
import Toast from "@/components/Toast";

const StaffView = dynamic(() => import("@/components/StaffView"), {
  ssr: false,
  loading: () => (
    <div className="paper flex h-[180px] w-full items-center justify-center rounded-lg text-[13px] text-slate-500">
      正在加载五线谱引擎…
    </div>
  ),
});

export default function Home() {
  const song = useStore((s) => s.song);
  const voicing = useStore((s) => s.voicing);
  const play = useStore((s) => s.play);
  const transpose = useStore((s) => s.transpose);
  const concert = useStore((s) => s.concertPitch);
  const activeIndex = useStore((s) => s.activeIndex);
  const selectedId = useStore((s) => s.selectedId);
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const setActiveIndex = useStore((s) => s.setActiveIndex);
  const showToast = useStore((s) => s.showToast);
  const runParse = useStore((s) => s.runParse);

  const staffHost = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  // 首屏自动解析示例
  useEffect(() => {
    const t = setTimeout(() => runParse(), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shift = transpose + (concert && song ? song.capo : 0);

  const voicings = useMemo(
    () => (song ? voiceSong(song.events, voicing, shift) : []),
    [song, voicing, shift],
  );

  const analysis = useMemo(
    () => (song ? analyzeKey(song.events, shift) : { key: "C", scale: [], degrees: [], confidence: 0 }),
    [song, shift],
  );

  const measures: StaffMeasure[] = useMemo(() => {
    if (!song) return [];
    return song.events.map((ev, i) => ({
      symbol: transposeChordSymbol(ev.symbol, shift),
      beats: ev.beats,
      rh: voicings[i]?.rh ?? [],
      lh: voicings[i]?.lh ?? [],
    }));
  }, [song, voicings, shift]);

  /* ------------------------------ 播放 ------------------------------ */
  const items: PlayItem[] = useMemo(
    () =>
      (song?.events ?? []).map((ev, i) => ({
        rh: (voicings[i]?.rh ?? []).map((n) => n.midi),
        lh: (voicings[i]?.lh ?? []).map((n) => n.midi),
        beats: ev.beats,
      })),
    [song, voicings],
  );

  const handleStop = useCallback(() => {
    player.stop();
    setPlaying(false);
    setActiveIndex(-1);
  }, [setPlaying, setActiveIndex]);

  const handlePlay = useCallback(async () => {
    if (!song || !items.length) return;
    try {
      await player.init();
    } catch {
      showToast("err", "音频初始化失败，请点击页面后再试");
      return;
    }
    setPlaying(true);
    player.play(items, {
      bpm: play.bpm,
      beatsPerBar: play.timeSignature[0],
      arpeggio: play.arpeggio,
      arpSpread: play.arpSpread,
      volume: play.volume,
      loop: play.loop,
      metronome: play.metronome,
      onIndex: (i) => setActiveIndex(i),
      onEnd: () => {
        setPlaying(false);
        setActiveIndex(-1);
      },
    });
  }, [song, items, play, setPlaying, setActiveIndex, showToast]);

  // BPM / 音量变化时实时生效
  useEffect(() => {
    if (isPlaying) player.setVolume(play.volume);
  }, [play.volume, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      handleStop();
      const t = setTimeout(() => handlePlay(), 60);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.bpm, play.timeSignature, play.arpeggio, play.loop, play.metronome, voicings]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        if (isPlaying) handleStop();
        else handlePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPlaying, handlePlay, handleStop]);

  /* ------------------------------ 键盘高亮 ------------------------------ */
  const highlightIndex =
    activeIndex >= 0
      ? activeIndex
      : selectedId
        ? (song?.events.findIndex((e) => e.id === selectedId) ?? -1)
        : -1;

  const currentVoicing = highlightIndex >= 0 ? voicings[highlightIndex] : undefined;

  const previewNote = async (midi: number) => {
    setPreview(midi);
    setTimeout(() => setPreview(null), 260);
    try {
      await player.init();
      await player.preview(midi);
    } catch {
      /* noop */
    }
  };

  /* ------------------------------ 导出 ------------------------------ */
  const noSong = !song || !song.events.length;

  const doExportMidi = () => {
    if (!song) return;
    exportMidi(song, voicings, shift, play.bpm, `${song.title || "guitar2piano"}.mid`);
    showToast("ok", "MIDI 已导出");
  };
  const doExportXml = () => {
    if (!song) return;
    exportMusicXml(song, voicings, shift, play.bpm, `${song.title || "guitar2piano"}.musicxml`);
    showToast("ok", "MusicXML 已导出");
  };
  const doExportPng = async () => {
    if (!staffHost.current) {
      showToast("err", "五线谱尚未渲染");
      return;
    }
    try {
      await exportPng(staffHost.current, `${song?.title || "guitar2piano"}.png`);
      showToast("ok", "PNG 已导出");
    } catch {
      showToast("err", "PNG 导出失败");
    }
  };
  const doCopy = async () => {
    if (!song) return;
    const ok = await copyText(chordProgressionText(song.events, shift));
    showToast(ok ? "ok" : "err", ok ? "和弦进行已复制" : "复制失败，请手动选择");
  };

  const subtitle = song
    ? `调号 ${analysis.key} · ${play.bpm} BPM · ${play.timeSignature[0]}/${play.timeSignature[1]}${
        song.capo ? ` · Capo ${song.capo}` : ""
      }${transpose ? ` · 移调 ${transpose > 0 ? "+" : ""}${transpose}` : ""} · Guitar2Piano`
    : "";

  return (
    <div className="min-h-screen pb-[186px]">
      <TopBar
        disabled={noSong}
        onExportMidi={doExportMidi}
        onExportXml={doExportXml}
        onExportPng={doExportPng}
        onPrint={() => window.print()}
        onCopy={doCopy}
      />

      <main className="mx-auto max-w-[1800px] px-3 py-3 sm:px-5">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)_minmax(280px,320px)]">
          {/* 左：输入 + 编辑 */}
          <div className="flex min-h-0 flex-col gap-3">
            <InputPanel />
            <ChordEditor voicings={voicings} degrees={analysis.degrees} />
          </div>

          {/* 中：和弦卡 + 五线谱 + 走带 */}
          <div className="flex min-w-0 flex-col gap-3">
            <ChordCards voicings={voicings} degrees={analysis.degrees} />

            <div className="panel">
              <div className="panel-head">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                  钢琴五线谱
                </span>
                <span className="text-[11px] font-normal text-slate-500">
                  {analysis.key} · 置信度 {Math.round(analysis.confidence * 100)}%
                </span>
              </div>
              <div className="p-2">
                <StaffView
                  measures={measures}
                  keyName={analysis.key}
                  timeSignature={song?.timeSignature ?? play.timeSignature}
                  activeIndex={activeIndex}
                  title={song?.title}
                  subtitle={subtitle}
                  onReady={(el) => (staffHost.current = el)}
                />
              </div>
            </div>

            <TransportBar onPlay={handlePlay} onStop={handleStop} disabled={noSong} />

            {noSong && (
              <div className="panel px-4 py-8 text-center text-[13px] text-slate-500">
                左侧输入吉他谱后点击「解析并转换」，这里会显示钢琴谱与键盘。
              </div>
            )}
          </div>

          {/* 右：设置 */}
          <div className="flex flex-col gap-3">
            <SettingsPanel />
            <div className="panel p-3">
              <div className="mb-2 text-[13px] font-semibold text-slate-300">进行分析</div>
              <div className="mb-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">{analysis.key}</span>
                <span className="text-[11px] text-slate-500">
                  {analysis.scale.join(" ")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {song?.events.map((ev, i) => (
                  <span
                    key={ev.id}
                    className={`rounded px-1.5 py-0.5 text-[11px] tabular ${
                      activeIndex === i
                        ? "bg-brand-500/30 text-white"
                        : "bg-ink-800 text-slate-400"
                    }`}
                  >
                    {analysis.degrees[i] ?? "?"}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                调号与级数由和弦集合自动推断；切换「实际音高」会按 capo 偏移重新计算。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 底部键盘 */}
      <div className="no-print fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.07] bg-ink-950/92 backdrop-blur">
        <div className="mx-auto max-w-[1800px] px-3 py-2.5 sm:px-5">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] text-slate-400">
            <KeyboardMusic className="h-3.5 w-3.5 text-brand-400" />
            钢琴键盘
            {currentVoicing ? (
              <span className="text-slate-300">
                当前：
                {song?.events[highlightIndex]
                  ? transposeChordSymbol(song.events[highlightIndex].symbol, shift)
                  : ""}
                <span className="ml-1 text-slate-500">
                  左手 {currentVoicing.lh.map((n) => n.name).join(" ") || "—"} / 右手{" "}
                  {currentVoicing.rh.map((n) => n.name).join(" ") || "—"}
                </span>
              </span>
            ) : (
              <span className="text-slate-500">悬停和弦卡或开始播放以查看高亮</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <PianoKeyboard
              rhNotes={currentVoicing?.rh.map((n) => n.midi) ?? []}
              lhNotes={currentVoicing?.lh.map((n) => n.midi) ?? []}
              preview={preview}
              onKey={previewNote}
            />
          </div>
        </div>
      </div>

      <Toast />
    </div>
  );
}
