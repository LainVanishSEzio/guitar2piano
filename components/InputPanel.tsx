"use client";

import { useRef, useState } from "react";
import { FileText, Music4, Wand2, AlertTriangle, Info, XCircle, Upload } from "lucide-react";
import { useStore } from "@/store/useStore";
import { EXAMPLES } from "@/lib/examples";
import type { InputMode } from "@/lib/types";

const MODES: { id: InputMode; label: string }[] = [
  { id: "auto", label: "自动" },
  { id: "chord", label: "和弦名谱" },
  { id: "tab", label: "六线谱" },
];

export default function InputPanel() {
  const input = useStore((s) => s.input);
  const mode = useStore((s) => s.mode);
  const issues = useStore((s) => s.issues);
  const detected = useStore((s) => s.detected);
  const setInput = useStore((s) => s.setInput);
  const setMode = useStore((s) => s.setMode);
  const runParse = useStore((s) => s.runParse);
  const loadExample = useStore((s) => s.loadExample);
  const song = useStore((s) => s.song);

  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      setInput(String(r.result ?? ""));
      setTimeout(runParse, 30);
    };
    r.readAsText(f);
  };

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-head">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-brand-400" />
          吉他谱输入
        </span>
        <span className="text-[11px] font-normal text-slate-500">
          {song ? `已解析 ${song.events.length} 个和弦` : "尚未解析"}
        </span>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              className={`chip ${mode === m.id ? "chip-on" : ""}`}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
          {song && (
            <span className="ml-auto rounded bg-ink-800 px-1.5 py-0.5 text-[11px] text-slate-400">
              识别为：{detected === "tab" ? "六线谱" : "和弦名谱"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button
              key={e.id}
              className="chip flex items-center gap-1"
              title={e.desc}
              onClick={() => loadExample(e.id)}
            >
              <Music4 className="h-3 w-3 opacity-70" />
              {e.name}
            </button>
          ))}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`relative rounded-lg border border-dashed transition ${
            drag ? "border-brand-400 bg-brand-500/10" : "border-white/10"
          }`}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            placeholder={"粘贴吉他谱，例如：\n| C | G | Am | F |\n\n或六线谱：\ne|-0---|\nB|-1---|\nG|-0---|\nD|-2---|\nA|-3---|\nE|-----|\n\n指令：capo: 2  bpm: 92  time: 3/4  key: G"}
            className="h-[210px] w-full resize-y rounded-lg bg-ink-850/80 p-2.5 font-mono text-[12px] leading-[1.6] text-slate-200 outline-none placeholder:text-slate-600 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-primary" onClick={runParse}>
            <Wand2 className="h-3.5 w-3.5" />
            解析并转换
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            导入文本
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.tab,.text,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <span className="text-[11px] text-slate-500">支持 .txt 拖放（图片 OCR 规划中）</span>
        </div>

        {issues.length > 0 && (
          <ul className="max-h-[120px] space-y-1 overflow-y-auto rounded-lg border border-white/[0.06] bg-ink-850/60 p-2">
            {issues.slice(0, 40).map((it, i) => (
              <li
                key={i}
                className={`flex items-start gap-1.5 text-[11.5px] leading-snug ${
                  it.level === "error"
                    ? "text-rose-300"
                    : it.level === "warn"
                      ? "text-amber-300"
                      : "text-slate-400"
                }`}
              >
                {it.level === "error" ? (
                  <XCircle className="mt-[1px] h-3 w-3 shrink-0" />
                ) : it.level === "warn" ? (
                  <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" />
                ) : (
                  <Info className="mt-[1px] h-3 w-3 shrink-0" />
                )}
                <span>
                  {it.line ? `第 ${it.line} 行：` : ""}
                  {it.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
