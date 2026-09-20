"use client";

import { create } from "zustand";
import { parseInput } from "@/lib/parse";
import { DEFAULT_VOICING } from "@/lib/voicing";
import { parseChordSymbol } from "@/lib/music";
import type {
  ChordEvent,
  InputMode,
  ParseIssue,
  PlaySettings,
  Song,
  VoicingSettings,
} from "@/lib/types";
import { EXAMPLES } from "@/lib/examples";

let counter = 0;
const newId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`;

interface AppState {
  /* 输入 */
  input: string;
  mode: InputMode;
  issues: ParseIssue[];
  detected: InputMode;

  /* 数据 */
  song: Song | null;
  transpose: number;
  concertPitch: boolean; // true = 显示 capo 后的实际音高

  /* 设置 */
  voicing: VoicingSettings;
  play: PlaySettings;

  /* UI / 播放 */
  isPlaying: boolean;
  activeIndex: number;
  selectedId: string | null;
  toast: { kind: "ok" | "err" | "info"; msg: string } | null;

  /* Actions */
  setInput: (v: string) => void;
  setMode: (m: InputMode) => void;
  runParse: () => void;
  loadExample: (id: string) => void;
  setTranspose: (n: number) => void;
  setCapo: (n: number) => void;
  setConcertPitch: (v: boolean) => void;
  setVoicing: (patch: Partial<VoicingSettings>) => void;
  setPlay: (patch: Partial<PlaySettings>) => void;
  setBpm: (n: number) => void;
  setTimeSignature: (ts: [number, number]) => void;
  updateEvent: (id: string, patch: Partial<ChordEvent>) => void;
  removeEvent: (id: string) => void;
  insertEventAfter: (id: string) => void;
  clearEvents: () => void;
  select: (id: string | null) => void;
  setPlaying: (v: boolean) => void;
  setActiveIndex: (i: number) => void;
  showToast: (kind: "ok" | "err" | "info", msg: string) => void;
}

export const useStore = create<AppState>((set, get) => ({
  input: EXAMPLES[0].text,
  mode: "auto",
  issues: [],
  detected: "chord",

  song: null,
  transpose: 0,
  concertPitch: false,

  voicing: { ...DEFAULT_VOICING },
  play: {
    bpm: 92,
    timeSignature: [4, 4],
    arpeggio: false,
    arpSpread: 0.32,
    volume: -8,
    loop: false,
    metronome: false,
    swing: 0,
  },

  isPlaying: false,
  activeIndex: -1,
  selectedId: null,
  toast: null,

  setInput: (v) => set({ input: v }),
  setMode: (m) => set({ mode: m }),

  runParse: () => {
    const { input, mode, song, voicing, play } = get();
    const res = parseInput(input, mode, song ?? undefined);
    if (!res.song) {
      set({ issues: res.issues, detected: res.detected });
      get().showToast("err", res.issues[0]?.message ?? "解析失败");
      return;
    }
    const nextSong: Song = {
      ...res.song,
      timeSignature: play.timeSignature,
      bpm: play.bpm,
      tuning: song?.tuning ?? res.song.tuning,
    };
    set({
      song: nextSong,
      issues: res.issues,
      detected: res.detected,
      activeIndex: -1,
      selectedId: null,
    });
    void voicing;
    const warns = res.issues.filter((i) => i.level !== "info").length;
    get().showToast(
      warns ? "info" : "ok",
      `解析完成：${res.song.events.length} 个和弦${warns ? `，${warns} 条提示` : ""}`,
    );
  },

  loadExample: (id) => {
    const ex = EXAMPLES.find((e) => e.id === id);
    if (!ex) return;
    set({ input: ex.text, mode: ex.mode, issues: [], song: null });
    setTimeout(() => get().runParse(), 0);
  },

  setTranspose: (n) => set({ transpose: Math.max(-12, Math.min(12, n)) }),
  setCapo: (n) => {
    const song = get().song;
    if (!song) return;
    set({ song: { ...song, capo: Math.max(0, Math.min(11, n)) } });
  },
  setConcertPitch: (v) => set({ concertPitch: v }),
  setVoicing: (patch) => set({ voicing: { ...get().voicing, ...patch } }),
  setPlay: (patch) => set({ play: { ...get().play, ...patch } }),
  setBpm: (n) => {
    set({ play: { ...get().play, bpm: Math.max(40, Math.min(240, Math.round(n))) } });
    const song = get().song;
    if (song) set({ song: { ...song, bpm: Math.max(40, Math.min(240, Math.round(n))) } });
  },
  setTimeSignature: (ts) => {
    set({ play: { ...get().play, timeSignature: ts } });
    const song = get().song;
    if (song) set({ song: { ...song, timeSignature: ts } });
  },

  updateEvent: (id, patch) => {
    const song = get().song;
    if (!song) return;
    const events = song.events.map((e) => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch, locked: true };
      if (patch.symbol) {
        const p = parseChordSymbol(patch.symbol);
        if (p) {
          next.symbol = p.symbol;
          next.root = p.root;
          next.quality = p.quality;
          next.bass = p.bass;
          next.notes = p.notes;
          next.pcs = p.pcs;
          next.source = "manual";
        }
      }
      return next;
    });
    set({ song: { ...song, events } });
  },

  removeEvent: (id) => {
    const song = get().song;
    if (!song) return;
    set({ song: { ...song, events: song.events.filter((e) => e.id !== id) } });
  },

  insertEventAfter: (id) => {
    const song = get().song;
    if (!song) return;
    const idx = song.events.findIndex((e) => e.id === id);
    const base = song.events[idx] ?? song.events[0];
    const ev: ChordEvent = {
      id: newId(),
      symbol: base?.symbol ?? "C",
      root: base?.root ?? "C",
      quality: base?.quality ?? "",
      bass: base?.bass ?? null,
      notes: base?.notes ?? ["C", "E", "G"],
      pcs: base?.pcs ?? [0, 4, 7],
      beats: base?.beats ?? 4,
      source: "manual",
      bar: (base?.bar ?? 0) + 1,
      locked: true,
    };
    const events = [...song.events];
    events.splice(idx + 1, 0, ev);
    set({ song: { ...song, events }, selectedId: ev.id });
  },

  clearEvents: () => {
    const song = get().song;
    if (!song) return;
    set({ song: { ...song, events: [] }, activeIndex: -1 });
  },

  select: (id) => set({ selectedId: id }),
  setPlaying: (v) => set({ isPlaying: v }),
  setActiveIndex: (i) => set({ activeIndex: i }),
  showToast: (kind, msg) => {
    set({ toast: { kind, msg } });
    setTimeout(() => {
      if (get().toast?.msg === msg) set({ toast: null });
    }, 2600);
  },
}));
