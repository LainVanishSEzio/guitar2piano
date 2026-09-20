/* =========================================================================
 * 调性推断与罗马数字级数分析
 * ========================================================================= */
import { pcOf, nameOfPc, keyUsesFlat, transposeChordSymbol } from "./music";
import type { ChordEvent, KeyAnalysis } from "./types";

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10]; // 自然小调（用于级数判定）

const ROMAN_MAJOR = [
  { numeral: "I", quality: "maj" },
  { numeral: "II", quality: "min" },
  { numeral: "III", quality: "min" },
  { numeral: "IV", quality: "maj" },
  { numeral: "V", quality: "maj" },
  { numeral: "VI", quality: "min" },
  { numeral: "VII", quality: "dim" },
];
const ROMAN_MINOR = [
  { numeral: "I", quality: "min" },
  { numeral: "II", quality: "dim" },
  { numeral: "III", quality: "maj" },
  { numeral: "IV", quality: "min" },
  { numeral: "V", quality: "min" },
  { numeral: "VI", quality: "maj" },
  { numeral: "VII", quality: "maj" },
];

interface Candidate {
  key: string;
  tonicPc: number;
  mode: "major" | "minor";
  score: number;
}

function qualityOf(q: string): "maj" | "min" | "dim" | "aug" | "dom" | "other" {
  const s = (q || "").toLowerCase();
  if (s === "" || s === "maj" || s === "6" || s === "maj7" || s === "maj9" || s === "add9") return "maj";
  if (s.startsWith("m") && !s.startsWith("maj")) return s.includes("b5") ? "dim" : "min";
  if (s.startsWith("dim")) return "dim";
  if (s.startsWith("aug") || s === "+") return "aug";
  if (/^[79]/.test(s)) return "dom";
  return "other";
}

export function analyzeKey(events: ChordEvent[], transpose: number): KeyAnalysis {
  if (!events.length) return { key: "C", scale: [], degrees: [], confidence: 0 };

  const evs = events.map((e) => {
    const sym = transposeChordSymbol(e.symbol, transpose);
    const rootPc = (pcOf(e.root) + transpose + 120) % 12;
    return { rootPc, quality: qualityOf(e.quality), sym };
  });

  const candidates: Candidate[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ["major", "minor"] as const) {
      const scale = mode === "major" ? MAJOR : MINOR;
      const pcs = new Set(scale.map((s) => (tonic + s) % 12));
      let score = 0;
      for (const e of evs) {
        if (pcs.has(e.rootPc)) score += 1.4;
        // 属和弦（V）出现加分
        if (mode === "major" && e.rootPc === (tonic + 7) % 12 && (e.quality === "dom" || e.quality === "maj")) score += 1.1;
        if (mode === "minor" && e.rootPc === (tonic + 7) % 12 && (e.quality === "dom" || e.quality === "min")) score += 1.0;
        // 下属
        if (e.rootPc === (tonic + 5) % 12) score += 0.5;
        // 主和弦开头/结尾
      }
      const first = evs[0];
      const last = evs[evs.length - 1];
      if (first && first.rootPc === tonic) score += 1.2;
      if (last && last.rootPc === tonic) score += 1.6;
      const flat = [1, 3, 6, 8, 10].includes(tonic);
      const tonicName = nameOfPc(tonic, flat);
      candidates.push({
        key: mode === "major" ? tonicName : `${tonicName}m`,
        tonicPc: tonic,
        mode,
        score,
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const total = evs.length || 1;
  const confidence = Math.min(1, best.score / (total * 1.6));

  const scale = best.mode === "major" ? MAJOR : MINOR;
  const table = best.mode === "major" ? ROMAN_MAJOR : ROMAN_MINOR;

  const degrees = evs.map((e) => {
    const idx = scale.indexOf(((e.rootPc - best.tonicPc) % 12 + 12) % 12);
    if (idx < 0) return e.sym; // 调外和弦直接显示符号
    let numeral = table[idx].numeral;
    const q = e.quality;
    if (q === "dim") numeral = numeral.replace(/I/g, "I") + (idx === 6 && best.mode === "major" ? "°" : "");
    if (q === "dim") numeral = numeral.includes("°") ? numeral : numeral + "°";
    if (q === "aug") numeral = numeral.toUpperCase() + "+";
    // 大小调错位用大小写表示
    if (q === "min") numeral = numeral.toLowerCase();
    if (q === "maj" && numeral === numeral.toLowerCase()) numeral = numeral.toUpperCase();
    // 七/九/六和弦后缀：小写级数（小三和弦）去掉 m，避免出现 "vim7"
    let suffix = /[679]/.test(e.sym.replace(/^[A-G][#b]?/, "")) ? e.sym.replace(/^[A-G][#b]?/, "") : "";
    if (numeral === numeral.toLowerCase()) suffix = suffix.replace(/^m/, "");
    return `${numeral}${suffix}`;
  });

  return {
    key: best.key,
    scale: scale.map((s) => nameOfPc((best.tonicPc + s) % 12, keyUsesFlat(best.key))),
    degrees,
    confidence,
  };
}
