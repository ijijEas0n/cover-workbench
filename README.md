# 封面工作台 Cover Workbench

一张视频截图 + 一段标题 → 自动压暗（按图片亮度自适应）+ 白色大号标题 → 一键导出 **3:4（1080×1440）** 和 **4:3（1440×1080）** 两张封面。可以人工在工作台调，也可以 CLI / Agent 批量调用，视觉完全一致。

## 在线使用（推荐）

**<https://ijijeas0n.github.io/cover-workbench/>** —— 部署在 GitHub Pages，打开即用：

1. 拖入一张图片（PNG/JPG）
2. 输入标题（自动分行；换行=手动分行）
3. **画布上直接拖**：点标题 → 拖动挪位置 · 拖右下角圆圈改大小；滚轮缩放/拖动平移图片，双击复位
4. 样式下拉一键切换：**默认款**（白字宋体）/ **剪映款**（白盒黑体）/ **暗盒款**（黑盒宋体）
5. 「导出 JPG」下载两张封面

所有处理都在浏览器本地完成，图片不会上传到任何服务器。

## 本地使用

### 工作台（人用）

```bash
open index.html        # 或浏览器直接打开
```

### CLI（agent / 批处理）

需要 Node ≥ 18 和 Playwright（Chromium）：

```bash
npm i -D playwright && npx playwright install chromium

node render-cover.mjs 图片.jpg -t "工业革命|几十亿人|置身事外" --manual
node render-cover.mjs 图片.jpg -t "感觉靠谱|AI 答案" --preset presets/capcut-light.json
node render-cover.mjs 图片.jpg -t "标题" --preset presets/default.json
node render-cover.mjs 图片.jpg -t "标题" --dark 0.7 --sat 0.6 --ls 12 --json state.json
node render-cover.mjs --help   # 全部参数
```

输出 `<标题>-3x4.jpg`、`<标题>-4x3.jpg`。`|` 自动转换行；`--manual` 手动分行不加 `|`。

## 样式

| 预设 | 说明 | 参数 |
|---|---|---|
| `presets/default.json` | 默认款：无盒白粗宋体 + 阴影 | 自动暗度 |
| `presets/capcut-light.json` | 剪映款：半透明白盒 + 黑体 | autoDark |
| `presets/darkbox.json` | 暗盒款：黑盒 + 宋体 | autoDark |

- **自动暗度**：加载图片时按平均亮度算压暗（暗图少压、亮图多压，区间 0.25~0.7），保证白字始终清晰；可在高级·背景关掉用固定值
- 高级面板（字号/行高/字距/字体/文字颜色/阴影、文本框、背景）折叠收起，默认不用管
- 分行自动避开数字串（「日更100条」不会拆成「日更1/00条」）

## 一键部署到 GitHub Pages

仓库已内置 GitHub Actions（`.github/workflows/pages.yml`）：**push 到 main 自动发布**到 Pages，无需手动操作。

自己 Fork / 复制后启用 Pages：

```bash
git clone <你的仓库>
# 改好后：
git push origin main     # Actions 自动部署
```

或在仓库 Settings → Pages → Source 选 `GitHub Actions`。

## 目录结构

```
index.html              工作台（唯一渲染源，也是 Pages 在线版）
render-cover.mjs        CLI（Playwright 驱动同一份 index.html）
presets/                三款风格参数
.github/workflows/      Pages 自动部署
test/                   smoke/ui 自检脚本 + 合成测试图（真实素材不入库）
```

## 开发

```bash
node test/smoke.mjs     # 冒烟：预设应用/画布拖拽/导出
node test/ui-shot.mjs   # 截图自检：test/out/ui-*.png
```
