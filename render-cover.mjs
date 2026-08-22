#!/usr/bin/env node
// 封面工作台 CLI —— 复用同一份 index.html 渲染，保证与人工调参视觉一致。
// 用法:
//   node render-cover.mjs <图片> -t "标题"
//   node render-cover.mjs <图片> -t "行1|行2|行3" --manual        # 手动分行
//   node render-cover.mjs <图片> -t "标题" -o out/ --preset preset.json
//   node render-cover.mjs <图片> -t "标题" --dark 0.7 --sat 0.6 --ls 12 --json state.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_PATH = resolve(__dirname, 'index.html');
const HTML_URL = 'file://' + HTML_PATH;

const HASH = {
  '-t': 'title', '--title': 'title',
  '-o': 'out', '--out': 'out',
  '--preset': 'preset',
  '--json': 'json',
  '--dark': 'dark', '--sat': 'sat', '--bri': 'bri', '--blur': 'blur',
  '--pos': 'textY', '--text-x': 'textX',
  '--boost': 'boost', '--lh': 'lh', '--ls': 'ls',
  '--weight': 'weight', '--max-chars': 'maxChars', '--font': 'font',
  '--box-style': 'boxStyle', '--box-alpha': 'boxAlpha',
  '--box-pad': 'boxPad', '--box-round': 'boxRound', '--box-w': 'boxW',
  '--text-color': 'textColor',
  '-q': 'quality', '--quality': 'quality'
};

function parseArgs(argv) {
  const out = { title: null, files: [], flag: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--manual') { out.flag.manual = true; continue; }
    if (a === '--shadow') { out.flag.shadow = true; continue; }
    if (a === '--box-show') { out.flag.boxShow = true; continue; }
    if (a === '--auto-dark') { out.flag.autoDark = true; continue; }
    if (a === '--no-box') { out.flag.noBox = true; continue; }
    if (a === '--help' || a === '-h') { out.flag.help = true; continue; }
    if (HASH[a]) {
      const v = argv[++i];
      out[HASH[a]] = v;
    } else if (a.startsWith('--') || a.startsWith('-')) {
      out.flag.unknown = a;
    } else {
      out.files.push(a);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.flag.help) {
  console.log(`封面工作台 CLI

用法:
  node render-cover.mjs <图片> -t "标题" [选项]

选项:
  -t, --title "标题"        标题文字；用 | 分隔多行配合 --manual
  --manual                  手动分行（不自动均衡分行）
  -o, --out <目录>          输出目录（默认同目录）
  --preset <file.json>      从 preset 读参数（命令行可覆盖）
  --json <file.json>        把最终使用的参数写到文件
  --dark <0~0.9>            压暗度（默认 0.62；autoDark 开启时忽略）
  --auto-dark                自动暗度（按图片平均亮度自适应）
  --sat <0~1>               饱和度（默认 0.8）
  --bri <0.6~1.4>           亮度（默认 1.0）
  --blur <0~30>             背景模糊 px（默认 0）
  --pos <0.15~0.85>         标题垂直位置（默认 0.5）
  --text-x <0.2~0.8>        标题/盒子水平位置（默认 0.5）
  --box-show / --no-box     开通/关闭文本框背景（默认通）
  --box-style <dark|light|outline|none>  盒子样式（默认 dark 黑盒）
  --box-alpha <0.08~0.9>    盒子透明度（默认 0.32）
  --box-pad <0~0.3>         盒内边距（相对字号，默认 0.16）
  --box-round <0~40>        盒子圆角 px（默认 14）
  --box-w <0.5~1>           盒宽占画面比例（默认 0.88）
  --text-color <white|black> 文字颜色（默认 white）
  --boost <0.5~1.5>         字号微调系数（默认 1.0）
  --lh <1~2>                行高（默认 1.45）
  --ls <0~40>               字距 px（默认 8）
  --weight <400~900>        字重（默认 900）
  --font <serif|sans>       字体：serif=宋体（默认）/ sans=黑体（参考图）
  --max-chars <2~10>        自动分行每行最多字数（默认 5）
  --shadow                  文字阴影
  -q, --quality <0~100>     JPG 质量（默认 92）
  --json <file.json>        保存最终参数
  -o, --out <dir>           输出目录

输出:
  <标题>-3x4.jpg / <标题>-4x3.jpg`);
  process.exit(0);
}

if (!args.files.length) {
  console.error('缺少图片参数。用 --help 查看用法。');
  process.exit(1);
}
if (!args.title) {
  console.error('缺少标题参数 -t。用 --help 查看用法。');
  process.exit(1);
}

function slug(s) {
  return (s || 'cover').replace(/\s+/g, '-').replace(/[\\/:*?"<>|\n]/g, '').slice(0, 40) || 'cover';
}
function mimeOf(path) {
  const ext = path.split('.').pop().toLowerCase();
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext] || 'image/jpeg';
}

function loadPreset(p) {
  if (!p) return {};
  try { return JSON.parse(readFileSync(resolve(p), 'utf8')); } catch (e) {
    console.error('preset 读取失败:', e.message); return {};
  }
}

const preset = loadPreset(args.preset);
const params = {
  ...preset,
  title: args.title.replace(/\|/g, '\n'),
  ...(args.flag.manual ? { autoSplit: false } : {}),
  ...(args.flag.shadow ? { shadow: true } : {}),
  ...(args.flag.boxShow ? { boxShow: true } : {}),
  ...(args.flag.autoDark ? { autoDark: true } : {}),
  ...(args.flag.noBox ? { boxShow: false } : {})
};
for (const k of ['dark', 'sat', 'bri', 'blur', 'textY', 'textX', 'boost', 'lh', 'ls', 'weight', 'maxChars', 'boxAlpha', 'boxPad', 'boxRound', 'boxW']) {
  if (args[k] !== undefined) params[k] = parseFloat(args[k]);
}
for (const k of ['boxStyle', 'textColor', 'font']) {
  if (args[k] !== undefined) params[k] = args[k];
}

async function resolvePlaywright() {
  const candidates = [
    () => import('/Users/eason/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'),
    () => import('/Users/eason/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs'),
    () => import('playwright')
  ];
  for (const c of candidates) {
    try { return await c(); } catch {}
  }
  throw new Error('找不到 playwright。请 npm i -g playwright 或安装到任意 node_modules。');
}

async function main() {
  const imagePath = resolve(args.files[0]);
  const data = readFileSync(imagePath);
  const dataUrl = `data:${mimeOf(imagePath)};base64,${data.toString('base64')}`;

  const outDir = resolve(args.out || dirname(imagePath));
  mkdirSync(outDir, { recursive: true });

  const { chromium } = await resolvePlaywright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on('console', msg => { if (msg.type() === 'error') console.error('[page]', msg.text()); });
    await page.goto(HTML_URL);
    await page.waitForFunction(() => window.__ready === true);
    await page.evaluate(d => window.__coverAPI.setImage(d), dataUrl);
    await page.evaluate(p => window.__coverAPI.setParams(p), params);
    await page.evaluate(async () => { await document.fonts.ready; });
    const urls = await page.evaluate(() => window.__coverAPI.exportAll());
    const base = slug(params.title);
    const files = [];
    for (const ratio of ['3x4', '4x3']) {
      const file = resolve(outDir, `${base}-${ratio}.jpg`);
      const buf = Buffer.from(urls[ratio].split(',')[1], 'base64');
      writeFileSync(file, buf);
      files.push(file);
    }
    if (args.json) writeFileSync(resolve(args.json), JSON.stringify(params, null, 2));
    console.log(files.join('\n'));
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });