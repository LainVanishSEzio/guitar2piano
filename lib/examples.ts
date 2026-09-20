import type { InputMode } from "./types";

export interface Example {
  id: string;
  name: string;
  desc: string;
  mode: InputMode;
  text: string;
}

export const EXAMPLES: Example[] = [
  {
    id: "pop",
    name: "流行四和弦",
    desc: "C - G - Am - F，弹唱必备",
    mode: "chord",
    text: `title: 流行四和弦练习
bpm: 92
time: 4/4

[Verse]
| C | G | Am | F |

[Chorus]
| C  G | Am  F | C  G | F |
`,
  },
  {
    id: "jazz",
    name: "爵士 ii-V-I",
    desc: "七和弦 + 转位低音，测试 voicing 平滑度",
    mode: "chord",
    text: `title: ii-V-I Jazz
bpm: 120
time: 4/4

| Dm7 | G7 | Cmaj7 | A7 |
| Dm7 | G7 | Em7  A7 | Dm7  G7 |
| Cmaj7 | A7 | Dm7 | G7 |
`,
  },
  {
    id: "tab",
    name: "六线谱 TAB",
    desc: "标准调弦，系统自动推断和弦名",
    mode: "tab",
    text: `title: TAB 片段
bpm: 84
time: 4/4
capo: 0

e|-0-----0-----0-----3-----|
B|-1-----1-----1-----0-----|
G|-0-----2-----0-----0-----|
D|-2-----2-----2-----0-----|
A|-3-----0-----2-----2-----|
E|-------0-----0-----3-----|

e|-0-----------0-----------|
B|-1-----1-----1-----1-----|
G|-0-----2-----0-----2-----|
D|-2-----2-----2-----2-----|
A|-3-----0-----3-----0-----|
E|-x-----------x-----------|
`,
  },
  {
    id: "worship",
    name: "敬拜进行",
    desc: "带 capo，含 slash bass 与 sus 和弦",
    mode: "chord",
    text: `title: 敬拜进行
bpm: 68
time: 4/4
capo: 2

[Verse]
| G   D/F# | Em   C | G   D/F# | C |
[Chorus]
| C   G/B | Am   G | F   C/E | Dsus4  D |
`,
  },
  {
    id: "ballad",
    name: "抒情 ballad",
    desc: "大量七和弦与转位，适合验证声部连接",
    mode: "chord",
    text: `title: Ballad in Bb
bpm: 76
time: 3/4

| Bb | Gm7 | Ebmaj7 | F |
| Bb/D | Gm7 | Cm7 | F7 |
| Bb | Eb | Bb/F | Bb |
`,
  },
];
