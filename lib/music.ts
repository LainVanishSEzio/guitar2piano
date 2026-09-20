/* =========================================================================
 * 基础乐理工具 —— Tonal.js + 本地兜底实现
 * ========================================================================= */
import { Note, Chord } from "tonal";
import type { Midi, NoteName } from "./types";

export const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

/** 12 个音的两种拼写 */
export const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** 升号调 / 降号调判定 */
export const SHARP_KEYS = ["C", "G", "D", "A", "E", "B", "F#", "C#"];
export const FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb"];

export function pcOf(name: NoteName): number {
  const m = Note.midi(`${normalizeName(name)}4`);
  return m == null ? 0 : ((m % 12) + 12) % 12;
}

/** 把 "Bb" / "A#" / "db" 规范化成 Tonal 能识别的形式，如 "Bb" */
export function normalizeName(name: string): string {
  if (!name) return "C";
  let n = name.trim();
  const letter = n[0].toUpperCase();
  n = letter + n.slice(1).replace(/[#♯]/g, "#").replace(/[b♭]/g, "b");
  // 修正 "Cb"→"B" 之类的极端情况交给 Tonal，这里只做基本清理
  return n;
}

export function midiOf(name: NoteName, octave = 4): Midi {
  const m = Note.midi(`${normalizeName(name)}${octave}`);
  return m == null ? 60 : m;
}

export function nameOfPc(pc: number, useFlat = false): NoteName {
  const p = ((pc % 12) + 12) % 12;
  return useFlat ? FLAT_NAMES[p] : SHARP_NAMES[p];
}

/** MIDI → 音名（带八度），按调号决定升/降拼写 */
export function midiToName(midi: Midi, useFlat = false): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${nameOfPc(pc, useFlat)}${octave}`;
}

export function keyUsesFlat(key: string): boolean {
  const k = key.replace(/m$/, "");
  return FLAT_KEYS.includes(k) || (FLAT_KEYS.includes(k) && !SHARP_KEYS.includes(k));
}

/* ------------------------------------------------------------------ *
 * 和弦品质模板（Tonal 兜底 + 推断评分）
 * ------------------------------------------------------------------ */

export interface ChordTemplate {
  /** 后缀（Tonal 里可识别的写法） */
  suffix: string;
  /** 相对根音的半音集合 */
  semitones: number[];
  /** 展示名 */
  label: string;
  /** 匹配时的复杂度惩罚 */
  weight: number;
}

export const CHORD_TEMPLATES: ChordTemplate[] = [
  { suffix: "", semitones: [0, 4, 7], label: "", weight: 0 },
  { suffix: "m", semitones: [0, 3, 7], label: "m", weight: 0 },
  { suffix: "dim", semitones: [0, 3, 6], label: "dim", weight: 0.4 },
  { suffix: "aug", semitones: [0, 4, 8], label: "aug", weight: 0.6 },
  { suffix: "sus2", semitones: [0, 2, 7], label: "sus2", weight: 0.6 },
  { suffix: "sus4", semitones: [0, 5, 7], label: "sus4", weight: 0.4 },
  { suffix: "6", semitones: [0, 4, 7, 9], label: "6", weight: 0.5 },
  { suffix: "m6", semitones: [0, 3, 7, 9], label: "m6", weight: 0.7 },
  { suffix: "maj7", semitones: [0, 4, 7, 11], label: "maj7", weight: 0.3 },
  { suffix: "m7", semitones: [0, 3, 7, 10], label: "m7", weight: 0.2 },
  { suffix: "7", semitones: [0, 4, 7, 10], label: "7", weight: 0.1 },
  { suffix: "dim7", semitones: [0, 3, 6, 9], label: "dim7", weight: 0.7 },
  { suffix: "m7b5", semitones: [0, 3, 6, 10], label: "m7b5", weight: 0.6 },
  { suffix: "add9", semitones: [0, 4, 7, 14], label: "add9", weight: 0.7 },
  { suffix: "madd9", semitones: [0, 3, 7, 14], label: "m(add9)", weight: 0.9 },
  { suffix: "maj9", semitones: [0, 4, 7, 11, 14], label: "maj9", weight: 0.9 },
  { suffix: "9", semitones: [0, 4, 7, 10, 14], label: "9", weight: 0.8 },
  { suffix: "m9", semitones: [0, 3, 7, 10, 14], label: "m9", weight: 0.9 },
  { suffix: "7sus4", semitones: [0, 5, 7, 10], label: "7sus4", weight: 0.6 },
  { suffix: "5", semitones: [0, 7], label: "5", weight: 1.2 },
];

export interface ParsedChord {
  symbol: string;
  root: NoteName;
  quality: string;
  bass: NoteName | null;
  notes: NoteName[];
  pcs: number[];
}

/** 拆分 "A/C#" → base "A", bass "C#" */
function splitSlash(sym: string): [string, string | null] {
  const idx = sym.indexOf("/");
  if (idx <= 0 || idx === sym.length - 1) return [sym, null];
  return [sym.slice(0, idx), sym.slice(idx + 1)];
}

/** 用 Tonal 解析和弦符号；失败时回退到本地模板 */
export function parseChordSymbol(input: string): ParsedChord | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw || raw === "N.C." || raw === "NC") return null;

  const [baseRaw, bassRaw] = splitSlash(raw);
  const m = baseRaw.match(/^([A-Ga-g])([#b♯♭x]?)(.*)$/);
  if (!m) return null;

  const root = normalizeName(m[1].toUpperCase() + (m[2] || ""));
  const quality = (m[3] || "").trim();
  const rootPc = pcOf(root);

  // 1) 优先 Tonal
  let notes: NoteName[] | null = null;
  try {
    const probe = String(Chord.get(root + quality)?.notes ?? "");
    const c: any = Chord.get(root + quality);
    if (c && !c.empty && Array.isArray(c.notes) && c.notes.length) {
      notes = c.notes.map((n: string) => n);
    } else if (probe) {
      notes = probe.split(",").filter(Boolean);
    }
  } catch {
    notes = null;
  }

  // 2) 本地兜底
  if (!notes || !notes.length) {
    const tpl = findTemplateByQuality(quality);
    if (!tpl) return null;
    notes = tpl.semitones.map((s) => nameOfPc((rootPc + s) % 12, keyUsesFlat(root)));
  }

  const pcs = notes.map(pcOf);
  const bass = bassRaw ? normalizeName(bassRaw) : null;

  return {
    symbol: bass ? `${root}${quality}/${bass}` : `${root}${quality}`,
    root,
    quality,
    bass,
    notes,
    pcs: Array.from(new Set(pcs)).sort((a, b) => a - b),
  };
}

/** 按后缀字符串匹配模板（含常见别名） */
export function findTemplateByQuality(q: string): ChordTemplate | null {
  const s = q.trim().toLowerCase().replace(/\s/g, "");
  if (!s) return CHORD_TEMPLATES[0];
  const alias: Record<string, string> = {
    maj: "",
    m: "m",
    min: "m",
    "-": "m",
    mi: "m",
    dim: "dim",
    o: "dim",
    aug: "aug",
    "+": "aug",
    sus: "sus4",
    sus4: "sus4",
    sus2: "sus2",
    dom7: "7",
    "7": "7",
    maj7: "maj7",
    m7: "m7",
    min7: "m7",
    "△": "maj7",
    "∆": "maj7",
    "o7": "dim7",
    dim7: "dim7",
    "ø": "m7b5",
    "m7-5": "m7b5",
    m7b5: "m7b5",
    "7b5": "7b5",
    add9: "add9",
    add2: "add9",
    "2": "add9",
    maj9: "maj9",
    "9": "9",
    m9: "m9",
    "6": "6",
    m6: "m6",
    "7sus": "7sus4",
    "7sus4": "7sus4",
  };
  const key = alias[s] ?? s;
  const hit = CHORD_TEMPLATES.find((t) => t.suffix.toLowerCase() === key);
  if (hit) return hit;
  // 模糊：包含关系
  return CHORD_TEMPLATES.find((t) => t.suffix && key.includes(t.suffix.toLowerCase())) ?? null;
}

/** 根音 + 品质 → 组成音（含 Tonal 优先） */
export function chordNotesOf(root: NoteName, quality: string): NoteName[] {
  const p = parseChordSymbol(`${root}${quality}`);
  return p ? p.notes : [];
}

/** 整体移调一个和弦符号（保留品质与转位低音） */
export function transposeChordSymbol(symbol: string, semitones: number): string {
  const p = parseChordSymbol(symbol);
  if (!p) return symbol;
  const flat = keyUsesFlat(p.root) || ["F", "Bb", "Eb", "Ab", "Db", "Gb"].includes(p.root);
  const newRoot = nameOfPc((pcOf(p.root) + semitones + 120) % 12, flat);
  const newBass = p.bass ? nameOfPc((pcOf(p.bass) + semitones + 120) % 12, flat) : null;
  return `${newRoot}${p.quality}${newBass ? "/" + newBass : ""}`;
}

/** 把半音数转成（相对根音的）音程名，用于罗马数字等 */
export function intervalName(semitones: number): string {
  const map: Record<number, string> = {
    0: "1",
    1: "b2",
    2: "2",
    3: "b3",
    4: "3",
    5: "4",
    6: "b5",
    7: "5",
    8: "b6",
    9: "6",
    10: "b7",
    11: "7",
  };
  return map[((semitones % 12) + 12) % 12] ?? String(semitones);
}
