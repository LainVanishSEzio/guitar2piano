/* =========================================================================
 * VexFlow 大谱表渲染（右手高音谱表 + 左手低音谱表）
 * ========================================================================= */
import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  StaveConnector,
  Dot,
} from "vexflow";
import type { VoicedNote, Voicing } from "./types";

export interface StaffMeasure {
  symbol: string;
  beats: number;
  lh: VoicedNote[];
  rh: VoicedNote[];
}

export interface StaffOptions {
  measures: StaffMeasure[];
  key: string;
  timeSignature: [number, number];
  width: number;
  measuresPerRow: number;
  /** 高亮的当前小节索引 */
  activeIndex?: number;
  title?: string;
  subtitle?: string;
}

const INK = "#1b1c1f";
const INK_SOFT = "#4b5563";
const HIGHLIGHT = "#6d5cf6";

/** VexFlow key： "F#4" → "f#/4"； "Bb3" → "bb/3" */
function toVexKey(name: string): string {
  const m = name.match(/^([A-Ga-g])([#b♯♭]?)(-?\d)$/);
  if (!m) return "b/4";
  const letter = m[1].toLowerCase();
  const acc = (m[2] || "").replace("♯", "#").replace("♭", "b");
  return `${letter}${acc}/${m[3]}`;
}

const DUR_TABLE: { beats: number; d: string; dots: number }[] = [
  { beats: 4, d: "w", dots: 0 },
  { beats: 3, d: "h", dots: 1 },
  { beats: 2, d: "h", dots: 0 },
  { beats: 1.5, d: "q", dots: 1 },
  { beats: 1, d: "q", dots: 0 },
  { beats: 0.75, d: "8", dots: 1 },
  { beats: 0.5, d: "8", dots: 0 },
  { beats: 0.25, d: "16", dots: 0 },
];

function toDuration(beats: number) {
  let best = DUR_TABLE[0];
  let bestDiff = Infinity;
  for (const e of DUR_TABLE) {
    const diff = Math.abs(e.beats - beats);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = e;
    }
  }
  return best;
}

/** 把小调调号换算成关系大调，供 VexFlow 使用 */
export function displayKeySignature(key: string): string {
  const m = key.match(/^([A-G][#b]?)(m)?$/);
  if (!m) return "C";
  if (!m[2]) return m[1];
  const map: Record<string, string> = {
    C: "Eb",
    "C#": "E",
    D: "F",
    "D#": "F#",
    E: "G",
    F: "Ab",
    "F#": "A",
    G: "Bb",
    "G#": "B",
    A: "C",
    "A#": "C#",
    B: "D",
  };
  const k = m[1].replace("♭", "b").replace("♯", "#");
  return map[k] ?? "C";
}

export function renderStaff(container: HTMLDivElement, opts: StaffOptions): void {
  const { measures, timeSignature, key, width, measuresPerRow } = opts;
  container.innerHTML = "";
  if (!measures.length || width < 100) return;

  const mpr = Math.max(1, Math.min(measuresPerRow, measures.length));
  const rows = Math.ceil(measures.length / mpr);
  const rowHeight = 158;
  const headerHeight = (opts.title || opts.subtitle) ? 46 : 10;
  const height = headerHeight + rows * rowHeight + 16;

  const renderer = new Renderer(container, Renderer.Backends.SVG);
  renderer.resize(Math.max(width, 200), height);
  const ctx = renderer.getContext();
  ctx.clear();
  ctx.setFillStyle(INK);
  ctx.setStrokeStyle(INK);

  // 标题
  if (opts.title) {
    try {
      ctx.setFont("Helvetica", 18, "bold");
      ctx.fillText(opts.title, 8, 22);
    } catch {
      /* noop */
    }
  }
  if (opts.subtitle) {
    try {
      ctx.setFont("Helvetica", 11, "normal");
      ctx.setFillStyle(INK_SOFT);
      ctx.fillText(opts.subtitle, 8, 38);
      ctx.setFillStyle(INK);
    } catch {
      /* noop */
    }
  }

  const keySpec = displayKeySignature(key);
  const leftPad = 6;
  const usable = width - leftPad - 8;
  const measureW = usable / mpr;

  for (let r = 0; r < rows; r++) {
    const rowTop = headerHeight + r * rowHeight;
    const trebleY = rowTop + 34;
    const bassY = trebleY + 78;
    const rowMeasures = measures.slice(r * mpr, (r + 1) * mpr);

    const trebleStaves: any[] = [];
    const bassStaves: any[] = [];

    rowMeasures.forEach((m, i) => {
      const x = leftPad + i * measureW;
      const isFirst = r === 0 && i === 0;

      const ts = new Stave(x, trebleY, measureW);
      const bs = new Stave(x, bassY, measureW);
      if (i === 0) {
        ts.addClef("treble");
        bs.addClef("bass");
      }
      if (isFirst) {
        ts.addKeySignature(keySpec);
        bs.addKeySignature(keySpec);
        ts.addTimeSignature(`${timeSignature[0]}/${timeSignature[1]}`);
        bs.addTimeSignature(`${timeSignature[0]}/${timeSignature[1]}`);
      }
      ts.setContext(ctx).draw();
      bs.setContext(ctx).draw();

      // 大谱表连谱号与纵线
      try {
        const type: any = (StaveConnector as any).type ?? {};
        if (i === 0) {
          new StaveConnector(ts as any, bs as any)
            .setType(type.BRACE ?? 3)
            .setContext(ctx)
            .draw();
          new StaveConnector(ts as any, bs as any)
            .setType(type.SINGLE_LEFT ?? 1)
            .setContext(ctx)
            .draw();
        }
        if (i === rowMeasures.length - 1) {
          new StaveConnector(ts as any, bs as any)
            .setType(type.SINGLE_RIGHT ?? 0)
            .setContext(ctx)
            .draw();
        }
      } catch {
        /* noop */
      }

      trebleStaves.push(ts);
      bassStaves.push(bs);
    });

    // 逐小节排版
    rowMeasures.forEach((m, i) => {
      const globalIndex = r * mpr + i;
      const isActive = opts.activeIndex === globalIndex;
      const fill = isActive ? HIGHLIGHT : INK;

      const tNotes: any[] = [];
      const bNotes: any[] = [];

      try {
        const { d, dots } = toDuration(m.beats);
        const rhKeys = (m.rh.length ? m.rh : [{ name: "b/4" } as any]).map((n: VoicedNote) => toVexKey(n.name));
        const lhKeys = (m.lh.length ? m.lh : [{ name: "b/3" } as any]).map((n: VoicedNote) => toVexKey(n.name));

        const tn = new StaveNote({ keys: rhKeys, duration: d, clef: "treble" });
        const bn = new StaveNote({ keys: lhKeys, duration: d, clef: "bass" });
        if (dots) {
          Dot.buildAndAttach([tn, bn], { all: true } as any);
        }
        tn.setStyle({ fillStyle: fill, strokeStyle: fill });
        bn.setStyle({ fillStyle: fill, strokeStyle: fill });
        tn.setStemDirection(1);
        bn.setStemDirection(-1);
        tNotes.push(tn);
        bNotes.push(bn);

        // beats 以四分音符为基准，Voice 统一用 4 分音符为单位
        const numBeats = Math.max(1, Math.round(m.beats));
        const tv: any = new Voice({ num_beats: numBeats, beat_value: 4 });
        const bv: any = new Voice({ num_beats: numBeats, beat_value: 4 });
        tv.setMode((Voice as any).Mode?.SOFT ?? 2);
        bv.setMode((Voice as any).Mode?.SOFT ?? 2);
        tv.addTickables(tNotes);
        bv.addTickables(bNotes);

        const fmt = new Formatter();
        fmt.joinVoices([tv]).joinVoices([bv]);
        fmt.format([tv, bv], measureW - 24);

        try {
          Accidental.applyAccidentals([tv], keySpec);
          Accidental.applyAccidentals([bv], keySpec);
        } catch {
          /* noop */
        }

        tv.draw(ctx, trebleStaves[i]);
        bv.draw(ctx, bassStaves[i]);

        // 和弦符号（手写绘制，避免依赖版本差异）
        try {
          const x = (tNotes[0] as any).getAbsoluteX?.() ?? trebleStaves[i].getX();
          const y = trebleY - 12;
          ctx.save();
          ctx.setFont("Helvetica", 13, "bold");
          ctx.setFillStyle(isActive ? HIGHLIGHT : "#111827");
          ctx.fillText(m.symbol || "", x - 4, y);
          ctx.restore();
        } catch {
          /* noop */
        }
      } catch {
        /* 单小节渲染失败不影响整体 */
      }
    });
  }
}

/** 估算需要的容器高度（用于给容器占位，避免布局跳动） */
export function estimateHeight(count: number, measuresPerRow: number): number {
  const rows = Math.ceil(count / Math.max(1, measuresPerRow));
  return 56 + rows * 158;
}

export type { Voicing };
