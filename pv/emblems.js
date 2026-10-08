// Logos / emblems for the PV, drawn as inline SVG so they can be line-drawn ("draw" animation) and recoloured.
// Elements that only carry a fill are tagged data-fill so they fade in after the outlines are drawn.
(() => {
  let uid = 0;
  const f = (n) => (Math.abs(n) < 1e-9 ? '0' : n.toFixed(2));
  const rad = (d) => (d * Math.PI) / 180;
  const P = (r, deg) => [Math.cos(rad(deg)) * r, Math.sin(rad(deg)) * r];
  const pts = (arr) => arr.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  const svg = (w, h, vb, body, stroke) =>
    `<svg class="ico" width="${f(w)}" height="${f(h)}" viewBox="${vb}" fill="none" stroke="${stroke}" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

  // ---------- primitives ----------
  const ticks = (r1, r2, n, longEvery, rLong, sw = 1, a0 = -90) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = a0 + (k * 360) / n;
      const [x1, y1] = P(r1, a);
      const [x2, y2] = P(longEvery && k % longEvery === 0 ? rLong : r2, a);
      s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${sw}"/>`;
    }
    return s;
  };
  const ringText = (r, text, size, col, spacing = 2) => {
    const id = `rt${uid++}`;
    return `<defs><path id="${id}" d="M ${f(-r)} 0 A ${f(r)} ${f(r)} 0 1 1 ${f(r)} 0 A ${f(r)} ${f(r)} 0 1 1 ${f(-r)} 0"/></defs>` +
      `<text font-family="Corm" font-weight="700" font-size="${size}" letter-spacing="${spacing}" fill="${col}" stroke="none" data-fill><textPath href="#${id}">${text}</textPath></text>`;
  };
  // faceted (two-tone) star: every point is split into a lit and a shaded triangle
  const facetStar = (n, rOut, rIn, col, rot = -90, dark = 0.42, outline = true) => {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = rot + (k * 360) / n;
      const tip = P(rOut, a), l = P(rIn, a - 180 / n), r = P(rIn, a + 180 / n);
      s += `<polygon points="${pts([[0, 0], tip, l])}" fill="${col}" stroke="none" data-fill/>`;
      s += `<polygon points="${pts([[0, 0], tip, r])}" fill="${col}" fill-opacity="${dark}" stroke="none" data-fill/>`;
      if (outline) s += `<polyline points="${pts([l, tip, r])}" stroke-width="1"/>`;
    }
    return s;
  };
  const hexPts = (r, rot = -90) => Array.from({ length: 6 }, (_, k) => P(r, rot + k * 60));
  const diamond = (x, y, r, col) => `<polygon points="${pts([[x, y - r], [x + r * 0.7, y], [x, y + r], [x - r * 0.7, y]])}" fill="${col}" stroke="none" data-fill/>`;
  const star4 = (x, y, r, col) => `<polygon points="${pts([[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]])}" fill="${col}" stroke="none" data-fill/>`;

  // icon from assets/icons.js
  window.ic = (name, size = 64, sw = 1.4, extra = '') =>
    `<svg class="ico" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${window.ICONS[name]}</svg>`;

  // ornate icon badge (circle / hex / diamond frame with bezel ticks)
  window.badge = (name, size, col = 'currentColor', acc = '#F28322', shape = 'circle') => {
    let s = '';
    if (shape === 'circle') {
      s += '<circle r="57" stroke-width="2.2"/><circle r="51" stroke-width=".8"/>';
      s += ticks(51, 47, 48, 4, 44, 0.9);
      s += '<circle r="40" stroke-width="1.2"/>';
      for (const a of [-90, 0, 90, 180]) { const [x, y] = P(57, a); s += diamond(x, y, 4.5, a === 90 ? acc : col); }
    } else if (shape === 'hex') {
      s += `<polygon points="${pts(hexPts(57))}" stroke-width="2.2"/><polygon points="${pts(hexPts(49))}" stroke-width=".8"/>`;
      for (const [x, y] of hexPts(53)) s += `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="${col}" stroke="none" data-fill/>`;
      s += '<circle r="38" stroke-width=".8" stroke-dasharray="2 3"/>';
      s += diamond(0, 49, 4, acc);
    } else {
      s += `<polygon points="${pts([[0, -58], [58, 0], [0, 58], [-58, 0]])}" stroke-width="2.2"/>`;
      s += `<polygon points="${pts([[0, -49], [49, 0], [0, 49], [-49, 0]])}" stroke-width=".8"/>`;
      for (const a of [45, 135, 225, 315]) { const [x1, y1] = P(36, a); const [x2, y2] = P(44, a); s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="1"/>`; }
      s += diamond(0, 58, 5, acc);
    }
    s += `<g transform="translate(-24 -24) scale(2)" stroke-width="1.25">${window.ICONS[name]}</g>`;
    return svg(size, size, '-62 -62 124 124', s, col);
  };

  function laurel(cx, cy, R, a0, a1, n, col, mirror) {
    let s = '';
    const sx = mirror ? -1 : 1;
    for (let k = 0; k < n; k++) {
      const a = a0 + ((a1 - a0) * k) / (n - 1);
      const [px, py] = P(R, a);
      const x = cx + px * sx, y = cy + py;
      const side = k % 2 ? 1 : -1;
      const deg = (a + 90 + side * 38) * sx + (mirror ? 180 : 0);
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="10" ry="3.9" transform="rotate(${f(deg)} ${f(x)} ${f(y)})" fill="${col}" fill-opacity="${k % 2 ? 0.95 : 0.7}" stroke="none" data-fill/>`;
    }
    const line = [];
    for (let k = 0; k <= 20; k++) { const [px, py] = P(R, a0 + ((a1 - a0) * k) / 20); line.push([cx + px * sx, cy + py]); }
    s += `<polyline points="${pts(line)}" stroke="${col}" stroke-width="1.4"/>`;
    return s;
  }

  // ---------- 第零特設班 (落下班) crest — player side ----------
  window.embSquad = (size, col = 'currentColor', acc = '#F28322', bg = '#5b5e63') => {
    let s = '';
    // wings
    const feathers = [
      [[-58, -52], [-124, -84], [-114, -66], [-58, -40]],
      [[-58, -36], [-128, -56], [-117, -40], [-58, -24]],
      [[-58, -20], [-124, -24], [-112, -10], [-58, -8]],
      [[-58, -4], [-114, 8], [-102, 20], [-58, 8]],
    ];
    feathers.forEach((fe, k) => {
      for (const m of [1, -1]) {
        const q = fe.map(([x, y]) => [x * m, y]);
        s += `<polygon points="${pts(q)}" fill="${col}" fill-opacity="${k % 2 ? 0.16 : 0.34}" stroke-width="1.3" data-fill/>`;
      }
    });
    // shield (outer, bevel, inner)
    const shield = 'M0 -88 L64 -67 L64 6 C64 53 35 82 0 98 C-35 82 -64 53 -64 6 L-64 -67 Z';
    s += `<path d="${shield}" fill="${bg}" fill-opacity=".9" stroke="none" data-fill/>`;
    s += `<path d="${shield}" stroke-width="5"/>`;
    s += `<path d="M0 -76 L53 -58 L53 6 C53 45 29 70 0 84 L0 -76 Z" fill="${col}" fill-opacity=".09" stroke="none" data-fill/>`;
    s += '<path d="M0 -76 L53 -58 L53 6 C53 45 29 70 0 84 C-29 70 -53 45 -53 6 L-53 -58 Z" stroke-width="1.4"/>';
    // crest spikes
    s += `<polygon points="${pts([[-28, -76], [-22, -102], [-11, -86], [0, -116], [11, -86], [22, -102], [28, -76]])}" fill="${col}" stroke-width="1.5" data-fill/>`;
    s += diamond(0, -96, 5, acc);
    s += star4(-42, -98, 6, acc) + star4(42, -98, 6, acc);
    // drone (top view)
    s += '<g transform="translate(0 -26)">';
    for (const [x, y] of [[-30, -21], [30, -21], [-30, 21], [30, 21]]) {
      const a = Math.atan2(y, x), nx = -Math.sin(a) * 3.2, ny = Math.cos(a) * 3.2;
      s += `<polygon points="${pts([[nx, ny], [x + nx, y + ny], [x - nx, y - ny], [-nx, -ny]])}" fill="${col}" stroke="none" data-fill/>`;
      s += `<circle cx="${x}" cy="${y}" r="12.5" stroke-width="2.6"/>`;
      s += `<path d="M${x - 8} ${y - 3} A 8.5 8.5 0 0 1 ${x + 3} ${y - 8}" stroke="${acc}" stroke-width="1.6"/>`;
      s += `<path d="M${x + 8} ${y + 3} A 8.5 8.5 0 0 1 ${x - 3} ${y + 8}" stroke="${acc}" stroke-width="1.6"/>`;
      s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${col}" stroke="none" data-fill/>`;
    }
    s += `<polygon points="${pts(hexPts(12, 0))}" fill="${col}" stroke-width="1.5" data-fill/>`;
    s += `<circle r="4" fill="${acc}" stroke="none" data-fill/>`;
    s += '</g>';
    // falling chevrons
    s += '<path d="M-20 4 L0 20 L20 4" stroke-width="5.5"/>';
    s += `<path d="M-20 20 L0 36 L20 20" stroke="${acc}" stroke-width="5.5"/>`;
    s += `<path d="M-14 38 L0 49 L14 38" stroke="${acc}" stroke-width="3" stroke-opacity=".6"/>`;
    // squad number
    s += '<circle cx="0" cy="66" r="9.5" stroke-width="1.4"/>';
    s += `<text x="0" y="70.5" text-anchor="middle" font-family="Corm" font-weight="700" font-size="13" fill="${col}" stroke="none" data-fill>0</text>`;
    // laurels
    s += laurel(0, 12, 94, 96, 188, 15, col, false) + laurel(0, 12, 94, 96, 188, 15, col, true);
    // ribbon
    s += `<polygon points="${pts([[-96, 106], [-126, 108], [-114, 120], [-126, 134], [-96, 128]])}" fill="${col}" fill-opacity=".55" stroke-width="1.3" data-fill/>`;
    s += `<polygon points="${pts([[96, 106], [126, 108], [114, 120], [126, 134], [96, 128]])}" fill="${col}" fill-opacity=".55" stroke-width="1.3" data-fill/>`;
    s += `<path d="M-100 102 Q0 120 100 102 L100 126 Q0 144 -100 126 Z" fill="${col}" stroke-width="1.5" data-fill/>`;
    const id = `rb${uid++}`;
    s += `<defs><path id="${id}" d="M-90 117.5 Q0 135.5 90 117.5"/></defs>`;
    s += `<text font-family="Corm" font-weight="700" font-size="11" fill="${bg}" stroke="none" data-fill><textPath href="#${id}" startOffset="50%" text-anchor="middle" textLength="160" lengthAdjust="spacingAndGlyphs">ARMA CADUNT · VITA MANET</textPath></text>`;
    return svg(size, (size * 280) / 260, '-130 -122 260 280', s, col);
  };

  // ---------- フロンティア city crest ----------
  window.embFrontier = (size, col = 'currentColor', acc = '#F28322') => {
    let s = '';
    s += '<circle r="106" stroke-width="1.2"/><circle r="100" stroke-width="2.8"/>';
    s += ticks(100, 95, 72, 6, 90, 1);
    s += '<circle r="88" stroke-width=".9"/><circle r="70" stroke-width="1.8"/>';
    s += ringText(76, 'FRONTIER ◆ SPECIAL DEFENSE CITY ◆ EST. 2071 ◆ NINE WARDS ◆', 9.6, col, 1.6);
    // nine-pointed star fort
    const fort = [];
    for (let k = 0; k < 18; k++) fort.push(P(k % 2 ? 50 : 66, -90 + k * 20));
    s += `<polygon points="${pts(fort)}" fill="${col}" fill-opacity=".08" stroke="none" data-fill/>`;
    s += `<polygon points="${pts(fort)}" stroke-width="1.6"/>`;
    for (let k = 0; k < 9; k++) { const [x, y] = P(59, -90 + k * 40); s += diamond(x, y, 3.6, k === 1 ? acc : col); }
    s += '<circle r="40" stroke-width=".9" stroke-dasharray="2 3"/>';
    // compass star (faceted) + diagonal accent points
    s += facetStar(4, 26, 5, acc, -45, 0.5, false);
    s += facetStar(4, 58, 8, col, -90, 0.38);
    s += '<circle r="5.5" stroke-width="1.6"/>';
    s += `<circle r="2" fill="${acc}" stroke="none" data-fill/>`;
    return svg(size, size, '-110 -110 220 220', s, col);
  };

  // ---------- enemy — the Machine King's seal (crown, halo of blade-bits, slit eye, 律線) ----------
  window.embKing = (size, col = '#D3202F', line = '#D3202F') => {
    let s = '';
    for (let k = 0; k < 30; k++) {
      const a = -90 + (k * 360) / 30;
      if (Math.abs(((a + 90 + 540) % 360) - 180) > 140) continue; // leave room for the crown
      const L = k % 2 ? 104 : 126;
      const tip = P(L, a), l = P(82, a - 2.6), r = P(82, a + 2.6), m = P(90, a);
      s += `<polygon points="${pts([l, tip, m])}" fill="${col}" stroke="none" data-fill/>`;
      s += `<polygon points="${pts([m, tip, r])}" fill="${col}" fill-opacity=".45" stroke="none" data-fill/>`;
      s += `<polyline points="${pts([l, tip, r])}" stroke-width=".8"/>`;
    }
    s += '<circle r="80" stroke-width="4"/><circle r="72" stroke-width="1"/>';
    s += ticks(72, 66, 60, 5, 61, 1);
    s += '<circle r="56" stroke-width="1" stroke-dasharray="3 3"/><circle r="46" stroke-width="2.2"/>';
    s += ringText(51, 'ORDO ◆ CORONA ◆ ORDO ◆ CORONA ◆ ORDO ◆ CORONA ◆', 7.4, col, 1.2);
    // crown
    const crown = [[-46, -84], [-50, -124], [-30, -104], [-20, -136], [-8, -110], [0, -150], [8, -110], [20, -136], [30, -104], [50, -124], [46, -84]];
    s += `<polygon points="${pts(crown)}" fill="${col}" stroke-width="1.6" data-fill/>`;
    s += `<polygon points="${pts([[0, -150], [8, -110], [30, -104], [50, -124], [46, -84], [0, -84]])}" fill="#000" fill-opacity=".28" stroke="none" data-fill/>`;
    s += '<line x1="-46" y1="-94" x2="46" y2="-94" stroke-width="1.4"/>';
    for (const [x, y] of [[-50, -124], [-20, -136], [0, -150], [20, -136], [50, -124]]) s += `<circle cx="${x}" cy="${y}" r="3.4" fill="${col}" stroke-width="1"/>`;
    s += diamond(0, -94, 5.5, line);
    // eye
    s += '<path d="M-36 0 C-18 -24 18 -24 36 0 C18 24 -18 24 -36 0 Z" stroke-width="2.6"/>';
    s += '<circle r="15" stroke-width="1.4"/><circle r="10" stroke-width=".8" stroke-dasharray="1.5 2"/>';
    s += `<ellipse rx="3.6" ry="13" fill="${col}" stroke="none" data-fill/>`;
    // 律線
    s += `<line x1="0" y1="-84" x2="0" y2="136" stroke="${line}" stroke-width="3"/>`;
    s += diamond(0, 140, 7, line) + diamond(0, 112, 4, line);
    return svg(size, (size * 304) / 260, '-130 -156 260 304', s, col);
  };

  // ---------- 守護機 badges with custom sigils ----------
  const SIGIL = {
    leviathan: (c) => {
      let s = '';
      for (let k = 0; k < 3; k++) {
        const a = k * 120;
        s += `<g transform="rotate(${a})"><path d="M0 -10 C16 -18 20 -42 0 -52 C-20 -42 -16 -18 0 -10 Z" fill="${c}" fill-opacity=".22" stroke-width="2.2" data-fill/>` +
          '<path d="M0 -14 C8 -22 10 -38 0 -46" stroke-width="1.2"/></g>';
        s += `<polygon points="${pts([P(40, -30 + a), P(24, -38 + a), P(24, -22 + a)])}" fill="${c}" stroke="none" data-fill/>`;
      }
      s += '<circle r="11" stroke-width="2"/>' + `<circle r="5" fill="${c}" stroke="none" data-fill/>`;
      return s;
    },
    behemoth: (c) => `<path d="M-46 12 L46 12 L38 30 L-38 30 Z" fill="${c}" fill-opacity=".25" stroke-width="2.2" data-fill/>` +
      '<rect x="-50" y="30" width="100" height="14" rx="7" stroke-width="2.2"/>' +
      [-36, -18, 0, 18, 36].map((x) => `<circle cx="${x}" cy="37" r="3.6" stroke-width="1.4"/>`).join('') +
      `<path d="M-22 12 L-16 -8 L16 -8 L22 12 Z" fill="${c}" stroke-width="2" data-fill/>` +
      '<rect x="-3.5" y="-46" width="7" height="38" stroke-width="2"/>' +
      '<path d="M-16 -6 C-36 -12 -44 -32 -34 -48" stroke-width="3"/><path d="M16 -6 C36 -12 44 -32 34 -48" stroke-width="3"/>',
    ziz: (c) => {
      let s = '';
      for (const m of [1, -1]) {
        [[[14, -6], [56, -34], [50, -22], [14, 4]], [[14, 6], [58, -10], [50, 2], [14, 14]], [[14, 16], [52, 14], [44, 24], [14, 24]]].forEach((fe, k) => {
          s += `<polygon points="${pts(fe.map(([x, y]) => [x * m, y]))}" fill="${c}" fill-opacity="${k % 2 ? 0.15 : 0.4}" stroke-width="1.5" data-fill/>`;
        });
      }
      s += `<path d="M-14 40 L-14 -32 L-7 -32 L-7 -24 L-2 -24 L-2 -32 L2 -32 L2 -24 L7 -24 L7 -32 L14 -32 L14 40 Z" fill="${c}" fill-opacity=".9" stroke-width="1.6" data-fill/>`;
      s += '<path d="M-6 40 L-6 22 A6 6 0 0 1 6 22 L6 40" stroke="#000" stroke-opacity=".5" stroke-width="2"/>';
      s += diamond(0, -46, 6, c);
      return s;
    },
    bahamut: (c) => `<path d="M-34 34 L-34 -18 Q-34 -40 0 -46 Q34 -40 34 -18 L34 34 Z" fill="${c}" fill-opacity=".2" stroke-width="2.4" data-fill/>` +
      `<path d="M-24 -18 L24 -18 L20 -2 L-20 -2 Z" fill="${c}" stroke-width="1.6" data-fill/>` +
      '<path d="M-34 8 L34 8" stroke-width="1.4"/><circle cx="-20" cy="20" r="5" stroke-width="1.8"/><circle cx="20" cy="20" r="5" stroke-width="1.8"/>' +
      `<path d="M-38 34 L0 52 L38 34" fill="${c}" fill-opacity=".45" stroke-width="2.2" data-fill/>` +
      '<path d="M-14 -46 L-8 -56 L-2 -46 M2 -46 L8 -56 L14 -46" stroke-width="2"/>',
  };
  const ROMAN = { leviathan: 'I', behemoth: 'II', ziz: 'III', bahamut: 'IV' };
  window.embHex = (sigil, size, col = '#D3202F') => {
    let s = '';
    const outer = [];
    hexPts(100).forEach(([x, y], k, arr) => {
      const [nx, ny] = arr[(k + 1) % 6];
      outer.push([x + (nx - x) * 0.08, y + (ny - y) * 0.08], [x + (nx - x) * 0.92, y + (ny - y) * 0.92]);
    });
    s += `<polygon points="${pts(outer)}" stroke-width="3.6"/>`;
    s += `<polygon points="${pts(hexPts(88))}" stroke-width="1.2"/>`;
    for (const [x, y] of hexPts(94)) s += `<circle cx="${f(x)}" cy="${f(y)}" r="2.6" fill="${col}" stroke="none" data-fill/>`;
    for (let k = 0; k < 6; k++) { const [x1, y1] = P(76, -60 + k * 60); const [x2, y2] = P(84, -60 + k * 60); s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="1.4"/>`; }
    s += '<circle r="70" stroke-width=".9" stroke-dasharray="2 3"/><circle r="62" stroke-width="1.6"/>';
    s += ticks(62, 58, 36, 3, 55, 0.8);
    s += SIGIL[sigil] ? SIGIL[sigil](col) : `<g transform="translate(-36 -36) scale(3)" stroke-width="1.3">${window.ICONS[sigil]}</g>`;
    s += '<line x1="0" y1="-110" x2="0" y2="-64" stroke-width="3"/>';
    if (ROMAN[sigil]) s += `<text x="0" y="86" text-anchor="middle" font-family="Corm" font-weight="700" font-size="17" letter-spacing="2" fill="${col}" stroke="none" data-fill>${ROMAN[sigil]}</text>`;
    return svg(size, size, '-112 -112 224 224', s, col);
  };

  // ---------- gate (spatial door) — layered bezel rings ----------
  window.gateRings = (size, col, variant = 5) => {
    let s = '';
    s += '<circle r="97" stroke-width="1"/>';
    s += ticks(97, 93, 120, 10, 88, 0.8);
    s += '<circle r="84" stroke-width="3.2" stroke-dasharray="70 18"/>';
    for (let k = 0; k < 24; k++) {
      s += `<rect x="-1.6" y="-77" width="3.2" height="${k % 3 ? 5 : 9}" transform="rotate(${k * 15})" fill="${col}" stroke="none" data-fill/>`;
    }
    s += '<circle r="64" stroke-width=".8" stroke-dasharray="1.5 3"/>';
    if (variant >= 5) s += '<circle r="54" stroke-width="2.2" stroke-dasharray="40 14 8 14"/>';
    for (let k = 0; k < 12; k++) { const [x1, y1] = P(22, k * 30); const [x2, y2] = P(46, k * 30); s += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width=".8"/>`; }
    s += '<circle r="16" stroke-width="2"/>' + `<circle r="6" fill="${col}" stroke="none" data-fill/>`;
    return svg(size, size, '-100 -100 200 200', s, col);
  };
})();
