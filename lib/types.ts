/* =========================================================================
 * Guitar2Piano — 核心数据模型
 * ========================================================================= */

/** MIDI 音高编号，中央 C (C4) = 60 */
export type Midi = number;

/** 音名，如 "C", "F#", "Bb" */
export type NoteName = string;

/** 和弦来源 */
export type ChordSource = "symbol" | "tab" | "manual";

/** 和弦事件（进行中的一个格子） */
export interface ChordEvent {
  id: string;
  /** 原始/当前和弦符号，如 "Cmaj7"、"A/C#" */
  symbol: string;
  /** 根音音名（带变音记号），如 "Bb" */
  root: NoteName;
  /** 和弦品质/后缀，如 "maj7"、"m7"、"7"、"" */
  quality: string;
  /** 转位低音（slash chord 的 /X），如 "C#"；无则 null */
  bass: NoteName | null;
  /** 组成音（音名，含变音拼写），如 ["C","E","G"] */
  notes: NoteName[];
  /** 组成音的 pitch class 数值 0-11 */
  pcs: number[];
  /** 时值（拍） */
  beats: number;
  /** 来源 */
  source: ChordSource;
  /** 用户手动编辑过（解析刷新时不覆盖） */
  locked?: boolean;
  /** 手动 voicing 覆盖（MIDI 数组，右手） */
  voicingOverride?: Midi[] | null;
  /** TAB 推断置信度 0-1 */
  confidence?: number;
  /** 所在小节序号（0 起） */
  bar: number;
  /** 段落标记，如 "Verse" */
  section?: string;
  /** 反复标记 */
  repeatStart?: boolean;
  repeatEnd?: boolean;
}

/** 曲谱 */
export interface Song {
  title: string;
  /** 调号（"C"、"G"、"Am"…），可由和弦推断 */
  key: string;
  /** 拍号 [分子, 分母] */
  timeSignature: [number, number];
  bpm: number;
  /** 变调夹品位 */
  capo: number;
  /** 调弦（低→高）开放音 MIDI */
  tuning: Midi[];
  events: ChordEvent[];
}

/** 一个已定型的音 */
export interface VoicedNote {
  midi: Midi;
  /** 拼写名（含八度），如 "F#4" */
  name: string;
  pc: number;
}

/** 双手 voicing */
export interface Voicing {
  lh: VoicedNote[];
  rh: VoicedNote[];
  /** 使用的转位（0 = 原位） */
  inversion: number;
  /** 实际低音（可能是转位低音） */
  bass: VoicedNote;
}

/** voicing 风格 */
export type VoicingStyle = "block" | "jazz" | "shell" | "open" | "worship" | "arpeggio";

/** 左手模式 */
export type LeftHandMode = "root" | "root5" | "rootOct" | "octaves" | "none";

export interface VoicingSettings {
  style: VoicingStyle;
  /** auto 或 0/1/2/3 */
  inversion: "auto" | 0 | 1 | 2 | 3;
  /** 右手八度偏移（半音 *12） */
  rhOctave: number;
  /** 左手八度偏移 */
  lhOctave: number;
  /** 右手最低音（MIDI）基准 */
  rhLow: Midi;
  rhHigh: Midi;
  lhLow: Midi;
  lhHigh: Midi;
  /** 右手最大跨度（半音） */
  maxSpan: number;
  add9: boolean;
  omit5: boolean;
  drop2: boolean;
  leftHand: LeftHandMode;
  /** 平滑声部连接强度 0-1（1 = 最强最小移动） */
  smoothness: number;
}

export interface PlaySettings {
  bpm: number;
  timeSignature: [number, number];
  /** 柱式 / 琶音 */
  arpeggio: boolean;
  /** 琶音音间隔（拍） */
  arpSpread: number;
  volume: number;
  loop: boolean;
  metronome: boolean;
  /** 摇摆 */
  swing: number;
}

export interface ParseIssue {
  level: "error" | "warn" | "info";
  line?: number;
  message: string;
  raw?: string;
}

export interface ParseResult {
  song: Song | null;
  issues: ParseIssue[];
  /** 识别到的输入类型 */
  detected: InputMode;
}

export type InputMode = "auto" | "chord" | "tab";

/** 调性分析结果 */
export interface KeyAnalysis {
  key: string;
  scale: string[];
  /** 每个和弦事件对应的级数罗马数字 */
  degrees: string[];
  confidence: number;
}
