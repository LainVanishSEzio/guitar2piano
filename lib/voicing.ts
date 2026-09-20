/* =========================================================================
 * 吉他和弦 → 钢琴 voicing（声部连接 / 转位 / 音区约束）
 * ========================================================================= */
import { pcOf, nameOfPc, midiToName, keyUsesFlat } from "./music";
import type { ChordEvent, VoicedNote, Voicing, VoicingSettings } from "./types";

export const DEFAULT_VOICING: VoicingSettings = {
  style: "block",
  inversion: "auto",
  rhOctave: 0,
  lhOctave: 0,
  rhLow: 60, // C4
  rhHigh: 79, // G5
  lhLow: 36, // C2
  lhHigh: 52, // E3
  maxSpan: 12,
  add9: false,
  omit5: false,
  drop2: false,
  leftHand: "root",
  smoothness: 0.8,
};

interface Tone {
  pc: number;
  name: string;
  /** 相对根音的半音（0-11，或 14 表示九音） */
  interval: number;
}

function shiftPc(pc: number, t: number) {
  return ((pc + t) % 12 + 12) % 12;
}

/** 音名移调（尽量保留升/降拼写） */
function shiftName(name: string, t: number) {
  const flat = name.includes("b") || name.includes("♭");
  return nameOfPc(shiftPc(pcOf(name), t), flat);
}

/** 取某个 pc 在 [lo,hi] 内、距 ref 最近的音高 */
function nearestWithPc(pc: number, lo: number, hi: number, ref: number): number {
  let best = lo + (((pc - lo) % 12) + 12) % 12;
  if (best < lo) best += 12;
  let bestDist = Math.abs(best - ref);
  for (let m = best; m <= hi; m += 12) {
    const d = Math.abs(m - ref);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

/** 从根音 + 有序音程列表构造右手密排列 */
function buildStack(rootPc: number, intervals: number[], lo: number, hi: number): number[] {
  if (!intervals.length) return [];
  const firstPc = (rootPc + intervals[0]) % 12;
  let prev = lo + (((firstPc - lo) % 12) + 12) % 12;
  if (prev < lo) prev += 12;
  const seq: number[] = [];
  seq.push(prev);
  for (let i = 1; i < intervals.length; i++) {
    const pc = (rootPc + intervals[i]) % 12;
    const m = prev + 1 + (((pc - (prev + 1)) % 12) + 12) % 12;
    seq.push(m);
    prev = m;
  }
  while (seq[0] < lo) for (let i = 0; i < seq.length; i++) seq[i] += 12;
  while (seq[seq.length - 1] > hi && seq[0] - 12 >= lo)
    for (let i = 0; i < seq.length; i++) seq[i] -= 12;
  return seq;
}

/** drop2：次高音降八度（并重新排序） */
function applyDrop2(seq: number[]): number[] {
  if (seq.length < 3) return seq;
  const s = [...seq].sort((a, b) => a - b);
  s[s.length - 2] -= 12;
  return s.sort((a, b) => a - b);
}

/** 修复过大跨度：反复把次高音降八度 */
function fixSpan(seq: number[], maxSpan: number, lo: number): number[] {
  let s = [...seq].sort((a, b) => a - b);
  let guard = 0;
  while (s[s.length - 1] - s[0] > maxSpan && guard++ < 4) {
    const idx = s.length - 2;
    if (s[idx] - 12 < lo) break;
    s[idx] -= 12;
    s = s.sort((a, b) => a - b);
  }
  return s;
}

function uniqueSorted(arr: number[]) {
  return Array.from(new Set(arr)).sort((a, b) => a - b);
}

export interface RhCandidate {
  notes: number[];
  inv: number;
}

/** 生成右手候选排列 */
function rhCandidates(
  rootPc: number,
  intervals: number[],
  s: VoicingSettings,
  forceInv?: number,
): RhCandidate[] {
  const lo = s.rhLow + s.rhOctave * 12;
  const hi = s.rhHigh + s.rhOctave * 12;
  const base = [...intervals].sort((a, b) => a - b);
  const list: RhCandidate[] = [];
  const invs = forceInv != null ? [forceInv % base.length] : base.map((_, i) => i);
  for (const inv of invs) {
    const rotated = [...base.slice(inv), ...base.slice(0, inv)];
    const stack = buildStack(rootPc, rotated, lo, hi);
    if (stack.length) list.push({ notes: stack, inv });
    if (s.drop2 || s.style === "open" || s.style === "jazz") {
      const applied = fixSpan(applyDrop2(buildStack(rootPc, rotated, lo, hi)), s.maxSpan, lo);
      if (applied.length) list.push({ notes: applied, inv });
    }
  }
  // 去重
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = uniqueSorted(c.notes).join(",");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function scoreCandidate(cand: RhCandidate, prev: number[] | null, s: VoicingSettings) {
  const c = uniqueSorted(cand.notes);
  const lo = s.rhLow + s.rhOctave * 12;
  const hi = s.rhHigh + s.rhOctave * 12;
  const max = c[c.length - 1];
  const min = c[0];
  const span = max - min;
  const spanPenalty = Math.max(0, span - s.maxSpan);
  const rangePenalty = Math.max(0, lo - min) + Math.max(0, max - hi);

  let motion = 0;
  let common = 0;
  if (prev && prev.length) {
    const p = uniqueSorted(prev);
    for (const n of c) {
      let d = Infinity;
      for (const q of p) d = Math.min(d, Math.abs(n - q));
      motion += d;
      if (p.includes(n)) common++;
    }
  } else {
    // 无前值：偏好音区居中、排列紧凑
    motion = Math.abs((min + max) / 2 - (lo + hi) / 2) * 0.25;
  }
  const smooth = s.smoothness;
  // 无前值时偏好原位（低转位序号）与居中音区
  const rootBias = prev ? 0 : cand.inv * 1.6;
  return (
    motion * (0.4 + smooth) +
    (c.length - common) * 2.4 * (prev ? 1 : 0) +
    spanPenalty * 3 +
    rangePenalty * 10 +
    span * 0.05 +
    rootBias
  );
}

/** 单个和弦 → voicing */
export function voiceChord(
  ev: ChordEvent,
  prevRh: number[] | null,
  prevBass: number | null,
  s: VoicingSettings,
  transpose: number,
): Voicing {
  const empty: Voicing = { lh: [], rh: [], inversion: 0, bass: { midi: 60, name: "C4", pc: 0 } };
  if (!ev.pcs || !ev.pcs.length) return empty;

  const rootPc = shiftPc(pcOf(ev.root), transpose);
  const useFlat = keyUsesFlat(ev.root) || ev.root.includes("b");

  // 组成音（保留拼写）
  let tones: Tone[] = ev.notes.map((n) => {
    const shifted = shiftName(n, transpose);
    return { pc: pcOf(shifted), name: shifted, interval: (pcOf(shifted) - rootPc + 12) % 12 };
  });
  const rootName = shiftName(ev.root, transpose);

  // 重复音去重（按 interval）
  const seenIv = new Set<number>();
  tones = tones.filter((t) => {
    if (seenIv.has(t.interval)) return false;
    seenIv.add(t.interval);
    return true;
  });

  // 加九音
  if (s.add9 || s.style === "worship" || s.style === "open") {
    const nineIv = 2; // 大九（小和弦也用小二度上面的大九更常用）
    if (!tones.some((t) => t.interval === nineIv)) {
      const name = nameOfPc((rootPc + nineIv) % 12, useFlat);
      tones.push({ pc: (rootPc + nineIv) % 12, name, interval: nineIv });
    }
  }

  // 省略五音
  if (s.omit5 && tones.length >= 4) {
    const filtered = tones.filter((t) => t.interval !== 7);
    if (filtered.length >= 3) tones = filtered;
  }

  let intervals = tones.map((t) => t.interval).sort((a, b) => a - b);

  // 风格处理
  if (s.style === "jazz") {
    // rootless：去掉根音，保留 3/7/9/13(5)
    const noRoot = intervals.filter((iv) => iv !== 0);
    if (noRoot.length >= 2) intervals = noRoot;
  }
  if (s.style === "shell") {
    const shell = intervals.filter((iv) => iv === 3 || iv === 4 || iv === 10 || iv === 11);
    if (shell.length >= 2) intervals = shell;
  }

  // 转位
  const forceInv =
    typeof s.inversion === "number" ? Math.min(s.inversion, intervals.length - 1) : undefined;

  let cands = rhCandidates(rootPc, intervals, s, forceInv);
  if (!cands.length)
    cands = [
      {
        notes: buildStack(rootPc, intervals, s.rhLow + s.rhOctave * 12, s.rhHigh + s.rhOctave * 12),
        inv: 0,
      },
    ];
  cands = cands.map((c) => ({
    notes: fixSpan(c.notes, s.maxSpan, s.rhLow + s.rhOctave * 12 - 5),
    inv: c.inv,
  }));

  let best = cands[0];
  let bestScore = Infinity;
  for (const c of cands) {
    const sc = scoreCandidate(c, prevRh, s);
    if (sc < bestScore) {
      bestScore = sc;
      best = c;
    }
  }

  const rhMidis = uniqueSorted(best.notes).filter((m) => m >= 0 && m <= 108);

  // 右手音名拼写
  const nameByPc = new Map<number, string>();
  tones.forEach((t) => nameByPc.set(t.pc, t.name));
  const rh: VoicedNote[] = rhMidis.map((m) => {
    const pc = ((m % 12) + 12) % 12;
    const base = nameByPc.get(pc) ?? nameOfPc(pc, useFlat);
    return { midi: m, name: `${base}${Math.floor(m / 12) - 1}`, pc };
  });

  // 左手：根音或转位低音
  const bassPc = ev.bass ? shiftPc(pcOf(ev.bass), transpose) : rootPc;
  const bassName = ev.bass ? shiftName(ev.bass, transpose) : rootName;
  const lhLo = s.lhLow + s.lhOctave * 12;
  const lhHi = s.lhHigh + s.lhOctave * 12;
  const ref = prevBass ?? (lhLo + lhHi) / 2;
  let bassMidi = nearestWithPc(bassPc, lhLo, lhHi, ref);
  // 低音级进：在合法音区内换八度，取距前一个低音最近的
  if (prevBass != null) {
    const alt = [bassMidi - 12, bassMidi + 12].filter((m) => m >= lhLo && m <= lhHi);
    for (const a of alt) if (Math.abs(a - prevBass) < Math.abs(bassMidi - prevBass)) bassMidi = a;
  }

  let lhMidis: number[] = [];
  const mode =
    s.style === "worship" ? "octaves" : s.leftHand;
  if (mode === "root") lhMidis = [bassMidi];
  else if (mode === "root5") lhMidis = [bassMidi, bassMidi + 7];
  else if (mode === "rootOct") lhMidis = [bassMidi, bassMidi + 12];
  else if (mode === "octaves") lhMidis = [bassMidi, bassMidi + 12];
  else lhMidis = [];

  const lh: VoicedNote[] = lhMidis.map((m) => {
    const pc = ((m % 12) + 12) % 12;
    const base = pc === bassPc ? bassName : nameByPc.get(pc) ?? nameOfPc(pc, useFlat);
    return { midi: m, name: `${base}${Math.floor(m / 12) - 1}`, pc };
  });

  // 计算实际转位（以最低右手音相对根音的音程判定）
  const lowestRh = rhMidis[0] ?? bassMidi;
  const lowestIv = ((lowestRh - rootPc) % 12 + 12) % 12;
  const invIndex = intervals.findIndex((iv) => iv % 12 === lowestIv);

  return {
    lh,
    rh,
    inversion: invIndex < 0 ? 0 : invIndex,
    bass: { midi: bassMidi, name: `${bassName}${Math.floor(bassMidi / 12) - 1}`, pc: bassPc },
  };
}

/** 整首曲子 → voicing 序列 */
export function voiceSong(
  events: ChordEvent[],
  settings: VoicingSettings,
  transpose: number,
): Voicing[] {
  const out: Voicing[] = [];
  let prevRh: number[] | null = null;
  let prevBass: number | null = null;
  for (const ev of events) {
    let v: Voicing;
    if (ev.voicingOverride && ev.voicingOverride.length) {
      const rh = ev.voicingOverride.map((m) => ({
        midi: m,
        name: midiToName(m),
        pc: ((m % 12) + 12) % 12,
      }));
      v = {
        lh: [],
        rh,
        inversion: 0,
        bass: rh[0] ?? { midi: 60, name: "C4", pc: 0 },
      };
    } else {
      v = voiceChord(ev, prevRh, prevBass, settings, transpose);
    }
    if (v.rh.length) prevRh = v.rh.map((n) => n.midi);
    if (v.bass) prevBass = v.bass.midi;
    out.push(v);
  }
  return out;
}
