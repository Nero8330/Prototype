// Renders the PV with headless Chromium (Playwright) and muxes it with the BGM via ffmpeg.
//
//   node render.mjs stills <outDir> 1.5,12.3,40      -> PNG stills at the given times
//   node render.mjs video <bgm.mp3> <out.mp4> [workers] -> full 87 s video (30 fps)
//
// Frames are rendered deterministically through window.renderAt(t).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = (await import('node:module')).createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.evaluate(() => window.PV_READY);
  return page;
}

async function frameAt(page, t, file, type) {
  await page.evaluate((tt) => window.renderAt(tt), t);
  await page.screenshot({ path: file, type, quality: type === 'jpeg' ? 94 : undefined, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
}

const [mode, a1, a2, a3] = process.argv.slice(2);
const srv = await serve();
const port = srv.address().port;
const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-gpu-vsync'] });

try {
  if (mode === 'stills') {
    fs.mkdirSync(a1, { recursive: true });
    const page = await openPage(browser, port);
    const issues = await page.evaluate(() => window.PV.validate());
    if (issues.length) console.log('storyboard issues:\n  ' + issues.join('\n  '));
    for (const t of a2.split(',').map(Number)) {
      const f = path.join(a1, `t${t.toFixed(2).padStart(6, '0')}.png`);
      await frameAt(page, t, f, 'png');
      console.log(f);
    }
  } else if (mode === 'video') {
    const bgm = a1, out = a2;
    const workers = +(a3 || Math.max(1, Math.min(4, os.cpus().length)));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dfpv-'));
    const probe = await openPage(browser, port);
    const { FPS, DUR, issues } = await probe.evaluate(() => ({ FPS: window.PV.FPS, DUR: window.PV.DUR, issues: window.PV.validate() }));
    await probe.close();
    if (issues.length) console.log('storyboard issues:\n  ' + issues.join('\n  '));
    const N = Math.round(FPS * DUR);
    let done = 0;
    const t0 = Date.now();
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const page = await openPage(browser, port);
      // contiguous chunks keep scene DOM rebuilds to a minimum
      const per = Math.ceil(N / workers);
      for (let i = w * per; i < Math.min(N, (w + 1) * per); i++) {
        await frameAt(page, i / FPS, path.join(tmp, `f${String(i).padStart(5, '0')}.jpg`), 'jpeg');
        if (++done % 150 === 0) console.log(`frames ${done}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      }
      await page.close();
    }));
    console.log('encoding…');
    const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
      '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'),
      '-ss', '0', '-t', String(DUR), '-i', bgm,
      '-filter_complex', `[1:a]atrim=0:${DUR},afade=t=out:st=${(DUR - 1.4).toFixed(2)}:d=1.4[a]`,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS),
      '-c:a', 'aac', '-b:a', '256k', '-t', String(DUR), '-movflags', '+faststart', out], { stdio: 'inherit' });
    const code = await new Promise((r) => ff.on('close', r));
    fs.rmSync(tmp, { recursive: true, force: true });
    if (code !== 0) throw new Error(`ffmpeg exited ${code}`);
    console.log('wrote', out);
  } else {
    console.log('usage: node render.mjs stills <dir> <t,t,...> | video <bgm.mp3> <out.mp4> [workers]');
  }
} finally {
  await browser.close();
  srv.close();
}
