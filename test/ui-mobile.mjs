// 手机端视口验证：iPhone 尺寸下布局堆叠、画布不溢出、触控拖标题、双指捏合缩放
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HTML_URL = 'file://' + resolve(__dirname, '..', 'index.html');

async function resolvePlaywright() {
  const candidates = [
    () => import('/Users/eason/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs'),
    () => import('/Users/eason/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs'),
    () => import('playwright')
  ];
  for (const c of candidates) {
    try { return await c(); } catch {}
  }
  throw new Error('找不到 playwright');
}

const { chromium } = await resolvePlaywright();
const browser = await chromium.launch();
const results = [];
const ok = (name, pass, extra = '') => {
  results.push({ name, pass, extra });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  ' + extra : ''));
};

try {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },   // iPhone 14 逻辑尺寸
    hasTouch: true, isMobile: true, deviceScaleFactor: 3
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(HTML_URL);
  await page.waitForFunction(() => window.__ready === true);
  const emptyText = await page.evaluate(() => document.getElementById('drop').innerText.trim());
  ok('空态文案=「点击选择图片」（手机第一步）', emptyText.startsWith('点击选择图片'), JSON.stringify(emptyText));
  await page.screenshot({ path: resolve(__dirname, 'out', 'ui-mobile-empty.png'), fullPage: true });

  // 无图时切换样式也要可见（样式预览：换白字宋体/暗盒款画布内容应变化）
  const sampleSwitch = await page.evaluate(async () => {
    const cv = () => document.getElementById('cv-3x4').toDataURL();
    const before = (await cv()).length;
    const sel = document.getElementById('presetSel');
    sel.value = 'darkbox'; sel.dispatchEvent(new Event('input', { bubbles: true }));   // iOS 常走 input
    const afterDark = (await cv()).length;
    sel.value = 'default'; sel.dispatchEvent(new Event('change', { bubbles: true }));
    const afterDefault = (await cv()).length;
    return { changed: before !== afterDark && afterDark !== afterDefault };
  });
  ok('无图换样式：预览即时变化（样式预览）', sampleSwitch.changed);

  // 载入测试图
  const data = readFileSync(resolve(__dirname, 'src.png'));
  await page.evaluate(d => window.__coverAPI.setImage(d), 'data:image/png;base64,' + data.toString('base64'));
  await page.screenshot({ path: resolve(__dirname, 'out', 'ui-mobile-loaded.png'), fullPage: true });

  const layout = await page.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect();
    const aside = document.querySelector('aside').getBoundingClientRect();
    const c34 = document.getElementById('cv-3x4').getBoundingClientRect();
    const c43 = document.getElementById('cv-4x3').getBoundingClientRect();
    const drop = document.getElementById('drop').getBoundingClientRect();
    return {
      mainAboveAside: main.top < aside.top,
      asideFullWidth: aside.width >= 389,
      c34: { w: Math.round(c34.width), h: Math.round(c34.height) },
      c43: { w: Math.round(c43.width), h: Math.round(c43.height) },
      row: c34.right <= c43.left + 2,                        // 两画布并排一行
      compact: c34.height <= window.innerHeight * 0.32,      // 小预览条
      pickerInFirstView: drop.top >= 0 && drop.bottom <= window.innerHeight   // 选图=第一步，首屏可见
    };
  });
  ok('预览在面板之上（order:-1）', layout.mainAboveAside);
  ok('侧栏占满宽度', layout.asideFullWidth);
  ok('两画布并排成一行小预览', layout.row, `3x4=${layout.c34.w}×${layout.c34.h} 4x3=${layout.c43.w}×${layout.c43.h}`);
  ok('预览条够小（≤32vh）', layout.compact);
  ok('「点击选择图片」首屏可见（第一步）', layout.pickerInFirstView);

  // 双指捏合缩放（合成 PointerEvent，1.5 倍距离 → zoom ≈ 1.5）
  const pinch = await page.evaluate(async () => {
    const cv = document.getElementById('cv-3x4');
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const ev = (type, id, cx, cy) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: id, clientX: cx, clientY: cy, bubbles: true, cancelable: true
    }));
    ev('pointerdown', 1, x - 40, y);
    ev('pointerdown', 2, x + 40, y);
    ev('pointermove', 2, x + 80, y);           // 距离 80 → 120
    ev('pointerup', 1, x - 40, y);
    ev('pointerup', 2, x + 80, y);
    return window.__coverAPI.getState().crops['3x4'].zoom;
  });
  ok('双指捏合缩放生效', Math.abs(pinch - 1.5) < 0.01, `zoom=${pinch.toFixed(3)}（期望≈1.5）`);

  // 触控拖标题（pointer 事件链：按下→移动→抬起）
  const drag = await page.evaluate(async () => {
    const cv = document.getElementById('cv-3x4');
    const r = cv.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const before = window.__coverAPI.getState();
    const ev = (type, cx, cy) => cv.dispatchEvent(new PointerEvent(type, {
      pointerId: 9, clientX: cx, clientY: cy, bubbles: true, cancelable: true
    }));
    ev('pointerdown', x, y);                    // 默认标题居中 → 命中标题
    ev('pointermove', x + 30, y + 20);
    ev('pointerup', x + 30, y + 20);
    const after = window.__coverAPI.getState();
    return { moved: after.textX !== before.textX && after.textY !== before.textY };
  });
  ok('触控拖动标题移动位置', drag.moved);

  // 手机导出：结果面板必须出现且带两张图（长按保存兜底路径）
  const exp = await page.evaluate(async () => {
    document.getElementById('exportJpg').click();
    await new Promise(r => setTimeout(r, 400));
    const panel = document.getElementById('exportResult');
    const a = document.getElementById('ex34'), b = document.getElementById('ex43');
    return {
      panelShown: !panel.classList.contains('hidden'),
      bothImgs: a.naturalWidth > 0 && b.naturalWidth > 0
    };
  });
  ok('导出出结果面板（长按保存兜底）', exp.panelShown);
  ok('结果面板含两张封面', exp.bothImgs);

  ok('无 JS 报错', errors.length === 0, errors.join(' | '));
  await ctx.close();

  // 桌面回归：布局仍横排
  const dctx = await browser.newContext({ viewport: { width: 1680, height: 950 } });
  const dpage = await dctx.newPage();
  await dpage.goto(HTML_URL);
  await dpage.waitForFunction(() => window.__ready === true);
  const desk = await dpage.evaluate(() => {
    const main = document.querySelector('main').getBoundingClientRect();
    const aside = document.querySelector('aside').getBoundingClientRect();
    return { sideBySide: main.left >= aside.right - 1 && aside.width === 360 };
  });
  ok('桌面布局不受影响（横排 + 360 侧栏）', desk.sideBySide);
  await dctx.close();
} finally {
  await browser.close();
}

const failed = results.filter(r => !r.pass);
console.log(failed.length ? `\n${failed.length} 项失败` : '\nALL PASS');
process.exit(failed.length ? 1 : 0);
