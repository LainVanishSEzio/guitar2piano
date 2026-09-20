import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guitar2Piano · 吉他谱转钢琴和弦",
  description:
    "输入吉他和弦名或六线谱 TAB，自动转换为适合钢琴演奏的和弦进行：声部连接、五线谱、钢琴键盘、播放与导出。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
