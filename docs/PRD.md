# Guitar2Piano — 产品需求文档 (PRD)

> 吉他谱（和弦名 / 六线谱 TAB / 和弦图文本）→ 钢琴和弦进行（voicing）→ 五线谱 + 键盘高亮 + 播放 + 导出

- 版本：v1.0
- 定位：面向会吉他、想快速把谱子「搬到」钢琴上弹的玩家/编曲者，以及需要钢琴伴奏排练的乐手。
- 交付形态：纯前端 Web App（Next.js），无后端、无账号、数据本地留存（localStorage）。

---

## 1. 背景与问题

| 痛点 | 现状 | 我们的解法 |
|---|---|---|
| 只会看吉他谱，不知道钢琴怎么弹 | 靠记忆/网上找谱 | 输入和弦名或 TAB，直接得到合理的钢琴双手 voicing |
| TAB 上只有品位，不知道是什么和弦 | 人工数音 | 音高集合 → 和弦模板匹配（允许转位/省略）自动识别 |
| 自动出来的和弦连接生硬、跳来跳去 | 直接堆原位和弦 | 声部连接算法：共同音保持 + 最小移动 + 低音级进 |
| 想变调/夹变调夹，得全部重算 | 手算 | 移调 / capo 一键同步所有和弦与音符 |
| 需要把结果给琴友或导入 DAW | 截图 | 导出 MIDI / MusicXML / PNG / PDF / 纯文本和弦进行 |

## 2. 目标与非目标

**目标 (in scope)**
1. 三种输入：和弦名谱、六线谱 TAB、混合文本（含 `|` 小节线）。
2. 解析：小节、和弦、节奏、反复记号、调号推断、capo。
3. 转换：吉他和弦 → 钢琴双手 voicing，可调转位/省略音/加九音/风格。
4. 可视化：和弦卡、钢琴键盘高亮、五线谱（大谱表，VexFlow）。
5. 播放：播放/暂停、BPM、拍号、柱式/琶音、音量、循环、节拍器。
6. 编辑：改和弦、移调、capo、换 voicing。
7. 导出：MIDI、MusicXML、PNG、打印 PDF、复制和弦进行。

**非目标 (out of scope v1)**
- 图片 OCR（架构预留 `OcrAdapter` 接口，v1 仅 UI 占位）。
- 用户账号 / 云端存储 / 协作。
- 复杂节奏型（扫弦模式、切分、连音线）；v1 以「每和弦一个时值」的节奏网格建模。
- 真实钢琴采样音源（v1 用 Tone.js 合成器，避免外部音频依赖）。

## 3. 用户画像与场景

| 角色 | 场景 |
|---|---|
| 吉他手 / 教会司琴 | 拿到吉他谱，需要钢琴伴奏 → 输入和弦名，选 block 风格，直接弹 |
| 编曲 / 制作人 | 把 TAB riff 的和声骨架抽出来 → 输入 TAB，导出 MIDI 进 DAW |
| 音乐老师 | 给学生演示和弦转位与声部连接 → 用转位设置对比不同 voicing |
| 学习者 | 看键盘高亮学和弦构成 → 播放 + 慢速循环 |

## 4. 功能需求

### 4.1 输入区
- 文本域（支持粘贴 + 拖入 .txt/.tab 文件）。
- 三种输入模式自动识别 / 手动切换：`chord`（和弦名谱）、`tab`（六线谱）、`auto`。
- 支持语法：
  - 和弦名：`C G Am F`、`Cmaj7 Dm7 G7 F#dim Bb A/C# Csus4 Cadd9 C/E`
  - 小节线：`|`、段落标记 `|: :|`（反复）、`[Verse]` `[Chorus]`
  - TAB：六行标准调弦 `e B G D A E`（大小写区分高低音 E），`-3-`、`-10-`（多位数）、`h/p/s`（忽略，仅取品位）
  - 指令行：`capo: 2`、`bpm: 92`、`time: 3/4`、`key: G`、`tuning: DADGAD`（v1 支持自定义调弦）
- 示例按钮：一键载入 4 个内置示例（流行四和弦、爵士 ii-V-I、TAB 片段、worship）。
- 错误提示：行级定位（第 n 行、无法识别的 token）+ 建议修正。

### 4.2 解析
- **和弦名谱**：按 `|` 切小节，小节内和弦均分该小节拍数（默认 4/4 → 每小节 4 拍）。
- **TAB**：
  - 开放弦 MIDI：E2=40 A2=45 D3=50 G3=55 B3=59 E4=64（可调调弦）。
  - 音高 = 开放弦 MIDI + 品位 + capo。
  - 按列聚合；连续相同音高集合 → 合并为一个和弦事件，时值累加。
  - 音高集合 → 和弦推断（见 §5.2）。
- **手修正**：和弦卡上可直接改和弦名 / 改时值 / 删除 / 插入。

### 4.3 转换（核心）
- 左手：根音（默认 C2–C3），可选 +五度、+八度、八度叠加、无。
- 右手：3–4 音和弦，目标音区 C4–G5，跨度 ≤ 八度（可设置）。
- 风格（voicing style）：
  - `block` 柱式（默认，适合弹唱伴奏）
  - `jazz` 爵士（rootless / drop2 / 加 9）
  - `shell` 壳体（根音+3+7）
  - `open` 开放排列（drop2 + 加九）
  - `worship` 敬拜（八度左手 + 加 sus/9 色彩）
  - `arpeggio` 琶音（播放时展开）
- 设置项：转位（auto / 0 / 1 / 2 / 3）、八度偏移、加九音、省略五音、drop2、右手音区、左手音区、跨度上限。
- 声部连接：见 §5.3。

### 4.4 播放
- Transport：播放/停止、进度显示当前和弦索引。
- BPM 40–240、拍号 4/4 3/4 6/8 2/4。
- 柱式 / 琶音（琶音速度可选）。
- 音量、循环、节拍器（重音第一拍）。
- 播放时键盘实时高亮 + 和弦卡高亮。

### 4.5 编辑
- 移调 −12…+12 半音（所有和弦与音符同步）。
- capo 0–11：写入和弦 → 实际音高 = 记谱 + capo；开关「显示实际音高」。
- 单个和弦：改符号、改时值、换 voicing（手动覆盖 auto）、删除、重复。

### 4.6 导出
- MIDI（@tonejs/midi）：双手两个 track，含 tempo 与拍号。
- MusicXML（手写生成，partwise，双谱表）。
- PNG（VexFlow SVG → Canvas → PNG，白底）。
- PDF（打印样式 `window.print()`）。
- 复制和弦进行（纯文本，含移调后的符号）。

## 5. 核心算法

### 5.1 TAB → 音高
```
midi(stringIdx, fret) = openMidi[stringIdx] + fret + capo
openMidi(EADGBE from low to high) = [40, 45, 50, 55, 59, 64]
```

### 5.2 和弦识别（音高集合 → 符号）
- 提取唯一 pitch class 集合 `P`，记录最低音 `bassPc`。
- 遍历 12 个根音 × 模板库（maj, min, dim, aug, sus2, sus4, 6, m6, maj7, min7, dom7, dim7, m7b5, maj9, min9, add9, 7sus4 …）。
- 打分：
  ```
  score = 3*matched − 2*missing − 1.5*extra − (chordSize)   // 越小越优
  score -= 2 if bassPc === root                              // 低音即根音加权
  score += 1 per extra tone beyond 4                          // 惩罚过于复杂的和弦
  ```
- 允许转位（低音不必是根音）与省略（模板音缺失不致命）。
- 输出：最佳符号 + 置信度；置信度 < 阈值时标记「待确认」并在 UI 高亮。

### 5.3 钢琴 voicing + 声部连接
```
输入: chordTones(pc), prevVoicing, settings
1. 生成候选：对 N 个音的「上行密排列」做 N 种轮转（转位），
   每个候选归一化到 [rhLo, rhHi] 区间内
2. drop2：把次高音降八度（open / jazz 风格）
3. 打分（越小越优）：
   motion    = Σ min_{p∈prev} |n − p|        // 最小移动
   common    = 共同音个数                     // 共同音保持
   span      = max−min；> spanLimit 罚分
   range     越界重罚
   score = motion + 2*(N − common) + 3*spanPenalty + 10*rangePenalty
4. 低音：根音选 [lhLo, lhHi] 区间内距 prevBass 最近的八度 → 低音级进
```

### 5.4 移调
- 和弦符号整体 `transpose(symbol, interval)`（Tonal.js），
  voicing 与 MIDI 音符按同一半音数偏移；capo 作为「记谱→实际」的偏移量叠加。

## 6. 页面结构与组件树

```
AppShell (dark, responsive)
├─ TopBar                       标题 / 输入模式切换 / 示例 / 导入 / 导出菜单
├─ MainGrid (lg: 3 列)
│  ├─ LeftPane  (输入 + 编辑)
│  │   ├─ InputPanel            文本域、拖放、模式切换、解析按钮
│  │   ├─ ParseReport           行级错误/警告
│  │   └─ ChordListEditor       和弦卡列表（改符号/时值/删除/voicing 覆盖）
│  ├─ CenterPane (输出)
│  │   ├─ ChordCardRow          和弦卡横向流（当前播放项高亮）
│  │   ├─ StaffView             VexFlow 大谱表（动态 import, ssr:false）
│  │   └─ TransportBar          播放/停止/BPM/拍号/柱式-琶音/音量/循环/节拍器
│  ├─ RightPane (设置)
│  │   ├─ SettingsPanel         调号、capo、BPM、voicing 风格、转位、加九、省略五、音区
│  │   └─ KeyInfoCard           推断调号、罗马数字级数、进行分析
├─ BottomDock
│  └─ PianoKeyboard             61 键（C2–C7），左手蓝 / 右手紫，播放实时高亮，可点击试听
└─ Toast / ErrorBanner
```

### 状态机（播放）
`idle → ready(parsed) → playing → paused → stopped`
非法输入（0 个和弦）时播放按钮禁用。

## 7. 数据模型（摘要，完整见 `lib/types.ts`）

| 类型 | 说明 |
|---|---|
| `ChordEvent` | 单个和弦事件：符号、根音、品质、转位低音、组成音、时值(拍)、来源 |
| `Song` | 标题、调号、拍号、BPM、capo、events[]、段落标记 |
| `VoicingSettings` | 风格、转位、八度、加九、省略五、drop2、手别音区、跨度上限 |
| `Voicing` | `{ lh: VoicedNote[], rh: VoicedNote[] }`，`VoicedNote = {midi, name, pc}` |
| `ParseResult` | `{ song, errors[], warnings[] }` |
| `AppState` | Zustand：输入、song、settings、播放状态、UI 状态、actions |

## 8. 技术方案

| 层 | 选型 |
|---|---|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS 3（深色主题，移动优先） |
| 状态 | Zustand（含 localStorage 持久化 settings） |
| 乐理 | Tonal.js（和弦符号解析、组成音、移调、音名/MIDI 互转） |
| 五线谱 | VexFlow 4（SVG，大谱表 StaveConnector） |
| 播放 | Tone.js（PolySynth 合成钢琴音色 + Transport 调度 + Draw 同步 UI） |
| 键盘 | 自研 React 组件（无外部音频依赖，可控高亮） |
| 导出 | @tonejs/midi（MIDI）、手写 MusicXML、SVG→Canvas（PNG）、print CSS（PDF） |

## 9. 验收标准

1. 粘贴 `C G Am F` → 4 个和弦卡，五线谱显示大谱表，键盘高亮正确。
2. 粘贴 6 行 TAB → 正确推断至少 80% 的和弦（内置示例 100%）。
3. 移调 +3 → 所有和弦名与音符同步上移小三度，音频一致。
4. capo 2 + 和弦 C → 实际音响 D（开关可切换显示）。
5. voicing 风格切换 → 右手音区、排列、跨度即时变化且始终在 C3–C6 内。
6. 播放：BPM 60 时 4 个 4 拍和弦共 16 秒；节拍器、循环、琶音正常。
7. 导出 MIDI 可被 DAW 打开，音符数与 voicing 一致。
8. 1440px / 768px / 375px 三档布局无横向滚动、无重叠。

## 10. 迭代规划

- v1.0：本文全部 in-scope 功能。
- v1.1：图片/PDF 谱 OCR（接入 `OcrAdapter`）、和弦图（ASCII diagram）识别。
- v1.2：扫弦/节奏型模板、钢琴伴奏音型库（阿尔贝蒂低音、柱式+琶音混合）。
- v1.3：真实采样音源（Salamander piano）、云端分享链接。
