# AGENTS.md —— 封面工作台

手工搭建的短视频封面生成工具，位于 `/Users/eason/Documents/封面工作台/`。
核心诉求：**一张视频截图 + 一段标题 → 自动压暗 + 大号白色标题 → 同时导出 3:4 和 4:3 两种竖屏/横屏封面**。既能人工在工作台调，也能被 agent / CLI 批量调用。

## 目标与验证状态

**GitHub**：仓库 https://github.com/ijijEas0n/cover-workbench （public，main）。GitHub Actions 自动部署 Pages：https://ijijeas0n.github.io/cover-workbench/ （在线工作台，图片本地处理不传服务器）。push 触发 `.github/workflows/pages.yml`。测试素材（人脸/产品图）在 `test/private/`（gitignore，不入库），`test/src.png` 为合成测试图。git 仓库级 user.name/email 已配（ijijEas0n noreply）。

已完成并验证：
- ✅ 双比例渲染（1080×1440 竖屏 3:4 / 1440×1080 横屏 4:3）
- ✅ 压暗（dark=0.62 黑半透明叠加）、降饱和（sat=0.8）、亮度（bri=1.0）
- ✅ 白色粗宋体大标题（Songti SC / Noto Serif SC，weight=900），自动字号（按最长行适配宽度）
- ✅ 自动均衡分行 + 手动分行（`\n`）
- ✅ CLI 出图（Playwright 驱动同一份 index.html，视觉与工作台一致）
- ✅ 像素级验证：源图 YAVG 126→输出 50（恰合 dark=0.62 公式：126×0.38≈48）；白色文字存在（YMAX=255）；3 行大字垂直居中（3:4 中心719≈720、4:3 中心539≈540）
- ✅ 文本框引擎：标题可外包盒子（黑盒/白盒/描边/无盒 4 样式）、透明度、内边距、圆角、文字颜色（白/黑）；字号自动适配盒内（含内边距的二分），盒高自动=行数×行高+边距
- ✅ 字体切换：serif=宋体（默认）/ sans=黑体 PingFang SC（剪映款），CLI `--font`
- ✅ **默认无盒白字**（用户拍板 2024-08：字体 OK 但不要盒子，透明直出+阴影自动）；盒背景可在高级/样式里开
- ✅ **自动暗度默认开**（用户拍板）：setImage 时算图片平均亮度（32×32 灰度采样），暗图少压/亮图多压（公式 `clamp(0.3 + L/255*0.5, 0.25, 0.7)`）；开关在高级·背景（autoDark），关掉后走固定 dark 值；CLI `--auto-dark`
- ✅ **画布拖拽交互**（仿剪映/tweet-card）：点标题→蓝色虚线选中框+右下角圆手柄；拖框体=移动位置（textX/textY）；拖手柄=调宽度（boxW，无盒时即调字号大小）；点空白取消；两画布同一套参数联动，不用调数据滑块
- ✅ 目视验收：test/ui-shot.mjs 空图/载图/选中态截图正常；test/smoke.mjs 预设+拖动+手柄+导出 ALL PASS
- ✅ **手机端适配**（≤900px 媒体查询）：预览在上/面板在下纵向堆叠、画布宽度撑满（单张高≤62vh）、触控拖标题/拖手柄（pointer 事件原生可用，`touch-action:none`）、**双指捏合缩放图片**（补滚轮缺失）、输入框 16px 防 iOS 聚焦放大、download 不支持时新窗口长按保存兜底；`test/ui-mobile.mjs` iPhone 视口验证 ALL PASS（布局堆叠/不溢出/捏合 zoom=1.5/触控拖标题/桌面无回归）

**默认风格（用户拍板）**：无盒白粗宋体 900 + 阴影 + 中置（textX/Y 0.5）。样式下拉 3 款：默认款（白字宋体）/ 剪映款（白盒黑体）/ 暗盒款（黑盒宋体）。

## 文件结构

```
index.html          工作台 v2（人用）。极简默认面：图/标题/样式/导出，文字/文本框/背景高级参数折叠。浏览器直接打开，拖图→输标题→一键导出
render-cover.mjs    CLI（agent 用）。复用同一份 index.html 渲染，保证视觉一致（API 兼容 v2）
presets/default.json 默认参数快照（无盒白字宋体，用户确认款）
presets/capcut-light.json 剪映参考款（白盒+黑体，可选用）
presets/darkbox.json 暗盒宋体款（可选用）
README.md           README
test/               样例 + 输出 + smoke/ui 截图自检脚本
```

## 用法

### 人用（工作台）
浏览器打开 `index.html`（v2 极简版）：
1. 拖入图片（PNG/JPG）
2. 输入标题；默认自动分行（每行 ≤5 字）
3. 样式下拉一键切换：默认款（暗盒宋体）/ 剪映款（白盒黑体）/ 简洁款（无盒白字阴影）
4. 双预览各自可 **滚轮缩放 / 拖动平移 / 双击复位**；画布 CSS 自适应（max-width:44vw / max-height:70vh）
5. 「导出 JPG」下载两张（3:4 + 4:3）；「导出参数/导入参数」备份
6. 高级参数（字号/行高/字距/位置/字体/阴影、文本框、背景）折叠在三个 details 里，默认收起
7. **画布直接拖拽标题**：点标题出现蓝色虚线框+右下角圆手柄；拖框体移动位置，拖手柄调大小（窄=字小，宽=字大）；点空白取消。滚轮/拖动作用的是图片，双击复位
8. 参数自动存 localStorage（key=`cover-workbench-v2`）

### Agent 用（CLI）
```bash
node render-cover.mjs 图片.jpg -t "工业革命|几十亿人|置身事外" --manual
node render-cover.mjs 图片.jpg -t "日更100条|在割谁" -o out/
node render-cover.mjs 图片.jpg -t "标题" --dark 0.7 --sat 0.6 --ls 12 --json state.json
node render-cover.mjs 图片.jpg -t "标题" --preset presets/default.json
node render-cover.mjs --help        # 全部参数
```
输出 `<标题>-3x4.jpg`、`<标题>-4x3.jpg`。`*|*` 会被转成换行（`|`→`\n`）。

### 页面上的 Agent API（`window.__coverAPI`）
index.html 暴露了：
- `setImage(dataUrl)` — 注入图片（async，resolve 即完成渲染）
- `setParams(paramsObj)` — 合并参数并同步 UI
- `getState()` / `debug()` — 取状态 / 打印实际拟合字号+行数（调试用）
- `exportAll()` — 返回 `{'3x4':dataUrl,'4x3':dataUrl}`
- 页面加载完设 `window.__ready=true`

## 关键实现细节 / 坑

1. **Playwright 包路径**：本地没全局装 playwright，只有 npx 缓存。在 `render-cover.mjs` 的 `resolvePlaywright()` 里硬编码了候选绝对路径。当前生效的是 `/Users/eason/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs`(v1.62.1，匹配已装浏览器 chromium-1234)。**另一份 `31e32ef8478fbf80` 是 1.63.0-alpha 要 chromium-1237，已装但本机没有 1237，必须排后**。若以后 playwright 升级，需要重跑 `npx playwright install` 并同时改这两个路径。加载失败会报"找不到 playwright"。
2. **必须用 await 包裹动态 import 的 catch**——`import()` 失败是异步 rejection，直接 `try{return c()}catch{}` 会漏接。已在 `resolvePlaywright` 里改为 `await c()`。
3. **分行只认 `\n`，不认 `|`**。CLI 里 `--manual` 配合 `|` 会先 `.replace(/\|/g,'\n')`。工作台 textarea 直接按 `\n` 分行。
4. **`|` bug 已修**：之前 CLI 传 `|` 未转 `\n`，导致 11 字被当成一行缩到很小（218→82px）。现在必须先 replace。
5. **文字字号二分**：cap=`Math.min(W*0.26,260)`；`fits()` 用 `ctx.measureText` 量最大行宽 ≤ `W*0.84` 且总高 ≤ `H*0.78`。letterSpacing 用 `ctx.letterSpacing`（Chrome 支持），按 W/1080 缩放以保两比例一致。居中补偿 `x=W/2 - ls/2`。
6. **压暗公式验证**：`brightness(bri)` + `saturate(sat)` 画图，再叠 `rgba(0,0,0,dark)`。dark=0.62 时输出均值≈源×0.38，白字让 YAVG 略上浮（白字区 YMAX 到 255）。
7. `ctx.save()/restore()` 包整个 drawCanvas；filter 用完必须 `ctx.filter='none'` 否则污染后续绘制。
8. **文本框 fits() 公式**：文字宽 ≤ `effW - 2*boxPad*s`（effW=W*boxW，**有盒无盒都按 boxW**——无盒时拖手柄即调文字宽度/字号），总高约束 `(行数*lh + 2*boxPad)*s ≤ H*0.78`（含盒边距）。盒高=`行数*s*lh + 2*boxPad*s`；`ctx.roundRect`（不支持退 rect）；描边线宽 `max(2, s*0.03)`。
9. **字体是动态的**：`fontStack()` 按 `state.font` 返回宋体/黑体两栈（PingFang SC 等 macOS 系统字，别再写死 FONT_STACK 常量）。
10. **CLI 字符串参数坑**：`--box-style`/`--text-color`/`--font` 走 HASH 但值是字符串，**不在** parseFloat 循环里，需单独循环 `['boxStyle','textColor','font']` 直接赋值——曾经漏掉导致传了没效果。
11. **画布尺寸**：`fitCanvases()`（index.html 末尾）两个画布严格等高（3:4+4:3 并排总宽≈h×2.083，取 min(可用高, 可用宽×12/25)），resize debounce 重算。
12. **无图不渲染标题**：`drawCanvas` 里 `if (!img)` 直接 return；`computeTitle` 返回 null——交互测试必须先 setImage 才能拖标题。
13. **拖拽坐标换算**：`toLogical(e)` 用 canvas CSS rect 缩放回 1080/1440 逻辑坐标；拖动用增量（base+delta）避免中心吸附跳变；拖手柄 `boxW = clamp((p.x - cx)*2/W, 0.5, 1.0)`（以中心为锚）。
14. **选中框**：pointerdown 命中矩形时 `sel=true` 并**立即 render()**（否则只拖动才显示框）；点空白取消；`sel` 是全局变量两画布同步。⚠ 曾因批量编辑失败丢失 `let sel=false` 声明，导致 `sel is not defined`、setImage promise 永不 resolve（onload 回调中断）——修完必跑 smoke。
15. **Playwright 测试**：拖动/手柄测试前必须 setImage；手柄测试前先 setParams 复位 textX/textY（拖远手柄会出画布外）。
11. **画布 CSS 尺寸（v2 修复的交互问题）**：canvas 不设 CSS 尺寸时按像素 1:1 显示（1080/1440px），4:3 画布会撑爆视口。现在用 `fitCanvases()`（index.html 末尾）：两个画布严格等高（3:4+4:3 并排总宽≈h×2.083，取 min(可用高, 可用宽×12/25)），resize 时 debounce 重算。
12. **无图不渲染标题（v2 修复）**：`drawCanvas` 里 `if (!img)` 画完占位提示后**直接 return**，否则标题文字叠在「拖入图片开始」上（旧版 bug）。
13. **v1 旧参数污染（v2 修复）**：用户 localStorage 里存过脏参数（boost 0.8/lh 1.55/ls 28 等），v2 换 key `cover-workbench-v2`，不再读 v1。
14. **工作台自检脚本**：`test/ui-shot.mjs` 用 Playwright 开两个页面态（空图/载图）截图到 `test/out/ui-*.png`，可直接目视验收布局；`test/smoke.mjs` 冒烟（预设应用/导出/渲染 ALL PASS）。

## 参考图分析（本模型有视觉，直接看图）

用户给的参考图（临时剪贴板路径，会话过期）：

**1. `pi-clipboard-1d59c71a-*.png`（2940×1846）—— 剪映桌面版编辑器截图**：
- 中央预览画布：黄昏草地人物视频帧上，一个**半透明白色圆角文本框**，内含两行白色粗黑体「感觉靠谱 / AI 答案」，盒底有选中手柄
- 右侧文本属性面板：**字体=字由永逸未黑（黑体）、字号=25、字间距=0、行间距=0、颜色=白**（B/I/U 工具条）
- 底部是时间轴轨道（此前 ffmpeg 盲测曾把轨道误判为「底部文案块」，蓝色行其实是 pexels 视频轨道颜色）
- **结论**：参考风格=半透明白盒+黑体；但用户看过暗盒+宋体输出后**明确说“这个好看”**，故默认=fixed 暗盒+宋体，白盒黑体降级为可选 preset

**2. `pi-clipboard-d6ee7216-*.png` —— 默认风格输出（用户点赞的图）**：暗盒+白粗宋体 3 行大体，即当前 presets/default.json。

## 待办（接力窗口继续）

- [x] ~~用真实参考图校准默认 preset~~ → 已完成：用户拍板默认为暗盒+宋体（见上）；另存 capcut-light.json 白盒黑体款
- [x] ~~文本框引擎（盒子/透明度/内边距/圆角/盒宽/水平位置/文字颜色/字体切换）~~ → 已完成
- [x] ~~工作台「导出当前为 preset.json」「按 preset 应用」入口~~ → 已完成（预设下拉：默认款/剪映款，内置快照因 file:// 无法 fetch；应用时保留当前标题；「导出当前为 preset.json」下载完整参数）。冒烟测试 `test/smoke.mjs`（ALL PASS）
- [ ] ~~支持视频抽帧（拖入 mp4 → 拖时间轴选帧）~~ → **用户确认不做**（用户都是截图/剪贴板喂图）
- [x] ~~工作台 v2 极简重构（用户反馈：参数太多、交互不顺）~~ → 已完成：默认面只有 图/标题/样式/导出；高级参数折叠；无图不渲染标题；画布自适应不撑爆；LSK 换 v2 清脏参数；test/ui-shot.mjs + test/smoke.mjs 通过
- [x] ~~画布拖拽标题（移动/调大小）+ 默认无盒白字~~ → 已完成：选中框+手柄、增量拖动、boxW 替代盒宽滑块；用户确认字体 OK 但不要盒子
- [x] ~~自动暗度~~ → 已完成并默认开（用户拍板）：暗图少压/亮图多压，对比图 test/out/compare*.jpg 暗图/亮图两场景自动均优于固定值
- [x] ~~封装成 skill~~ → 已完成：~/.agents/skills/cover-maker/SKILL.md，触发词"封面/出封面/做封面"，内部调 render-cover.mjs
- [ ] （可选）文字阴影默认从 off 调成 on？——用户已看过暗盒款，觉得不需要阴影，保持 off

## 测试方式

**本模型有视觉能力**：`read` 工具读图片时图片会作为附件传入（如 `test/out/*.jpg`、参考图），可直接目视验收输出与参考图的一致性，无需 ffmpeg 盲测。ffmpeg signalstats 仅作为量化辅助（验压暗公式、亮度数值）。

```bash
ffmpeg -hide_banner -i out.jpg -vf "signalstats,metadata=print:file=-" -f null - 2>&1 | grep -E "YAVG|SATAVG"
```
