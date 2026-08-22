// 工作台 preset 入口冒烟测试
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(HTML_URL);
  await page.waitForFunction(() => window.__ready === true);

  // 1) 设一个用户标题
  await page.evaluate(p => window.__coverAPI.setParams({ title: '用户标题XYZ' }), {});
  let s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step1 标题=', JSON.stringify(s.title), '| boxStyle=', s.boxStyle);

  // 2) 应用剪映款 preset —— 标题应保留，样式应切换
  await page.selectOption('#presetSel', 'capcut-light');
  s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step2 标题=', JSON.stringify(s.title), '| boxStyle=', s.boxStyle, '| font=', s.font, '| boxAlpha=', s.boxAlpha);
  if (s.title !== '用户标题XYZ') throw new Error('FAIL: 应用预设改了标题');
  if (s.boxStyle !== 'light' || s.font !== 'sans') throw new Error('FAIL: 剪映款样式未应用');

  // 3) 应用默认款（无盒白字宋体）
  await page.selectOption('#presetSel', 'default');
  s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step3 标题=', JSON.stringify(s.title), '| boxStyle=', s.boxStyle, '| font=', s.font, '| boxShow=', s.boxShow, '| shadow=', s.shadow);
  if (s.boxStyle !== 'none' || s.font !== 'serif' || s.boxShow !== false) throw new Error('FAIL: 默认款样式未应用');

  // 3.5) 应用暗盒款
  await page.selectOption('#presetSel', 'darkbox');
  s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step3.5 标题=', JSON.stringify(s.title), '| boxStyle=', s.boxStyle);
  if (s.boxStyle !== 'dark') throw new Error('FAIL: 暗盒款样式未应用');

  // 3.6) 画布拖拽交互：选中→拖动→改 textX；拖手柄→改 boxW（需要先有图）
  const smSrc = readFileSync(resolve(__dirname, '..', 'test', 'src.png'));
  await page.evaluate(d => window.__coverAPI.setImage(d), 'data:image/png;base64,' + smSrc.toString('base64'));
  await page.selectOption('#presetSel', 'default');
  const box = await page.locator('#cv-3x4').boundingBox();
  const W = 1080, H = 1440;
  // 标题中心逻辑坐标 (540,720) → CSS
  const cx = box.x + 540 * (box.width / W);
  const cy = box.y + 720 * (box.height / H);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy - 40, { steps: 5 });
  await page.mouse.up();
  s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step3.6 拖动后 textX=', s.textX, 'textY=', s.textY);
  if (!(s.textX > 0.5 && s.textY < 0.5)) throw new Error('FAIL: 拖动标题未改变位置');
  // 手柄：复位位置后用 debug 返回的 rect 右下角定位
  await page.evaluate(() => window.__coverAPI.setParams({ textX: 0.5, textY: 0.5 }));
  const d = await page.evaluate(() => window.__coverAPI.debug());
  const hx = box.x + d.rect.x1 * (box.width / W);
  const hy = box.y + d.rect.y1 * (box.height / H);
  console.log('handle at', Math.round(hx), Math.round(hy), 'rect:', JSON.stringify(d.rect));
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx + 80, hy, { steps: 5 });
  await page.mouse.up();
  s = await page.evaluate(() => window.__coverAPI.getState());
  console.log('step3.7 拖手柄后 boxW=', s.boxW);
  if (!(s.boxW > 0.84)) throw new Error('FAIL: 拖手柄未改变 boxW');
  // 点空白取消选中
  await page.mouse.click(box.x + 20, box.y + 20);

  // 4) 导出 preset.json —— 触发下载事件
  const dlPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
  await page.click('#exportPreset');
  const dl = await dlPromise;
  if (!dl) throw new Error('FAIL: 未捕获到 preset.json 下载');
  const path = await dl.path();
  const txt = readFileSync(path, 'utf8');
  const p = JSON.parse(txt);
  console.log('step4 导出字段数=', Object.keys(p).length, '| dark=', p.dark, '| boxStyle=', p.boxStyle);
  if (typeof p.dark !== 'number' || typeof p.boxW !== 'number' || typeof p.title !== 'string') throw new Error('FAIL: preset.json 内容不对');

  // 5) 渲染一次确认没炸
  const out = await page.evaluate(async () => {
    const img = new Image();
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR4nGNkYBgFo2AUjIJRMAoGAAAEAAGFKQ0SAAAAAElFTkSuQmCC';
    await new Promise(r => { img.onload = r; });
    await window.__coverAPI.setImage(img.src);
    const u = window.__coverAPI.exportAll();
    return { '3x4': u['3x4'].length, '4x3': u['4x3'].length };
  });
  console.log('step5 exportAll 长度=', JSON.stringify(out));

  if (errors.length) throw new Error('页面报错: ' + errors.join(' | '));
  console.log('ALL PASS');
} finally {
  await browser.close();
}
