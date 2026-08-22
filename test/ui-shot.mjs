// 工作台 v2 截图自查：打开页面截初始态 + 拖图后态
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
  const page = await browser.newPage({ viewport: { width: 1680, height: 950 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(HTML_URL);
  await page.waitForFunction(() => window.__ready === true);
  await page.screenshot({ path: resolve(__dirname, 'out', 'ui-empty.png') });

  // 拖入图片（Node 侧读文件，再传入页面）
  const { readFileSync } = await import('node:fs');
  const data = readFileSync(resolve(__dirname, '..', 'test', 'src.png'));
  await page.evaluate(d => window.__coverAPI.setImage(d), 'data:image/png;base64,' + data.toString('base64'));
  await page.screenshot({ path: resolve(__dirname, 'out', 'ui-loaded.png') });

  const info = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return { canvasCss: { w: c.clientWidth, h: c.clientHeight }, asideW: document.querySelector('aside').clientWidth };
  });
  console.log('canvas CSS 尺寸:', JSON.stringify(info.canvasCss), 'aside:', info.asideW);
  if (errors.length) console.log('页面报错:', errors.join(' | '));
  else console.log('无页面报错');
} finally {
  await browser.close();
}
