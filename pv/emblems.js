// Logos / emblems for the PV, drawn as inline SVG so they can be line-drawn and recoloured.
(() => {
  let uid = 0;
  const f = (n) => n.toFixed(2);

  // icon from assets/icons.js
  window.ic = (name, size = 64, sw = 1.4, extra = '') =>
    `<svg class="ico" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${window.ICONS[name]}</svg>`;

  function laurel(cx, cy, R, a0, a1, n, col, mirror) {
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = (a0 + (a1 - a0) * (k / (n - 1))) * Math.PI / 180;
      const x = cx + Math.cos(a) * R * (mirror ? -1 : 1);
      const y = cy + Math.sin(a) * R;
      const deg = (a * 180 / Math.PI + 90 + (mirror ? 0 : 0)) * (mirror ? -1 : 1) + (mirror ? 35 : -35);
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="9" ry="3.6" transform="rotate(${f(deg)} ${f(x)} ${f(y)})" fill="${col}" stroke="none" data-fill/>`;
    }
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const a = (a0 + (a1 - a0) * (k / 20)) * Math.PI / 180;
      pts.push(`${f(cx + Math.cos(a) * (R - 2) * (mirror ? -1 : 1))},${f(cy + Math.sin(a) * (R - 2))}`);
    }
    s += `<polyline points="${pts.join(' ')}" stroke="${col}" stroke-width="1.6" fill="none"/>`;
    return s;
  }

  // 第零特設班 (落下班) squad crest — player side
  window.embSquad = (size, col = 'currentColor', acc = '#F28322', bg = '#5b5e63') => {
    const id = `sq${uid++}`;
    let s = `<svg class="ico" width="${size}" height="${size * 1.12}" viewBox="0 0 200 224" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round">`;
    s += `<path d="M100 6 L106 20 H94 Z" fill="${col}" data-fill/>`;
    s += `<path d="M100 22 L164 42 V98 C164 146 134 176 100 192 C66 176 36 146 36 98 V42 Z" stroke-width="5"/>`;
    s += `<path d="M100 33 L154 50 V98 C154 139 128 165 100 179 C72 165 46 139 46 98 V50 Z" stroke-width="1.6"/>`;
    // drone
    s += '<g transform="translate(100 84)">';
    s += '<path d="M-27 -20 L27 20 M27 -20 L-27 20" stroke-width="5"/>';
    for (const [x, y] of [[-27, -20], [27, -20], [-27, 20], [27, 20]]) s += `<circle cx="${x}" cy="${y}" r="10.5" stroke-width="3"/>`;
    s += `<rect x="-9" y="-8" width="18" height="16" rx="3" fill="${col}" data-fill/>`;
    s += '</g>';
    // falling chevrons
    s += '<path d="M80 122 L100 138 L120 122" stroke-width="5.5"/>';
    s += `<path d="M80 138 L100 154 L120 138" stroke="${acc}" stroke-width="5.5"/>`;
    s += laurel(100, 112, 82, 120, 215, 9, col, false) + laurel(100, 112, 82, 120, 215, 9, col, true);
    // banner
    s += `<path d="M10 182 H190 L182 196 L190 210 H10 L18 196 Z" fill="${col}" stroke="${col}" stroke-width="1.5" data-fill/>`;
    s += `<text x="100" y="200" text-anchor="middle" font-family="Corm" font-weight="700" font-size="11" textLength="150" lengthAdjust="spacingAndGlyphs" fill="${bg}" stroke="none" data-fill>ARMA CADUNT · VITA MANET</text>`;
    s += `<defs><path id="${id}"/></defs></svg>`;
    return s;
  };

  // フロンティア city crest — nine districts in a walled ring
  window.embFrontier = (size, col = 'currentColor', acc = '#F28322') => {
    const id = `fr${uid++}`;
    let s = `<svg class="ico" width="${size}" height="${size}" viewBox="-100 -100 200 200" fill="none" stroke="${col}" stroke-linecap="round">`;
    s += '<circle r="94" stroke-width="2.5"/><circle r="86" stroke-width="1"/>';
    s += `<defs><path id="${id}" d="M -74 0 A 74 74 0 1 1 74 0 A 74 74 0 1 1 -74 0"/></defs>`;
    s += `<text font-family="Corm" font-weight="700" font-size="10.5" letter-spacing="2.2" fill="${col}" stroke="none" data-fill><textPath href="#${id}">FRONTIER · SPECIAL DEFENSE CITY · EST. 2071 · NINE WARDS ·</textPath></text>`;
    s += '<circle r="64" stroke-width="2"/><circle r="28" stroke-width="1.5"/>';
    for (let k = 0; k < 9; k++) {
      const a = (-90 + k * 40) * Math.PI / 180;
      s += `<line x1="${f(Math.cos(a) * 28)}" y1="${f(Math.sin(a) * 28)}" x2="${f(Math.cos(a) * 64)}" y2="${f(Math.sin(a) * 64)}" stroke-width="1.2"/>`;
      const b = a + 20 * Math.PI / 180;
      s += `<rect x="${f(Math.cos(b) * 47 - 3.5)}" y="${f(Math.sin(b) * 47 - 3.5)}" width="7" height="7" fill="${k === 1 ? acc : col}" stroke="none" data-fill/>`;
    }
    s += `<path d="M0 -56 L6 -6 L56 0 L6 6 L0 56 L-6 6 L-56 0 L-6 -6 Z" fill="${col}" stroke="${col}" stroke-width="1" data-fill/>`;
    s += `<path d="M0 -22 L3 -3 L22 0 L3 3 L0 22 L-3 3 L-22 0 L-3 -3 Z" transform="rotate(45)" fill="${acc}" stroke="none" data-fill/>`;
    s += '</svg>';
    return s;
  };

  // 敵 — the Machine King's seal (crown + gate ring + halo of bits + 律線)
  window.embKing = (size, col = '#D3202F', line = '#D3202F') => {
    let s = `<svg class="ico" width="${size}" height="${size}" viewBox="-110 -120 220 230" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round">`;
    for (let k = 0; k < 14; k++) {
      const a = (-180 + k * (180 / 13)) * Math.PI / 180;
      const x = Math.cos(a) * 94, y = Math.sin(a) * 94;
      s += `<path d="M${f(x)} ${f(y - 6)} L${f(x + 4)} ${f(y)} L${f(x)} ${f(y + 6)} L${f(x - 4)} ${f(y)} Z" fill="${col}" stroke="none" transform="rotate(${f(a * 180 / Math.PI + 90)} ${f(x)} ${f(y)})" data-fill/>`;
    }
    s += '<circle r="70" stroke-width="3.5"/><circle r="58" stroke-width="1.2" stroke-dasharray="5 4"/><circle r="40" stroke-width="2"/>';
    s += `<path d="M-34 -78 L-24 -108 L-11 -88 L0 -116 L11 -88 L24 -108 L34 -78 Z" fill="${col}" stroke-width="2" data-fill/>`;
    s += '<path d="M-30 0 C-14 -18 14 -18 30 0 C14 18 -14 18 -30 0 Z" stroke-width="2.5"/>';
    s += `<circle r="7" fill="${col}" stroke="none" data-fill/>`;
    s += `<line x1="0" y1="-74" x2="0" y2="104" stroke="${line}" stroke-width="3"/>`;
    s += '</svg>';
    return s;
  };

  // 守護機 hex badge
  window.embHex = (icon, size, col = '#D3202F') => {
    let s = `<svg class="ico" width="${size}" height="${size}" viewBox="-100 -100 200 200" fill="none" stroke="${col}" stroke-linejoin="round">`;
    const hex = (r) => Array.from({ length: 6 }, (_, k) => { const a = (k * 60 - 90) * Math.PI / 180; return `${f(Math.cos(a) * r)},${f(Math.sin(a) * r)}`; }).join(' ');
    s += `<polygon points="${hex(92)}" stroke-width="4"/><polygon points="${hex(80)}" stroke-width="1.3"/>`;
    s += `<g transform="translate(-48 -48) scale(4)" stroke-width="1.3" stroke-linecap="round">${window.ICONS[icon]}</g>`;
    s += `<line x1="0" y1="-92" x2="0" y2="-62" stroke-width="3"/><line x1="0" y1="62" x2="0" y2="92" stroke-width="3"/>`;
    s += '</svg>';
    return s;
  };

  // gate rings (used for the enemy gate and the imitation gate)
  window.gateRings = (size, col, n = 5) => {
    let s = `<svg class="ico" width="${size}" height="${size}" viewBox="-100 -100 200 200" fill="none" stroke="${col}">`;
    for (let k = 0; k < n; k++) {
      const r = 20 + k * 16;
      s += `<circle r="${r}" stroke-width="${k % 2 ? 1 : 2.2}" stroke-dasharray="${k % 2 ? '3 5' : `${8 + k * 4} ${5 + k}`}"/>`;
    }
    s += '</svg>';
    return s;
  };
})();
