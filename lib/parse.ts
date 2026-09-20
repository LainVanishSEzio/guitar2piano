/* =========================================================================
 * 解析器：和弦名谱 / 六线谱 TAB / 混合文本
 * ========================================================================= */
import {
  parseChordSymbol,
  pcOf,
  midiToName,
  keyUsesFlat,
  CHORD_TEMPLATES,
} from "./music";
import type {
  ChordEvent,
  InputMode,
  Midi,
  ParseIssue,
  ParseResult,
  Song,
} from "./types";

let uid = 0;
const nextId = () => `c${Date.now().toString(36)}${(uid++).toString(36)}`;

export const DEFAULT_TUNING: Midi[] = [40, 45, 50, 55, 59, 64]; // E2 A2 D3 G3 B3 E4
export const STRING_LABELS = ["E", "A", "D", "G", "B", "e"];

export function emptySong(): Song {
  return {
    title: "未命名",
    key: "C",
    timeSignature: [4, 4],
    bpm: 90,
    capo: 0,
    tuning: [...DEFAULT_TUNING],
    events: [],
  };
}

/* ------------------------------------------------------------------ *
 * 指令行：capo / bpm / time / key / title / tuning
 * ------------------------------------------------------------------ */
function applyDirective(song: Song, line: string, issues: ParseIssue[], lineNo: number) {
  const m = line.match(/^\s*(title|capo|bpm|time|key|tuning)\s*[:：]\s*(.+)$/i);
  if (!m) return false;
  const k = m[1].toLowerCase();
  const v = m[2].trim();
  if (k === "title") song.title = v;
  else if (k === "capo") {
    const n = parseInt(v, 10);
    if (Number.isFinite(n) && n >= 0 && n <= 11) song.capo = n;
    else issues.push({ level: "warn", line: lineNo, message: `变调夹取值无效：${v}` });
  } else if (k === "bpm") {
    const n = parseFloat(v);
    if (Number.isFinite(n) && n > 20 && n < 320) song.bpm = n;
    else issues.push({ level: "warn", line: lineNo, message: `BPM 取值无效：${v}` });
  } else if (k === "time") {
    const t = v.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (t) song.timeSignature = [parseInt(t[1], 10), parseInt(t[2], 10)];
    else issues.push({ level: "warn", line: lineNo, message: `拍号无效：${v}` });
  } else if (k === "key") {
    song.key = v;
  } else if (k === "tuning") {
    const names = v.split(/[\s,]+/).filter(Boolean);
    if (names.length === 6) song.tuning = names.map((n, i) => pcOf(n) + 12 * (2 + Math.floor(i / 3)));
    else issues.push({ level: "warn", line: lineNo, message: `调弦应为 6 个音名：${v}` });
  }
  return true;
}

export function beatsPerBar(ts: [number, number]): number {
  return (ts[0] * 4) / ts[1];
}

/* ------------------------------------------------------------------ *
 * 输入模式识别
 * ------------------------------------------------------------------ */
export function detectMode(text: string): "chord" | "tab" {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  let tabLines = 0;
  for (const l of lines) {
    const m = l.match(/^\s*([eEBGDA])\s*\|/);
    if (m && /[-0-9|]/.test(l)) tabLines++;
  }
  if (tabLines >= 2) return "tab";
  // 连续出现 6 行形如 "|--0-3-|" 也判定为 TAB
  let bare = 0;
  for (const l of lines) if (/^\s*\|?[\s\-0-9hp\/\\~xX|]+\|?\s*$/.test(l) && /[0-9]/.test(l)) bare++;
  if (bare >= 4) return "tab";
  return "chord";
}

/* ------------------------------------------------------------------ *
 * 和弦名谱解析
 * ------------------------------------------------------------------ */
export function parseChordChart(text: string, base?: Song): ParseResult {
  const song: Song = base ? { ...base, events: [] } : emptySong();
  const issues: ParseIssue[] = [];
  const lines = text.split(/\r?\n/);

  let barIndex = 0;
  let section: string | undefined;

  lines.forEach((rawLine, i) => {
    const line = rawLine.replace(/\/\/.*$/, "").trim();
    if (!line) return;
    if (applyDirective(song, line, issues, i + 1)) return;

    const secMatch = line.match(/^\[(.+?)\]$/);
    if (secMatch) {
      section = secMatch[1].trim();
      return;
    }
    if (/^[{(].*[)}]$/.test(line)) return; // 注释行

    const bpb = beatsPerBar(song.timeSignature);

    if (!line.includes("|")) {
      // 无小节线：每个和弦占一整小节
      const tokens = line.split(/\s{1,}|\s*-\s*/).filter(Boolean);
      for (const t of tokens) {
        if (/^[:.\d]+$/.test(t)) continue;
        const chord = parseChordSymbol(t);
        if (!chord) {
          issues.push({ level: "warn", line: i + 1, message: `无法识别和弦：${t}`, raw: t });
          continue;
        }
        song.events.push({
          id: nextId(),
          symbol: chord.symbol,
          root: chord.root,
          quality: chord.quality,
          bass: chord.bass,
          notes: chord.notes,
          pcs: chord.pcs,
          beats: bpb,
          source: "symbol",
          bar: barIndex++,
          section,
        });
      }
      return;
    }

    // 含小节线
    const bars = line
      .split("|")
      .map((b) => b.trim())
      .filter((b, idx, arr) => !(b === "" && (idx === 0 || idx === arr.length - 1)));

    for (const bar of bars) {
      let repeatStart = false;
      let repeatEnd = false;
      let content = bar;
      if (/^[:.]/.test(content) || content.startsWith(":")) {
        repeatStart = true;
        content = content.replace(/^[:.]+\s*/, "");
      }
      if (/[:.]$/.test(content) || content.includes(":|")) {
        repeatEnd = true;
        content = content.replace(/\s*[:.]+\|?$/, "").replace("|:", "");
      }
      content = content.replace(/[:.]/g, " ").trim();
      if (!content) continue;

      const tokens = content.split(/\s+/).filter((t) => t && !/^\d+$/.test(t));
      const per = tokens.length ? bpb / tokens.length : bpb;
      for (const t of tokens) {
        const chord = parseChordSymbol(t);
        if (!chord) {
          issues.push({ level: "warn", line: i + 1, message: `无法识别和弦：${t}`, raw: t });
          continue;
        }
        song.events.push({
          id: nextId(),
          symbol: chord.symbol,
          root: chord.root,
          quality: chord.quality,
          bass: chord.bass,
          notes: chord.notes,
          pcs: chord.pcs,
          beats: per,
          source: "symbol",
          bar: barIndex,
          section,
          repeatStart: repeatStart || undefined,
          repeatEnd: repeatEnd || undefined,
        });
      }
      barIndex++;
    }
  });

  if (!song.events.length) {
    issues.push({ level: "error", message: "没有解析到任何和弦，请检查输入格式。" });
    return { song: null, issues, detected: "chord" };
  }
  return { song, issues, detected: "chord" };
}

/* ------------------------------------------------------------------ *
 * 六线谱 TAB 解析
 * ------------------------------------------------------------------ */
const LABEL_TO_INDEX: Record<string, number> = { E: 0, A: 1, D: 2, G: 3, B: 4, e: 5 };

interface TabLine {
  stringIndex: number;
  /** col -> fret */
  cols: Map<number, number>;
  barStarts: number[];
}

function parseTabLine(line: string): TabLine | null {
  const m = line.match(/^\s*([eEBGDA])\s*\|(.*)$/);
  if (!m) return null;
  const label = m[1];
  const body = m[2];
  // 大小写消歧：大写 E 是低音 E（6 弦），小写 e 是高音 E（1 弦）
  let stringIndex = LABEL_TO_INDEX[label];
  if (label === "E" || label === "e") {
    // 若同一段里出现两种 E，则以出现顺序判定；这里用启发式：
    // 大写 E 开头且同段还有小写 e → 低音 E
    stringIndex = label === "E" ? 0 : 5;
  }
  const cols = new Map<number, number>();
  const barStarts: number[] = [0];
  let col = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "|") {
      barStarts.push(col);
      col += 1;
      continue;
    }
    if (ch >= "0" && ch <= "9") {
      let num = "";
      while (i < body.length && body[i] >= "0" && body[i] <= "9") {
        num += body[i];
        i++;
      }
      i--;
      cols.set(col, parseInt(num, 10));
      col += num.length;
      continue;
    }
    col += 1;
  }
  return { stringIndex, cols, barStarts };
}

export function parseTab(text: string, base?: Song): ParseResult {
  const song: Song = base ? { ...base, events: [] } : emptySong();
  const issues: ParseIssue[] = [];
  const lines = text.split(/\r?\n/);

  const groups: TabLine[][] = [];
  let current: TabLine[] = [];

  lines.forEach((rawLine, i) => {
    const line = rawLine.replace(/\/\/.*$/, "");
    const trimmed = line.trim();
    if (!trimmed) {
      if (current.length) {
        groups.push(current);
        current = [];
      }
      return;
    }
    if (applyDirective(song, trimmed, issues, i + 1)) return;
    const tl = parseTabLine(line);
    if (tl) {
      // 该组里已有同弦号则另起一组
      if (current.some((c) => c.stringIndex === tl.stringIndex)) {
        groups.push(current);
        current = [];
      }
      current.push(tl);
      if (current.length === 6) {
        groups.push(current);
        current = [];
      }
      return;
    }
    if (current.length) {
      groups.push(current);
      current = [];
    }
  });
  if (current.length) groups.push(current);

  if (!groups.length) {
    issues.push({ level: "error", message: "没有识别到六线谱（需要 6 行，形如 e|---0---|）" });
    return { song: null, issues, detected: "tab" };
  }

  const tuning = song.tuning;
  const capo = song.capo;
  const bpb = beatsPerBar(song.timeSignature);
  let barIndex = 0;

  for (const group of groups) {
    // 修正高低音 E 冲突：若同时存在 index 0 与 5 则正常；若重复用同一 index（两行都是大写 E）
    const idxCount = new Map<number, TabLine[]>();
    group.forEach((g) => {
      const arr = idxCount.get(g.stringIndex) ?? [];
      arr.push(g);
      idxCount.set(g.stringIndex, arr);
    });
    idxCount.forEach((arr, idx) => {
      if (arr.length > 1) {
        // 第二个同弦号的行：若 idx===0 视为高音弦(5)，反之
        arr[1].stringIndex = idx === 0 ? 5 : 0;
      }
    });

    const maxCol = Math.max(...group.map((g) => Math.max(...Array.from(g.cols.keys()), 0)));
    const barBoundaries = Array.from(new Set(group.flatMap((g) => g.barStarts))).sort((a, b) => a - b);

    for (let b = 0; b < barBoundaries.length; b++) {
      const start = barBoundaries[b];
      const end = b + 1 < barBoundaries.length ? barBoundaries[b + 1] : maxCol + 2;

      // 逐列取音高
      type Slot = { midis: Midi[]; pcs: number[] };
      const slots: Slot[] = [];
      for (let col = start; col < end; col++) {
        const midis: Midi[] = [];
        group.forEach((g) => {
          const fret = g.cols.get(col);
          if (fret != null) midis.push(tuning[g.stringIndex] + fret + capo);
        });
        slots.push({ midis, pcs: Array.from(new Set(midis.map((m) => ((m % 12) + 12) % 12))).sort((a, b2) => a - b2) });
      }

      // 合并连续相同音高集合（同时记录最低音，用于判定转位低音）
      const merged: { pcs: number[]; count: number; bassPc: number }[] = [];
      for (const s of slots) {
        if (!s.pcs.length) {
          if (merged.length) merged[merged.length - 1].count += 1;
          continue;
        }
        const lowest = Math.min(...s.midis);
        const bassPc = ((lowest % 12) + 12) % 12;
        const last = merged[merged.length - 1];
        if (last && last.pcs.length === s.pcs.length && last.pcs.every((p, k) => p === s.pcs[k])) {
          last.count += 1;
          last.bassPc = bassPc;
        } else {
          merged.push({ pcs: s.pcs, count: 1, bassPc });
        }
      }
      const sounding = merged.filter((m) => m.pcs.length > 0);
      if (!sounding.length) {
        barIndex++;
        continue;
      }
      const per = bpb / sounding.length;

      for (const seg of sounding) {
        const inferred = inferChordFromPcs(seg.pcs, seg.bassPc);
        const flat = keyUsesFlat(inferred.root);
        song.events.push({
          id: nextId(),
          symbol: inferred.symbol,
          root: inferred.root,
          quality: inferred.quality,
          bass: inferred.bass,
          notes: inferred.pcs.map((p) => midiToName(p + 48, flat).replace(/\d/g, "")),
          pcs: inferred.pcs,
          beats: per,
          source: "tab",
          confidence: inferred.confidence,
          bar: barIndex,
        });
        if (inferred.confidence < 0.55) {
          issues.push({
            level: "info",
            message: `第 ${barIndex + 1} 小节推断为 ${inferred.symbol}（置信度较低，可手动修正）`,
          });
        }
      }
      barIndex++;
    }
  }

  if (!song.events.length) {
    issues.push({ level: "error", message: "六线谱中没有解析到任何音符。" });
    return { song: null, issues, detected: "tab" };
  }
  return { song, issues, detected: "tab" };
}

/* ------------------------------------------------------------------ *
 * 音高集合 → 和弦推断（模板匹配，允许转位与省略）
 * ------------------------------------------------------------------ */
export interface InferredChord {
  symbol: string;
  root: string;
  quality: string;
  bass: string | null;
  pcs: number[];
  confidence: number;
}

export function inferChordFromPcs(pcsIn: number[], bassPc?: number): InferredChord {
  const pcs = Array.from(new Set(pcsIn.map((p) => ((p % 12) + 12) % 12))).sort((a, b) => a - b);
  const bass = bassPc ?? pcs[0];

  let bestScore = -Infinity;
  let bestRoot = 0;
  let bestTpl = CHORD_TEMPLATES[0];
  let bestConf = 0;
  for (let root = 0; root < 12; root++) {
    for (const tpl of CHORD_TEMPLATES) {
      const want = tpl.semitones.map((s) => (root + s) % 12);
      const matched = want.filter((w) => pcs.includes(w)).length;
      if (matched < Math.ceil(want.length / 2)) continue;
      const missing = want.length - matched;
      const extra = pcs.filter((p) => !want.includes(p)).length;
      let score = 3 * matched - 2.2 * missing - 1.6 * extra - tpl.weight - 0.15 * want.length;
      if (bass === root) score -= 2.2;
      else if (want.includes(bass)) score -= 0.6;
      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestTpl = tpl;
        bestConf = Math.max(0, Math.min(1, matched / want.length - 0.25 * extra - 0.12 * missing));
      }
    }
  }

  const flat = [1, 3, 6, 8, 10].includes(bestRoot) || bass === 10 || bass === 1;
  const rootName = midiToName(bestRoot + 48, flat).replace(/\d/g, "");
  const want = bestTpl.semitones.map((s) => (bestRoot + s) % 12);
  const isInversion = bass !== bestRoot && want.includes(bass);
  const bassName = isInversion ? midiToName(bass + 48, flat).replace(/\d/g, "") : null;

  return {
    symbol: `${rootName}${bestTpl.label}${bassName ? "/" + bassName : ""}`,
    root: rootName,
    quality: bestTpl.label,
    bass: bassName,
    pcs: want,
    confidence: bestConf,
  };
}

/* ------------------------------------------------------------------ *
 * 统一入口
 * ------------------------------------------------------------------ */
export function parseInput(text: string, mode: InputMode, base?: Song): ParseResult {
  const detected = mode === "auto" ? detectMode(text) : (mode as "chord" | "tab");
  const res = detected === "tab" ? parseTab(text, base) : parseChordChart(text, base);
  return { ...res, detected };
}
