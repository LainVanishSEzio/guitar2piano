"use client";

import { Sliders, RotateCw, GitBranch } from "lucide-react";
import { useStore } from "@/store/useStore";
import type { LeftHandMode, VoicingStyle } from "@/lib/types";

const STYLES: { id: VoicingStyle; label: string; desc: string }[] = [
  { id: "block", label: "柱式", desc: "三/七和弦密排列，弹唱最常用" },
  { id: "jazz", label: "爵士", desc: "Rootless + drop2，右手无根音" },
  { id: "shell", label: "壳体", desc: "只保留 3 音与 7 音" },
  { id: "open", label: "开放", desc: "drop2 + 加九，音色开阔" },
  { id: "worship", label: "敬拜", desc: "八度左手 + 色彩音" },
  { id: "arpeggio", label: "琶音", desc: "播放时依次展开" },
];

const LH: { id: LeftHandMode; label: string }[] = [
  { id: "root", label: "单根音" },
  { id: "root5", label: "根音+五度" },
  { id: "rootOct", label: "根音+八度" },
  { id: "octaves", label: "八度叠加" },
  { id: "none", label: "无左手" },
];

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

export default function SettingsPanel() {
  const song = useStore((s) => s.song);
  const voicing = useStore((s) => s.voicing);
  const setVoicing = useStore((s) => s.setVoicing);
  const transpose = useStore((s) => s.transpose);
  const setTranspose = useStore((s) => s.setTranspose);
  const concert = useStore((s) => s.concertPitch);
  const setConcert = useStore((s) => s.setConcertPitch);
  const setCapo = useStore((s) => s.setCapo);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="flex items-center gap-1.5">
          <Sliders className="h-3.5 w-3.5 text-brand-400" />
          转换设置
        </span>
      </div>

      <div className="space-y-3 p-3">
        {/* 移调 / capo */}
        <div>
          <div className="label flex items-center gap-1">
            <RotateCw className="h-3 w-3" /> 移调
          </div>
          <div className="flex items-center gap-2">
            <button className="btn px-2" onClick={() => setTranspose(transpose - 1)}>
              −
            </button>
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={transpose}
              onChange={(e) => setTranspose(parseInt(e.target.value, 10))}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
            />
            <button className="btn px-2" onClick={() => setTranspose(transpose + 1)}>
              +
            </button>
            <span className="tabular w-14 text-center text-[13px] font-semibold text-white">
              {transpose > 0 ? `+${transpose}` : transpose}
            </span>
          </div>
        </div>

        <Row>
          <div>
            <div className="label">变调夹 Capo</div>
            <select
              className="field"
              value={song?.capo ?? 0}
              onChange={(e) => setCapo(parseInt(e.target.value, 10))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {i === 0 ? "无" : `第 ${i} 品`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">音高显示</div>
            <button
              className={`btn w-full justify-center ${
                concert ? "border-brand-500/60 bg-brand-500/20 text-white" : ""
              }`}
              onClick={() => setConcert(!concert)}
            >
              {concert ? "实际音高" : "记谱音高"}
            </button>
          </div>
        </Row>

        {/* 风格 */}
        <div>
          <div className="label">Voicing 风格</div>
          <div className="grid grid-cols-3 gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                title={s.desc}
                className={`chip text-center ${voicing.style === s.id ? "chip-on" : ""}`}
                onClick={() => setVoicing({ style: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 左手 */}
        <div>
          <div className="label">左手</div>
          <div className="grid grid-cols-3 gap-1.5">
            {LH.map((l) => (
              <button
                key={l.id}
                className={`chip ${voicing.leftHand === l.id ? "chip-on" : ""}`}
                onClick={() => setVoicing({ leftHand: l.id })}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 转位 */}
        <div>
          <div className="label flex items-center gap-1">
            <GitBranch className="h-3 w-3" /> 转位
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {["auto", 0, 1, 2, 3].map((v) => (
              <button
                key={String(v)}
                className={`chip text-center ${voicing.inversion === v ? "chip-on" : ""}`}
                onClick={() => setVoicing({ inversion: v as never })}
              >
                {v === "auto" ? "自动" : Number(v) + 1}
              </button>
            ))}
          </div>
        </div>

        {/* 开关 */}
        <div className="grid grid-cols-2 gap-1.5">
          <Toggle
            on={voicing.add9}
            label="加九音"
            onClick={() => setVoicing({ add9: !voicing.add9 })}
          />
          <Toggle
            on={voicing.omit5}
            label="省略五音"
            onClick={() => setVoicing({ omit5: !voicing.omit5 })}
          />
          <Toggle
            on={voicing.drop2}
            label="Drop 2"
            onClick={() => setVoicing({ drop2: !voicing.drop2 })}
          />
          <Toggle
            on={voicing.rhOctave !== 0}
            label={`右手八度 ${voicing.rhOctave >= 0 ? "+" : ""}${voicing.rhOctave}`}
            onClick={() => setVoicing({ rhOctave: voicing.rhOctave === 0 ? 1 : 0 })}
          />
        </div>

        {/* 音区 */}
        <div>
          <div className="label">右手音区上限 {voicing.rhHigh}</div>
          <input
            type="range"
            min={60}
            max={88}
            value={voicing.rhHigh}
            onChange={(e) => setVoicing({ rhHigh: parseInt(e.target.value, 10) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
          />
        </div>
        <div>
          <div className="label">最大跨度（半音）{voicing.maxSpan}</div>
          <input
            type="range"
            min={7}
            max={19}
            value={voicing.maxSpan}
            onChange={(e) => setVoicing({ maxSpan: parseInt(e.target.value, 10) })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
          />
        </div>
        <div>
          <div className="label">声部平滑度 {Math.round(voicing.smoothness * 100)}%</div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(voicing.smoothness * 100)}
            onChange={(e) => setVoicing({ smoothness: parseInt(e.target.value, 10) / 100 })}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-500"
          />
        </div>
      </div>
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chip flex items-center justify-center gap-1.5 ${on ? "chip-on" : ""}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${on ? "bg-brand-400" : "bg-slate-600"}`}
      />
      {label}
    </button>
  );
}
