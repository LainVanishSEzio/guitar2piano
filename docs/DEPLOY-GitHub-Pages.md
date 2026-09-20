# 部署到 GitHub Pages（手把手）

目标地址：**https://lainvanishsezio.github.io/guitar2piano/**

这个项目是纯前端应用（无后端、无数据库），所以可以直接变成一堆静态文件托管在 GitHub Pages 上，免费、无需服务器。

---

## 原理（30 秒版）

```
你的代码 ──git push──▶ GitHub 仓库 main 分支
                            │
                     GitHub Actions 自动跑（.github/workflows/deploy-pages.yml）
                            │  npm ci → npm run build:static → 产出 out/
                            ▼
                     把 out/ 推到 gh-pages 分支
                            ▼
                 GitHub Pages 把 gh-pages 当网站对外提供
```

你只管 push，剩下的自动完成。

---

## 一次性配置（约 3 分钟）

### 第 1 步：在 GitHub 上建一个空仓库

1. 打开 https://github.com/new
2. **Repository name** 填：`guitar2piano`（建议就用这个名字，后面 basePath 按它算）
3. **Public**（公开）——私有仓库要用 Pages 得付费，选 Public
4. **不要**勾选 "Add a README file" / .gitignore / license（保持空仓库，否则 push 会冲突）
5. 点 **Create repository**

### 第 2 步：把本地项目推上去

打开 VSCode 终端（或 PowerShell），执行：

```powershell
cd D:\paino\guitar2piano

git remote add origin https://github.com/LainVanishSEzio/guitar2piano.git
git push -u origin main
```

> 首次会弹出浏览器让你登录 GitHub 授权（Windows 凭据管理器），
> 或者让你输入用户名 + **Personal Access Token**（不是登录密码）。
> 没有 token 的话：GitHub → 头像 → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → 勾 `repo` → 生成后复制当密码用。

推送成功后，去仓库的 **Actions** 标签页，会看到 `Deploy to GitHub Pages` 正在跑，等它变绿（约 1 分钟）。

### 第 3 步：打开 Pages

1. 仓库 → **Settings** → 左侧 **Pages**
2. **Source** 选 `Deploy from a branch`
3. **Branch** 选 `gh-pages`，目录选 `/ (root)` → **Save**
4. 等 1–2 分钟，刷新页面，顶部会出现网址：
   **https://lainvanishsezio.github.io/guitar2piano/**

完事。

---

## 以后怎么更新

改完代码，三条命令：

```powershell
cd D:\paino\guitar2piano
git add .
git commit -m "更新说明"
git push
```

Actions 自动重新构建发布，1 分钟后线上就是新版。

---

## 方式 B：不想用 Actions，手动发布

如果你只想「传文件」，不想走 CI：

```powershell
cd D:\paino\guitar2piano

# 每次发布前先构建（必须带 basePath，否则线上白屏）
$env:NEXT_PUBLIC_BASE_PATH="/guitar2piano"; npm run build:static

# 关键：GitHub Pages 默认跑 Jekyll，会忽略 _next 目录，必须加 .nojekyll
New-Item -ItemType File -Force -Path out\.nojekyll | Out-Null

# 把 out/ 推到 gh-pages 分支
git subtree push --prefix out origin gh-pages
```

之后同样在 Settings → Pages 里把 Branch 设成 `gh-pages`。

> 用 Bash 的话，第一条改成：
> `NEXT_PUBLIC_BASE_PATH=/guitar2piano npm run build:static && touch out/.nojekyll`

---

## 常见坑（都是真会踩到的）

| 现象 | 原因 | 解决 |
|---|---|---|
| 页面白屏、F12 里 JS/CSS 全 404 | 部署在 `/<仓库名>/` 子路径下，但没设 `basePath` | 构建时带上 `NEXT_PUBLIC_BASE_PATH=/仓库名`（Actions 里已自动算好） |
| 页面能开但没样式、没图标 | `_next` 目录被 Jekyll 忽略（下划线开头的目录） | 必须有 `.nojekyll` 文件（Actions 已自动生成） |
| Actions 报 `npm ci` 失败 | 少了 `package-lock.json` | 本项目已提交该文件，正常不会遇到 |
| 404 页面返回 GitHub 默认 404 而不是应用页 | Pages 只会用 `404.html`，本项目已生成 | 无需处理 |
| push 被拒 `fetch first` | 建仓库时勾了 Add README | `git pull --rebase origin main` 后再 push |
| 音频不出声 | 浏览器自动播放策略 | 页面第一次点击「播放」后才允许发声，属正常 |

---

## 本地验证线上效果

想在自己电脑上模拟 Pages 的子路径环境：

```bash
cd D:\paino\guitar2piano
NEXT_PUBLIC_BASE_PATH=/guitar2piano npm run build:static
mkdir -p _verify/guitar2piano && cp -r out/. _verify/guitar2piano/
python -m http.server 3222 --directory _verify
# 打开 http://localhost:3222/guitar2piano/
```

能正常显示钢琴键盘和五线谱，说明线上就没问题。

---

## 附：想要根域名地址？

如果你希望是 `https://lainvanishsezio.github.io/`（不带仓库名），把仓库命名为 `LainVanishSEzio.github.io` 即可。
`deploy-pages.yml` 里的 basePath 计算逻辑已经处理了这种情况（仓库名等于 `<用户名>.github.io` 时会自动留空）。
