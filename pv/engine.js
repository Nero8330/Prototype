// DRONEFALL PV — deterministic frame engine.
// window.renderAt(t) draws the frame for time t (seconds). No wall-clock is used,
// so the renderer can capture any frame in any order.
(() => {
  const FPS = 30;
  const DUR = 87.0;
  // Beat grid measured from the BGM (Diamond Eyes - Flutter): 159.98 BPM, first beat 0.365s.
  const SPB = 60 / 159.98;
  const B0 = 0.365;
  const beat = (k) => B0 + SPB * k;
  const bar = (n) => Math.max(0, beat(4 * n - 1));

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  const easeOut = (p) => 1 - Math.pow(1 - p, 3);
  const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
  const easeIn = (p) => p * p * p;
  const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const backOut = (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); };
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  const SCENES = [];
  // pulse windows (high-energy parts of the track)
  const PULSE = [];

  function scene(t0, t1, bg, html, opts = {}) {
    SCENES.push({ t0, t1, bg, html, o: opts });
  }

  // ---------- background layers ----------
  function bgHTML(bg) {
    const L = (style, cls = '') => `<div class="layer ${cls}" style="${style}"></div>`;
    const T = (img, op, extra = '') => L(`background-image:url(assets/tex/${img});opacity:${op};${extra}`, 'tx');
    switch (bg) {
      case 'black':
        return L('background:radial-gradient(ellipse at 50% 45%,#161618 0%,#070708 75%)');
      case 'char':
        return L('background:#1b1c1f') + T('grunge_light.png', 0.3) +
          L('background:radial-gradient(ellipse at 50% 40%,rgba(255,255,255,.05),rgba(0,0,0,.4) 85%)');
      case 'grid':
        return L('background:#1d1f23') +
          L('background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:48px 48px,48px 48px,240px 240px,240px 240px;background-position:-1px -1px', 'tx') +
          T('grunge_light.png', 0.14) +
          L('background:radial-gradient(ellipse at 50% 50%,rgba(242,131,34,.07),rgba(0,0,0,.45) 85%)');
      case 'dred':
        return L('background:#140608') + T('grunge_light.png', 0.16) +
          L('background:radial-gradient(ellipse at 70% 50%,rgba(211,32,47,.28),rgba(0,0,0,0) 60%)');
      case 'paper':
        return L('background:#e3e3df') + T('map_dark.png', 0.5) + T('grunge_dark.png', 0.32) +
          L('background:radial-gradient(ellipse at 50% 45%,rgba(255,255,255,.35),rgba(0,0,0,.08) 90%)');
      case 'orange':
        return L('background:#E8721F') + T('mosaic.png', 1) + T('grunge_dark.png', 0.18) +
          L('background:radial-gradient(ellipse at 50% 45%,rgba(255,190,120,.25),rgba(120,40,0,.25) 90%)');
      case 'red':
        return L('background:#B21F2B') + T('mosaic.png', 1) + T('grunge_dark.png', 0.2) +
          L('background:radial-gradient(ellipse at 50% 45%,rgba(255,120,120,.12),rgba(60,0,5,.35) 90%)');
      case 'gray':
        return L('background:#5b5e63') + T('mosaic.png', 1) + T('grunge_light.png', 0.12) +
          L('background:radial-gradient(ellipse at 50% 45%,rgba(255,255,255,.08),rgba(0,0,0,.3) 90%)');
      case 'split': // light wedge top-left, charcoal bottom-right
        return L('background:#1b1c1f') + T('grunge_light.png', 0.28) +
          `<div class="layer" style="clip-path:polygon(0 0,74% 0,34% 100%,0 100%)"><div class="layer" style="background:#e3e3df"></div>${T('map_dark.png', 0.45)}${T('grunge_dark.png', 0.3)}</div>` +
          '<div class="layer" style="background:linear-gradient(to right,rgba(0,0,0,0),rgba(0,0,0,.25))"></div>';
      case 'split2': // charcoal left, light wedge right
        return L('background:#1b1c1f') + T('grunge_light.png', 0.28) +
          `<div class="layer" style="clip-path:polygon(66% 0,100% 0,100% 100%,48% 100%)"><div class="layer" style="background:#e3e3df"></div>${T('map_dark.png', 0.45)}${T('grunge_dark.png', 0.3)}</div>`;
      case 'split3': // light triangle bottom-left, charcoal top-right
        return L('background:#1b1c1f') + T('grunge_light.png', 0.28) +
          `<div class="layer" style="clip-path:polygon(0 0,10% 0,96% 100%,0 100%)"><div class="layer" style="background:#e3e3df"></div>${T('map_dark.png', 0.45)}${T('grunge_dark.png', 0.3)}</div>`;
      case 'band2': // light band on top, charcoal below
        return L('background:#1b1c1f') + T('grunge_light.png', 0.28) +
          `<div class="layer" style="clip-path:inset(0 0 calc(100% - 320px) 0)"><div class="layer" style="background:#e3e3df"></div>${T('map_dark.png', 0.45)}${T('grunge_dark.png', 0.3)}</div>`;
      case 'band': // charcoal with a red diagonal band (enemy)
        return L('background:#161719') + T('grunge_light.png', 0.22) +
          `<div class="layer" style="clip-path:polygon(0 30%,100% 18%,100% 62%,0 74%)"><div class="layer" style="background:#B21F2B"></div>${T('mosaic.png', 1)}${T('grunge_dark.png', 0.2)}</div>`;
      case 'versus': // orange left / red right, diagonal
        return `<div class="layer" style="background:#E8721F"></div>${T('mosaic.png', 1)}` +
          `<div class="layer" style="clip-path:polygon(58% 0,100% 0,100% 100%,42% 100%)"><div class="layer" style="background:#B21F2B"></div>${T('mosaic.png', 1)}</div>` +
          T('grunge_dark.png', 0.2);
      default:
        return L('background:#000');
    }
  }
  const FAMILY = { black: 'D', char: 'D', grid: 'D', dred: 'D', paper: 'L', orange: 'O', red: 'R', gray: 'G', split: 'S', split2: 'S', split3: 'S', band: 'S', band2: 'S', versus: 'S' };

  // ---------- DOM ----------
  const stage = document.getElementById('stage');
  const root = document.getElementById('scene');
  const ovFade = document.getElementById('fade');
  const ovFlash = document.getElementById('flash');
  const ovGrain = document.getElementById('grain');
  const ovVig = document.getElementById('vig');
  const glitch = document.getElementById('glitch');
  for (let i = 0; i < 14; i++) glitch.appendChild(document.createElement('i'));

  let curIdx = -1;
  let anims = [];
  let layers = [];

  function splitChars(el) {
    const walk = (node) => {
      for (const ch of [...node.childNodes]) {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const c of ch.textContent) {
            if (c === '\n') continue;
            const sp = document.createElement('span');
            sp.className = 'ch';
            sp.textContent = c;
            frag.appendChild(sp);
          }
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1 && ch.tagName !== 'BR') {
          walk(ch);
        }
      }
    };
    walk(el);
    return [...el.querySelectorAll('.ch')];
  }

  function parseSpec(str) {
    if (!str) return null;
    const [type, d = 0, dur = 0.5, st = 0.08] = str.trim().split(/\s+/);
    return { type, d: +d, dur: +dur, st: +st };
  }

  function build(i) {
    const s = SCENES[i];
    root.className = `scene bg-${s.bg} ${s.o.cls || ''}`;
    root.innerHTML = `<div class="bgwrap">${bgHTML(s.bg)}</div><div class="content">${s.html}</div>`;
    layers = [...root.querySelectorAll('.tx')];
    anims = [];
    root.querySelectorAll('[data-in],[data-out],[data-drift],[data-rot],[data-pulse],[data-count],[data-fall],[data-loop]').forEach((el, n) => {
      const a = { el, n, inn: parseSpec(el.dataset.in), out: parseSpec(el.dataset.out) };
      if (a.inn) {
        const t = a.inn.type;
        if (t === 'chars') a.targets = splitChars(el);
        else if (t.startsWith('kids-')) { a.targets = [...el.children]; a.kidType = t.slice(5); }
        else if (t === 'draw') {
          a.targets = [...el.querySelectorAll('path,circle,rect,line,polyline,polygon,ellipse')].filter((g) => g.getAttribute('stroke') !== 'none');
          a.targets.forEach((g) => {
            let len = 1000;
            try { len = g.getTotalLength(); } catch (e) { /* not measurable */ }
            g.style.strokeDasharray = `${len}`;
            g._len = len;
          });
          a.fills = [...el.querySelectorAll('[data-fill]')];
        } else if (t === 'type') { a.full = el.textContent; }
      }
      if (el.dataset.drift) a.drift = el.dataset.drift.split(/\s+/).map(Number);
      if (el.dataset.rot) a.rot = +el.dataset.rot;
      if (el.dataset.pulse !== undefined) a.pulse = +(el.dataset.pulse || 0.05);
      if (el.dataset.count) { const [to, d, dur] = el.dataset.count.split(/\s+/).map(Number); a.count = { to, d, dur, suffix: el.dataset.suffix || '' }; }
      if (el.dataset.fall) { const [from, d, dur] = el.dataset.fall.split(/\s+/).map(Number); a.fall = { from, d, dur }; }
      if (el.dataset.loop) { const [kind, period, amp] = el.dataset.loop.split(/\s+/); a.loop = { kind, period: +period, amp: +(amp || 1) }; }
      anims.push(a);
    });
    curIdx = i;
  }

  function styleFor(type, p, seed) {
    const e = easeOut(p);
    const x = easeOutExpo(p);
    const r = { o: 1, tx: 0, ty: 0, sc: 1, sx: 1, sy: 1, bl: 0, clip: '', ls: null };
    switch (type) {
      case 'fade': r.o = e; break;
      case 'up': r.o = e; r.ty = (1 - e) * 50; break;
      case 'down': r.o = e; r.ty = -(1 - e) * 50; break;
      case 'left': r.o = e; r.tx = (1 - x) * 120; break;
      case 'right': r.o = e; r.tx = -(1 - x) * 120; break;
      case 'zoom': r.o = e; r.sc = 1 + (1 - e) * 0.22; break;
      case 'zoomin': r.o = e; r.sc = 0.82 + 0.18 * e; break;
      case 'slam': r.o = Math.min(1, p * 6); r.sc = 1 + (1 - x) * 0.75; r.bl = (1 - x) * 16; break;
      case 'slamsmall': r.o = Math.min(1, p * 6); r.sc = 1 + (1 - x) * 0.25; r.bl = (1 - x) * 8; break;
      case 'blur': r.o = e; r.bl = (1 - e) * 18; break;
      case 'wipeR': r.clip = `inset(-10% ${(1 - x) * 100}% -10% -2%)`; break;
      case 'wipeL': r.clip = `inset(-10% -2% -10% ${(1 - x) * 100}%)`; break;
      case 'wipeD': r.clip = `inset(-2% -10% ${(1 - x) * 100}% -10%)`; break;
      case 'wipeU': r.clip = `inset(${(1 - x) * 100}% -10% -2% -10%)`; break;
      case 'sx': r.sx = x; break;
      case 'sy': r.sy = x; break;
      case 'pop': r.o = Math.min(1, p * 4); r.sc = p < 1 ? 0.5 + 0.5 * backOut(p) : 1; break;
      case 'flick': r.o = p >= 1 ? 1 : (hash(Math.floor(p * 14) + seed * 7.3) > 0.45 ? 1 : 0.12) * Math.min(1, p * 3); break;
      case 'track': r.o = e; r.ls = 1 - e; break; // letter-spacing expands from +x
      case 'none': break;
      default: r.o = e;
    }
    return r;
  }

  function applyStyle(el, r, extra) {
    const tr = `translate(${(r.tx + (extra.tx || 0)).toFixed(2)}px,${(r.ty + (extra.ty || 0)).toFixed(2)}px) scale(${(r.sc * (extra.sc || 1)).toFixed(4)}) scaleX(${r.sx.toFixed(4)}) scaleY(${r.sy.toFixed(4)}) rotate(${(extra.rot || 0).toFixed(2)}deg)`;
    el.style.transform = tr;
    el.style.opacity = (r.o * (extra.o === undefined ? 1 : extra.o)).toFixed(3);
    el.style.filter = r.bl > 0.05 ? `blur(${r.bl.toFixed(2)}px)` : '';
    if (r.clip) el.style.clipPath = r.clip; else if (el.style.clipPath) el.style.clipPath = '';
  }

  function pulseAt(t) {
    for (const [a, b] of PULSE) {
      if (t >= a && t < b) {
        const since = ((t - B0) % SPB + SPB) % SPB;
        return Math.exp(-since * 9);
      }
    }
    return 0;
  }

  function renderAt(t) {
    let i = SCENES.findIndex((s) => t >= s.t0 && t < s.t1);
    if (i < 0) i = SCENES.length - 1;
    if (i !== curIdx) build(i);
    const s = SCENES[i];
    const lt = t - s.t0;
    const D = s.t1 - s.t0;
    const frame = Math.round(t * FPS);
    const pv = pulseAt(t);

    for (const a of anims) {
      const el = a.el;
      const extra = { tx: 0, ty: 0, sc: 1, rot: 0, o: 1 };
      if (a.drift) { extra.tx += a.drift[0] * lt / D; extra.ty += a.drift[1] * lt / D; if (a.drift[2]) extra.sc *= 1 + a.drift[2] * lt / D; }
      if (a.rot) extra.rot += a.rot * lt;
      if (a.pulse) extra.sc *= 1 + a.pulse * pv;
      if (a.fall) { const p = clamp01((lt - a.fall.d) / a.fall.dur); extra.ty += a.fall.from * (1 - easeIn(p)); }
      if (a.loop) {
        const ph = (lt / a.loop.period) % 1;
        if (a.loop.kind === 'slide') { extra.tx += (ph - 0.5) * a.loop.amp; extra.o = Math.sin(ph * Math.PI); }
        if (a.loop.kind === 'ripple') { extra.sc *= 0.4 + ph * a.loop.amp; extra.o = 1 - ph; }
        if (a.loop.kind === 'rain') { extra.ty += ph * a.loop.amp; extra.o = Math.sin(ph * Math.PI); }
        if (a.loop.kind === 'blink') { extra.o = ph < 0.5 ? 1 : 0.2; }
        if (a.loop.kind === 'eq') { extra.sc = 1; el.style.transformOrigin = '50% 100%'; const v = 0.25 + 0.75 * Math.abs(Math.sin(lt * a.loop.amp + a.n * 1.7)) * (0.6 + 0.4 * pv); el.style.transform = `scaleY(${v.toFixed(3)})`; continue; }
      }
      if (a.out) {
        const p = clamp01((lt - (D - a.out.d)) / a.out.dur);
        extra.o *= 1 - easeOut(p);
      }
      if (a.count) {
        const p = easeOut(clamp01((lt - a.count.d) / a.count.dur));
        el.textContent = Math.round(a.count.to * p) + a.count.suffix;
      }
      const inn = a.inn;
      if (!inn) { applyStyle(el, styleFor('none', 1, a.n), extra); continue; }
      if (inn.type === 'chars') {
        a.targets.forEach((c, k) => {
          const p = clamp01((lt - inn.d - k * inn.st) / inn.dur);
          const e = easeOut(p);
          c.style.opacity = e.toFixed(3);
          c.style.filter = p < 1 ? `blur(${((1 - e) * 10).toFixed(2)}px)` : '';
        });
        applyStyle(el, styleFor('none', 1, a.n), extra);
      } else if (a.kidType) {
        a.targets.forEach((c, k) => {
          const p = clamp01((lt - inn.d - k * inn.st) / inn.dur);
          applyStyle(c, styleFor(a.kidType, p, a.n + k), {});
        });
        applyStyle(el, styleFor('none', 1, a.n), extra);
      } else if (inn.type === 'draw') {
        const p = clamp01((lt - inn.d) / inn.dur);
        const e = easeInOut(p);
        a.targets.forEach((g) => { g.style.strokeDashoffset = `${(g._len * (1 - e)).toFixed(2)}`; });
        a.fills.forEach((f) => { f.style.opacity = clamp01((p - 0.55) / 0.45).toFixed(3); });
        applyStyle(el, styleFor('fade', Math.min(1, p * 8), a.n), extra);
      } else if (inn.type === 'type') {
        const p = clamp01((lt - inn.d) / inn.dur);
        const n = Math.round(a.full.length * p);
        el.textContent = a.full.slice(0, n) + (p < 1 && p > 0 ? '▍' : '');
        applyStyle(el, styleFor('none', 1, a.n), { ...extra, o: extra.o * (p > 0 ? 1 : 0) });
      } else {
        const p = clamp01((lt - inn.d) / inn.dur);
        const r = styleFor(inn.type, p, a.n);
        if (r.ls !== null) el.style.letterSpacing = `calc(var(--ls, .1em) + ${(r.ls * 0.8).toFixed(3)}em)`;
        applyStyle(el, r, extra);
      }
    }

    // background drift + camera push
    layers.forEach((l, k) => { l.style.transform = `translate(${(-lt * (6 + k * 3)).toFixed(2)}px,${(lt * (k % 2 ? 2 : -2)).toFixed(2)}px)`; });
    const zoom = s.o.zoom === undefined ? 0.035 : s.o.zoom;
    const camSc = 1 + zoom * (lt / D) + (s.o.pulse ? 0.012 * pv : 0);
    root.querySelector('.content').style.transform = `scale(${camSc.toFixed(4)})`;

    // fades
    let fade = 0;
    if (s.o.fin) fade = Math.max(fade, 1 - easeOut(clamp01(lt / s.o.fin)));
    if (s.o.fout) fade = Math.max(fade, easeInOut(clamp01((lt - (D - s.o.fout)) / s.o.fout)));
    ovFade.style.opacity = fade.toFixed(3);

    // flash on cut
    if (s.o.flash) {
      const fd = s.o.flashDur || 0.16;
      const p = clamp01(lt / fd);
      ovFlash.style.background = s.o.flash;
      ovFlash.style.opacity = (1 - easeOut(p)).toFixed(3);
    } else ovFlash.style.opacity = 0;

    // glitch
    let g = 0;
    if (s.o.glitch && lt < s.o.glitch) g = 1;
    if (s.o.glitchEnd && lt > D - s.o.glitchEnd) g = Math.max(g, 0.8);
    if (s.o.glitchRamp) g = Math.max(g, hash(frame * 3.1) < Math.pow(lt / D, 2) * s.o.glitchRamp ? 1 : 0);
    const gcol = s.o.gcol || ['#F28322', '#e8e8e5', '#1b1c1f'];
    [...glitch.children].forEach((b, k) => {
      if (g > 0 && hash(frame * 13 + k) < 0.7) {
        b.style.display = 'block';
        b.style.top = `${(hash(frame * 7 + k * 3) * 1080).toFixed(0)}px`;
        b.style.height = `${(2 + hash(frame * 5 + k) * 34).toFixed(0)}px`;
        b.style.left = `${(hash(frame * 11 + k * 9) * 900 - 200).toFixed(0)}px`;
        b.style.width = `${(300 + hash(frame * 17 + k) * 1500).toFixed(0)}px`;
        b.style.background = gcol[k % gcol.length];
        b.style.opacity = (0.35 + hash(frame + k * 2) * 0.6).toFixed(2);
      } else b.style.display = 'none';
    });
    const content = root.querySelector('.content');
    if (g > 0) {
      const jx = (hash(frame * 1.7) - 0.5) * 60;
      content.style.transform += ` translateX(${jx.toFixed(1)}px)`;
    }

    // grain + vignette
    ovGrain.style.backgroundImage = `url(assets/tex/grain${frame % 6}.png)`;
    const fam = FAMILY[s.bg] || 'D';
    ovVig.style.opacity = fam === 'L' ? 0.35 : fam === 'D' ? 0.9 : 0.6;
    ovGrain.style.opacity = fam === 'L' ? 0.07 : 0.11;
  }

  function validate() {
    const issues = [];
    for (let i = 1; i < SCENES.length; i++) {
      const a = SCENES[i - 1], b = SCENES[i];
      if (Math.abs(a.t1 - b.t0) > 1e-6) issues.push(`gap/overlap before #${i} ${a.t1} → ${b.t0}`);
      if (a.bg === b.bg) issues.push(`same bg consecutively #${i - 1}/#${i}: ${a.bg}`);
      if (FAMILY[a.bg] === FAMILY[b.bg]) issues.push(`same bg family consecutively #${i - 1}/#${i}: ${a.bg}/${b.bg}`);
    }
    if (Math.abs(SCENES[SCENES.length - 1].t1 - DUR) > 1e-6) issues.push('last scene does not end at DUR');
    return issues;
  }

  window.PV = { FPS, DUR, SPB, B0, beat, bar, scene, SCENES, PULSE, validate, hash };
  window.renderAt = renderAt;
})();
