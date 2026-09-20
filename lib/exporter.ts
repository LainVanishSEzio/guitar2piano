/* =========================================================================
 * 导出：MIDI / MusicXML / PNG / 文本和弦进行
 * ========================================================================= */
import { Midi } from "@tonejs/midi";
import type { ChordEvent, Song, Voicing } from "./types";
import { transposeChordSymbol } from "./music";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* ------------------------------- MIDI ------------------------------- */
export function exportMidi(
  song: Song,
  voicings: Voicing[],
  transpose: number,
  bpm: number,
  filename = "guitar2piano.mid",
) {
  const midi = new Midi();
  midi.header.setTempo(bpm);
  midi.header.timeSignatures.push({
    ticks: 0,
    timeSignature: [song.timeSignature[0], song.timeSignature[1]],
  } as any);
  midi.header.name = song.title || "Guitar2Piano";

  const right = midi.addTrack();
  right.name = "Piano Right";
  right.instrument.name = "acoustic grand piano";
  const left = midi.addTrack();
  left.name = "Piano Left";
  left.instrument.name = "acoustic grand piano";

  const spb = 60 / bpm;
  let t = 0;
  song.events.forEach((ev, i) => {
    const v = voicings[i];
    if (!v) return;
    const dur = Math.max(0.1, ev.beats * spb * 0.95);
    v.rh.forEach((n) => right.addNote({ midi: n.midi, time: t, duration: dur, velocity: 0.78 }));
    v.lh.forEach((n) => left.addNote({ midi: n.midi, time: t, duration: dur, velocity: 0.62 }));
    t += ev.beats * spb;
  });

  download(new Blob([midi.toArray() as unknown as BlobPart], { type: "audio/midi" }), filename);
}

/* ----------------------------- MusicXML ----------------------------- */
const FIFTHS: Record<string, number> = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  "F#": 6,
  "C#": 7,
  F: -1,
  Bb: -2,
  Eb: -3,
  Ab: -4,
  Db: -5,
  Gb: -6,
};

function relativeMajorOf(key: string): string {
  const m = key.match(/^([A-G][#b]?)m?$/);
  if (!m) return "C";
  const isMinor = key.endsWith("m") && key.length > 1;
  if (!isMinor) return m[1];
  const map: Record<string, string> = {
    A: "C",
    E: "G",
    B: "D",
    "F#": "A",
    "C#": "E",
    "G#": "B",
    "D#": "F#",
    "A#": "C#",
    D: "F",
    G: "Bb",
    C: "Eb",
    F: "Ab",
    Bb: "Db",
    Eb: "Gb",
  };
  return map[m[1]] ?? "C";
}

function pitchXml(name: string): string {
  const m = name.match(/^([A-G])([#b]?)(-?\d)$/);
  if (!m) return "<step>C</step><octave>4</octave>";
  const alter = m[2] === "#" ? "<alter>1</alter>" : m[2] === "b" ? "<alter>-1</alter>" : "";
  return `<step>${m[1]}</step>${alter}<octave>${m[3]}</octave>`;
}

function typeOf(quarters: number): string {
  const t: [number, string][] = [
    [4, "whole"],
    [3, "half"],
    [2, "half"],
    [1.5, "quarter"],
    [1, "quarter"],
    [0.75, "eighth"],
    [0.5, "eighth"],
    [0.25, "16th"],
  ];
  let best = t[4];
  let d = Infinity;
  for (const e of t) if (Math.abs(e[0] - quarters) < d) { d = Math.abs(e[0] - quarters); best = e; }
  return best[1];
}

export function buildMusicXml(
  song: Song,
  voicings: Voicing[],
  transpose: number,
  bpm: number,
): string {
  const rel = relativeMajorOf(song.key);
  const fifths = FIFTHS[rel] ?? 0;
  const mode = song.key.endsWith("m") ? "minor" : "major";
  const divisions = 4; // 每四分音符

  const measures: string[] = [];
  song.events.forEach((ev, i) => {
    const v = voicings[i];
    const dur = Math.max(1, Math.round(ev.beats * divisions));
    const noteType = typeOf(ev.beats);
    const attr =
      i === 0
        ? `<attributes>
        <divisions>${divisions}</divisions>
        <key><fifths>${fifths}</fifths><mode>${mode}</mode></key>
        <time><beats>${song.timeSignature[0]}</beats><beat-type>${song.timeSignature[1]}</beat-type></time>
        <staves>2</staves>
        <clef number="1"><sign>G</sign><line>2</line></clef>
        <clef number="2"><sign>F</sign><line>4</line></clef>
      </attributes>
      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${bpm}</per-minute></metronome></direction-type><sound tempo="${bpm}"/></direction>`
        : "";

    const rhNotes = (v?.rh ?? [])
      .map(
        (n, k) =>
          `<note>${k > 0 ? "<chord/>" : ""}<pitch>${pitchXml(n.name)}</pitch><duration>${dur}</duration><voice>1</voice><type>${noteType}</type><staff>1</staff></note>`,
      )
      .join("\n      ");

    const lhNotes = (v?.lh ?? [])
      .map(
        (n, k) =>
          `<note>${k > 0 ? "<chord/>" : ""}<pitch>${pitchXml(n.name)}</pitch><duration>${dur}</duration><voice>2</voice><type>${noteType}</type><staff>2</staff></note>`,
      )
      .join("\n      ");

    const body = [rhNotes, `<backup><duration>${dur}</duration></backup>`, lhNotes]
      .filter(Boolean)
      .join("\n      ");

    measures.push(
      `    <measure number="${i + 1}">\n      ${attr}\n      ${body}\n    </measure>`,
    );
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.1">
  <work><work-title>${escapeXml(song.title || "Guitar2Piano")}</work-title></work>
  <identification>
    <creator type="composer">Guitar2Piano</creator>
    <encoding><software>Guitar2Piano Web</software></encoding>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Piano</part-name>
      <score-instrument id="P1-I1"><instrument-name>Piano</instrument-name></score-instrument>
      <midi-instrument id="P1-I1"><midi-channel>1</midi-channel><midi-program>1</midi-program><volume>80</volume><pan>0</pan></midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
${measures.join("\n")}
  </part>
</score-partwise>`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string);
}

export function exportMusicXml(
  song: Song,
  voicings: Voicing[],
  transpose: number,
  bpm: number,
  filename = "guitar2piano.musicxml",
) {
  const xml = buildMusicXml(song, voicings, transpose, bpm);
  download(new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" }), filename);
}

/* ------------------------------- PNG -------------------------------- */
export async function exportPng(svgHost: HTMLElement, filename = "guitar2piano.png") {
  const svg = svgHost.querySelector("svg");
  if (!svg) throw new Error("没有找到五线谱 SVG");
  const clone = svg.cloneNode(true) as SVGElement;
  const bb = (svg as any).getBBox?.();
  const w = Math.ceil(svg.clientWidth || svg.getBoundingClientRect().width || 900);
  const h = Math.ceil(svg.clientHeight || svg.getBoundingClientRect().height || 400);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  const src = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const svgBlob = new Blob([src], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("SVG 转换失败"));
    img.src = url;
  });

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建 Canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
  if (blob) download(blob, filename);
  void bb;
}

/* ----------------------------- 文本导出 ------------------------------ */
export function chordProgressionText(events: ChordEvent[], transpose: number, perLine = 8): string {
  const syms = events.map((e) => transposeChordSymbol(e.symbol, transpose));
  const lines: string[] = [];
  for (let i = 0; i < syms.length; i += perLine) {
    lines.push(syms.slice(i, i + perLine).join("  "));
  }
  return lines.join("\n");
}

export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(
      () => true,
      () => false,
    );
  }
  return Promise.resolve(false);
}
