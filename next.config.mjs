/** @type {import('next').NextConfig} */

// 静态导出模式：npm run build:static 或 STATIC_EXPORT=1 时产出 out/ 目录（GitHub Pages / 任意静态托管）
// 用 npm_lifecycle_event 判断脚本名，避免 Windows 上依赖 cross-env
const isStatic =
  process.env.STATIC_EXPORT === "1" || process.env.npm_lifecycle_event === "build:static";
// 部署在 https://<用户名>.github.io/<仓库名>/ 时需要；部署在根域名则留空
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  reactStrictMode: false,
  eslint: { ignoreDuringBuilds: true },
  ...(isStatic
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
