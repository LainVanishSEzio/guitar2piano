# Guitar2Piano · 吉他谱转钢琴和弦

输入吉他和弦名（`C`、`Cmaj7`、`A/C#`…）或六线谱 TAB，自动转换为**适合钢琴演奏的和弦进行**：平滑声部连接的双voicing、五线谱大谱表、钢琴键盘高亮、播放、移调与导出。

技术栈：**Next.js 14 + TypeScript + Tailwind CSS + Zustand + Tonal.js + VexFlow 4 + Tone.js + @tonejs/midi**

---

## 快速开始（VSCode）

```bash
cd guitar2piano
npm install          # 已安装可跳过
npm run dev          # 打开 http://localhost:3000
```

Windows 一键脚本（双击即可）：

- `start.bat` — 启动，自动开浏览器；**关掉黑窗口即停止**
- `stop.bat` — 按端口 3000 强制停止服务（命令行关不掉时用）

> `start.bat` 会自动挑选机器上版本合格的 Node（≥18.17）；若 PATH 里的 `node` 是旧版本（如 16），
> 它会自动改用其它可用位置并在窗口里打印实际使用的版本。
> 最彻底的办法还是装一个 Node LTS：https://nodejs.org/

其他命令：

```bash
npm run build && npm start   # 生产构建
npm run typecheck            # 类型检查
npm run build:static         # 静态导出到 out/（用于 GitHub Pages 等静态托管）
```

### 发布到 GitHub Pages

仓库已内置 `.github/workflows/deploy-pages.yml`，push 到 `main` 即自动构建并发布。

```bash
git remote add origin https://github.com/<你的用户名>/guitar2piano.git
git push -u origin main
```

然后在仓库 **Settings → Pages → Source = Deploy from a branch → gh-pages / (root)**。
详细步骤与常见坑见 [`docs/DEPLOY-GitHub-Pages.md`](docs/DEPLOY-GitHub-Pages.md)。

> Node 18+（已验证 Node 22）。无需后端、无需账号、无外部音频资源。

---

## 功能一览

| 模块 | 能力 |
|---|---|
| 输入 | 和弦名谱、六线谱 TAB、混合文本；`|` 小节线、`|:` `:|` 反复、`[Verse]` 段落、`capo:/bpm:/time:/key:/title:/tuning:` 指令；拖放 .txt；5 个内置示例 |
| 解析 | 小节划分、和弦符号解析（Tonal）、TAB 品位 → MIDI（开放弦 + 品 + capo）、音高集合 → 和弦推断（允许转位/省略，带置信度）、调号与级数推断 |
| 转换 | 左手（单根音/根五/根八/八度叠加/无）+ 右手（3–4 音密排列），6 种风格，转位、加九、省略五、drop2、音区与跨度约束、**声部连接（共同音保持 + 最小移动 + 低音级进）** |
| 显示 | 和弦卡（符号/组成音/转位）、VexFlow 大谱表（谱号+调号+拍号+连谱号）、61 键钢琴键盘（左手青/右手紫） |
| 播放 | 播放/暂停/停止（空格键）、BPM 40–240、拍号、柱式/琶音、音量、循环、节拍器、当前和弦高亮同步 |
| 编辑 | 直接改和弦符号（自动重解析）、改时值、插入、删除、锁定、移调 ±12、capo 0–11、记谱/实际音高切换 |
| 导出 | MIDI（双手双轨+tempo）、MusicXML 3.1、五线谱 PNG（2× 高清）、打印/另存 PDF、复制和弦进行 |

---

## 项目结构

```
guitar2piano/
├── app/
│   ├── layout.tsx            # 根布局、metadata
│   ├── page.tsx              # 页面装配 + 播放调度 + 导出编排
│   └── globals.css           # Tailwind、深色主题、纸张/键盘/打印样式
├── components/
│   ├── TopBar.tsx            # 标题 + 导出菜单
│   ├── InputPanel.tsx        # 输入框、模式、示例、文件导入、错误列表
│   ├── ChordEditor.tsx       # 和弦编辑（改符号/时值/增删/锁定）
│   ├── ChordCards.tsx        # 和弦卡横向流
│   ├── StaffView.tsx         # VexFlow 容器（ResizeObserver 自适应）
│   ├── SettingsPanel.tsx     # voicing / 移调 / capo / 音区设置
│   ├── TransportBar.tsx      # 走带控制条
│   ├── PianoKeyboard.tsx     # 自研钢琴键盘
│   └── Toast.tsx             # 提示
├── lib/
│   ├── types.ts              # 全部数据模型
│   ├── music.ts              # Tonal 封装：和弦符号→组成音、音名/MIDI、移调
│   ├── parse.ts              # 和弦名谱解析 / TAB 解析 / 和弦推断 / 统一入口
│   ├── voicing.ts            # 钢琴 voicing 生成 + 声部连接
│   ├── key.ts                # 调性推断 + 罗马数字级数
│   ├── staff.ts              # VexFlow 大谱表渲染
│   ├── audio.ts              # Tone.js 播放引擎（PolySynth + Transport + Draw）
│   ├── exporter.ts           # MIDI / MusicXML / PNG / 文本导出
│   └── examples.ts           # 内置示例
├── store/useStore.ts         # Zustand 全局状态与 actions
└── docs/PRD.md               # 产品需求文档
```

### 组件树

```
<Home>
├─ <TopBar>                        标题 / 导出菜单
├─ grid
│  ├─ 左栏  <InputPanel> <ChordEditor>
│  ├─ 中栏  <ChordCards> · <StaffView>(dynamic, ssr:false) · <TransportBar>
│  └─ 右栏  <SettingsPanel> · 进行分析
├─ 底部固定  <PianoKeyboard>
└─ <Toast>
```

### 数据流

```
文本输入 ──parseInput──▶ ParseResult{song, issues}
                              │
      transpose + capo ───────┤
                              ▼
                    voiceSong(events, settings, shift) ──▶ Voicing[]
                              │                              │
                    analyzeKey ──▶ 级数               ┌──────┴──────┐
                              │                     │             │
                        <StaffView>          <PianoKeyboard>  player.play()
```

---

## 核心算法

**TAB → 音高**
```
midi = openMidi[stringIndex] + fret + capo
openMidi(EADGBE 低→高) = [40, 45, 50, 55, 59, 64]
```

**和弦推断（音高集合 → 符号）**：12 根音 × 20 个和弦模板，打分
`score = 3·命中 − 2.2·缺失 − 1.6·多余 − 模板权重 − 0.15·模板音数`，低音即根音额外加权，允许转位与省略，置信度低于 0.55 时在 UI 提示。

**钢琴 voicing + 声部连接**
1. 生成 N 种转位的上行密排列，归一化到右手音区（默认 C4–G5）；
2. 按风格做 drop2 / rootless / shell 处理；
3. 打分选优：`motion(最小移动) + 2.4·未保持音 + 3·超跨度 + 10·越界 + 0.05·跨度`，无前值时偏好原位；
4. 左手取音区内距前低音最近的根音（低音级进），可按模式叠加五度/八度。

**移调**：所有和弦符号、voicing、MIDI、MusicXML 使用同一半音偏移；capo 参与「记谱 → 实际」的偏移叠加。

---

## 语法速查

```
title: 曲名          key: G
bpm: 92              capo: 2
time: 4/4            tuning: E A D G B E

[Verse]
| C  G | Am  F |
|: Cmaj7 | Dm7  G7 :|

六线谱（6 行，自动推断和弦）：
e|-0-----0-----0-----3-----|
B|-1-----1-----1-----0-----|
G|-0-----2-----0-----0-----|
D|-2-----2-----2-----0-----|
A|-3-----0-----2-----2-----|
E|-------0-----0-----3-----|
```

---

## 已知限制

- 节奏以「每和弦一个时值」的网格建模，不支持扫弦型、切分、连音线。
- TAB 按列推断和弦；单音旋律片段会被识别为单音和弦。
- 音色为 Tone.js 合成器（triangle + Freeverb），非真实采样钢琴。
- 图片/PDF 谱 OCR、和弦图（ASCII diagram）识别在 v1.1 规划中（`OcrAdapter` 接口预留）。
- 打印为 PDF 走浏览器打印样式（`.no-print` 隐藏交互控件）。

更多设计细节见 [`docs/PRD.md`](docs/PRD.md)。
