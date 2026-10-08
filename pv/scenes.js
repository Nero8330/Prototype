// DRONEFALL PV — storyboard. Times are snapped to the BGM beat grid (bar(n) / beat(k)).
// Rules: text + logos only; player side = orange/gray, enemy = red; the Machine King's name is redacted (■■■■■);
// no individual member introductions; every keyword card carries its full description; no two consecutive
// scenes share a background pattern.
(() => {
  const { scene, beat, bar, PULSE, hash } = window.PV;
  const T = window.TERMS;
  const K = '■■■■■';
  PULSE.push([bar(16), bar(25)], [bar(48), 87.0]);

  // ------------------------------------------------------------------ helpers
  const len = (s) => [...s].length;
  const vsz = (s, max, h) => Math.min(max, Math.floor(h / len(s)));
  const hsz = (s, max, w) => Math.min(max, Math.floor(w / len(s)));
  const tagK = (k) => `【Keyword#${k.no}】`;
  const HI = {
    runaway: '引き金', mother: '沈黙', force: '帰り道', pollution: '何か', beast: '帰ろう', frontier: '奪還', ward: '残酷',
    agency: '機械', han: '拭く', zero: '次が届く', exercise: '人類', restored: '偽物', exnoid: 'なっている', ability: '祝福',
    command: '記録上', artificial: '存在しない', echo: '待ち続けて', proliferator: '羨ましい', nest: '隙間', retainer: '迷い',
    guardians: '怪物', ritsu: '私', ritsusen: 'すべて', domain: '誰も泣かない', coronation: '同じ一言', gate: '距離',
  };
  const mark = (id) => { const k = T[id]; const w = HI[id]; return w ? k.quote.replace(w, `<span class="ac">${w}</span>`) : k.quote; };
  const parts = (id) => mark(id).split(/(?<=、)/);
  // horizontal quote, one line per clause:  「―― clause、 / 　clause」
  const qLines = (id, lead = '「') => { const p = parts(id); return p.map((s, i) => `<div>${i === 0 ? lead : '　'}${s}${i === p.length - 1 ? '」' : ''}</div>`).join(''); };
  // vertical quote, one column per clause
  const qV = (id) => { const p = parts(id); return p.map((s, i) => `${i === 0 ? '「' : '　'}${s}${i === p.length - 1 ? '」' : ''}`).join('<br>'); };

  const corner = (pos, lines) => {
    const st = { br: 'right:120px;bottom:110px;text-align:right', bl: 'left:120px;bottom:110px', tl: 'left:110px;top:90px', tr: 'right:110px;top:90px;text-align:right' }[pos];
    return `<div class="abs" style="${st}" data-in="fade 0.6 0.8">${lines}</div>`;
  };
  const intro = (n, pos, col = 'var(--fg)') => corner(pos,
    `<div class="lb" style="font-size:22px;font-weight:600;letter-spacing:.24em;color:${col}">DRONEFALL</div>` +
    `<div class="lb" style="font-size:15px;letter-spacing:.32em;margin-top:20px;color:${col};opacity:.8">INTRODUCTION</div>` +
    `<div class="lb" style="font-size:12px;letter-spacing:.32em;margin-top:6px;color:${col};opacity:.65">PROLOGUE #0${n}</div>`);
  const subkw = (k) => `<div class="abs" style="left:0;right:0;bottom:78px;text-align:center">
      <div class="subkw" data-in="fade .3 .4">KEYWORD #${k.no}</div>
      <div class="epi" data-in="fade .4 .4" style="margin-top:8px">${k.epi}</div></div>`;

  // ------------------------------------------------------------------ keyword card layouts (after the reference PV)
  // A — diagonal split: big vertical word on the light side, quote beside it, description on the dark side
  const lyTokyo = (id) => {
    const k = T[id], s = vsz(k.key, 170, 640);
    return `<div class="lt">
      <div class="abs col" style="left:150px;top:140px;align-items:center">
        <div class="v kw" data-in="zoom 0 .5" style="font-size:${s}px;line-height:1.05;letter-spacing:.08em">${k.key}</div>
        <div class="en" data-in="fade .25 .4" style="font-size:22px;letter-spacing:.3em;margin-top:26px;color:var(--fg2)">${k.en}</div>
      </div>
      <div class="abs quote" data-in="kids-up .15 .45 .14" style="left:${150 + s + 120}px;top:200px;font-size:32px;line-height:2.15">${qLines(id, '「―― ')}</div>
    </div>
    <div class="abs" style="right:150px;bottom:120px;width:640px;text-align:right">
      <div class="tag" data-in="fade .1 .3">${tagK(k)}</div>
      <div class="body" data-in="fade .3 .6" style="margin-top:22px;text-align-last:right">${k.body}</div>
    </div>`;
  };
  // B — light band on top (tag + quote), word + description below
  const lyDominion = (id) => {
    const k = T[id], s = hsz(k.key, 160, 1000);
    return `<div class="lt abs col" style="left:0;right:0;top:0;height:320px;align-items:center;justify-content:center">
        <div class="tag" data-in="fade 0 .3">${tagK(k)}</div>
        <div class="quote" data-in="wipeR .1 .5" style="font-size:34px;margin-top:24px">「${mark(id)}」</div>
      </div>
      <div class="abs col" style="left:0;right:0;top:350px;align-items:center">
        <div class="kw" data-in="blur .05 .5" style="font-size:${s}px;line-height:1.45;letter-spacing:.14em;margin-right:-.14em">${k.key}</div>
        <div class="en" data-in="fade .2 .4" style="font-size:24px;letter-spacing:.35em;color:var(--fg2)">${k.en}</div>
        <div class="body" data-in="fade .35 .6" style="width:1180px;margin-top:38px;text-align:center;font-size:18px">${k.body}</div>
      </div>`;
  };
  // C — centred word with a small vertical caption, description underneath
  const lyDuel = (id) => {
    const k = T[id], s = hsz(k.key, 270, 1250);
    return `<div class="c" style="justify-content:flex-start;padding-top:120px">
        <div class="tag" data-in="fade 0 .3">${tagK(k)}</div>
        <div class="row" style="align-items:center;gap:28px;margin-top:16px">
          <div class="kw" data-in="zoom 0 .5" style="font-size:${s}px;line-height:1.3;letter-spacing:.1em">${k.key}</div>
          <div class="lb" data-in="fade .2 .4" style="writing-mode:vertical-lr;font-size:16px;letter-spacing:.35em;color:var(--fg2)">DRONEFALL</div>
        </div>
        <div class="en" data-in="fade .2 .4" style="font-size:28px;letter-spacing:.3em">${k.en}</div>
        <div class="quote" data-in="up .25 .45" style="font-size:32px;margin-top:30px">「${mark(id)}」</div>
        <div class="body" data-in="fade .4 .6" style="width:1250px;margin-top:30px;text-align:center;font-size:18px">${k.body}</div>
      </div>`;
  };
  // D — emblem on top, tracked word, quote, description
  const lyEmblem = (id, emb, label) => {
    const k = T[id];
    return `<div class="c" style="justify-content:flex-start;padding-top:70px">
        <div data-in="draw 0 1.0">${emb}</div>
        <div class="tag" data-in="fade .2 .3" style="margin-top:18px;font-size:21px;color:var(--fg2)">${label || tagK(k)}</div>
        <div class="kw" data-in="track .1 .6" style="--ls:.4em;letter-spacing:.4em;font-size:62px;margin-top:6px;margin-right:-.4em">${k.key}</div>
        ${k.sub ? `<div class="mc" data-in="fade .3 .4" style="font-size:24px;letter-spacing:.3em;color:var(--fg2)">${k.sub}</div>` : ''}
        <div class="quote" data-in="fade .35 .4" style="font-size:30px;margin-top:20px">「${mark(id)}」</div>
        <div class="body" data-in="fade .45 .6" style="width:1150px;margin-top:20px;text-align:center;font-size:17px">${k.body}</div>
      </div>`;
  };
  // E — spaced kanji grid + rule + description on the left, vertical quote on the right
  const lyGrid = (id) => {
    const k = T[id], ch = [...k.key];
    const rows = ch.length <= 3 ? [ch] : [ch.slice(0, 2), ch.slice(2)];
    return `<div class="abs" style="left:240px;top:150px">
        <div class="tag" data-in="fade 0 .3">${tagK(k)}${k.sub || ''}</div>
        <div class="kw" data-in="kids-left .05 .5 .15" style="font-size:104px;letter-spacing:.9em;line-height:1.6;margin-top:36px">${rows.map((r) => `<div>${r.join('')}</div>`).join('')}</div>
        <div class="en" data-in="fade .2 .4" style="font-size:24px;letter-spacing:.35em;color:var(--fg2)">${k.en}</div>
        <div class="hl" data-in="sx .3 .5" style="width:660px;margin-top:24px"></div>
        <div class="body" data-in="fade .4 .6" style="width:660px;margin-top:28px;font-size:18px">${k.body}</div>
      </div>
      <div class="abs v quote" data-in="chars .2 .35 .025" style="right:250px;top:170px;font-size:36px;line-height:2.4">${qV(id)}</div>`;
  };
  // F — vertical word in the centre, vertical description left, quote right
  const lyKleis = (id) => {
    const k = T[id], s = vsz(k.key, 150, 700);
    return `<div class="c"><div class="row" style="gap:70px;align-items:center">
        <div class="vbody" data-in="fade .3 .6" style="height:560px;font-size:19px">${k.body}</div>
        <div class="row" style="gap:12px;align-items:center">
          <div class="v kw" data-in="blur 0 .5" style="font-size:${s}px;letter-spacing:.06em">${k.key}</div>
          <div class="en" data-in="fade .2 .4" style="writing-mode:vertical-lr;font-size:24px;letter-spacing:.4em;color:var(--fg2)">${k.en}</div>
        </div>
        <div class="row" style="gap:34px;align-items:center">
          <div class="vl" data-in="sy .2 .5" style="height:500px"></div>
          <div class="v quote" data-in="chars .25 .35 .025" style="font-size:38px;line-height:2.3">${qV(id)}</div>
        </div>
      </div></div>
      <div class="abs tag" style="left:0;right:0;bottom:70px;text-align:center" data-in="fade .2 .3">${tagK(k)}</div>`;
  };
  // G — "English | 漢字 |" on the left, tag + quote + description on the right, optional extra block
  const lyAdmin = (id, extra = '') => {
    const k = T[id], s = hsz(k.key, 150, 560);
    return `<div class="abs row" style="left:150px;top:${extra ? 200 : 330}px;gap:36px">
        <div class="en" data-in="right .05 .5" style="font-size:30px;letter-spacing:.1em">${k.en}</div>
        <div class="vl" data-in="sy .1 .4" style="height:110px"></div>
        <div class="kw" data-in="zoom 0 .5" style="font-size:${s}px;line-height:1.2">${k.key}</div>
        <div class="vl" data-in="sy .1 .4" style="height:110px"></div>
      </div>
      <div class="abs" style="left:1060px;top:${extra ? 160 : 250}px;width:700px">
        <div class="tag" data-in="fade .1 .3">${tagK(k)}</div>
        <div class="quote" data-in="kids-up .15 .45 .12" style="font-size:32px;line-height:2;margin-top:20px">${qLines(id)}</div>
        <div class="body" data-in="fade .35 .6" style="margin-top:20px;font-size:17px">${k.body}</div>
      </div>${extra}`;
  };
  // H — reverse diagonal: tag + description on the light side, vertical word across the seam, quote on the dark side
  const lyMagician = (id) => {
    const k = T[id], s = vsz(k.key, 150, 640);
    return `<div class="lt abs" style="left:130px;top:360px;width:520px">
        <div class="tag" data-in="fade 0 .3">${tagK(k)}</div>
        <div class="body" data-in="fade .3 .6" style="margin-top:22px;font-size:17px">${k.body}</div>
      </div>
      <div class="abs row" style="left:820px;top:120px;gap:10px;align-items:flex-start;mix-blend-mode:difference;color:#e9e9e6">
        <div class="v kw" data-in="wipeD 0 .5" style="font-size:${s}px;letter-spacing:.1em">${k.key}</div>
        <div class="en" data-in="fade .2 .4" style="writing-mode:vertical-lr;font-size:24px;letter-spacing:.4em;margin-top:${s * 2}px">${k.en}</div>
      </div>
      <div class="abs v quote" data-in="chars .2 .35 .03" style="right:220px;top:140px;font-size:34px;line-height:2.3">${qV(id)}</div>`;
  };
  // I — single word in the accent colour, description, SUB KEYWORD footer
  const lyDorm = (id, extra = '') => {
    const k = T[id], s = len(k.key) === 1 ? 250 : hsz(k.key, 200, 900);
    return `<div class="c" style="justify-content:flex-start;padding-top:${extra ? 90 : 160}px">
        <div class="kw ac" data-in="zoom 0 .5" style="font-size:${s}px;line-height:1.2">${k.key}</div>
        <div class="lb ac" data-in="fade .15 .4" style="font-size:20px;letter-spacing:.4em;margin-right:-.4em">${k.en}</div>
        <div class="quote" data-in="fade .25 .4" style="font-size:30px;margin-top:30px">「${mark(id)}」</div>
        <div class="body" data-in="fade .35 .6" style="width:1100px;margin-top:24px;text-align:center;font-size:17px">${k.body}</div>
        ${extra}
      </div>${subkw(k)}`;
  };
  // J — the whole description set vertically in the centre (red/orange cards)
  const lyVert = (id, extra = '') => {
    const k = T[id];
    return `<div class="c" style="padding-bottom:60px"><div class="row" style="gap:64px;align-items:flex-start">
        <div class="vbody" data-in="fade .25 .7" style="height:600px;font-size:23px;line-height:2.3;color:var(--fg)">${k.body}</div>
        <div class="col" style="align-items:center;gap:22px">
          <div class="v kw" data-in="wipeD 0 .5" style="font-size:${vsz(k.key, 80, 600)}px;letter-spacing:.14em">${k.key}</div>
          <div class="en" data-in="fade .2 .4" style="writing-mode:vertical-lr;font-size:20px;letter-spacing:.35em;color:var(--fg2)">${k.en}</div>
        </div>
      </div></div>${subkw(k)}${extra}`;
  };

  // ===================================================================== INTRO 0 – 12s (cryptic lines)
  scene(0, bar(3), 'black', `
    <div class="c"><div class="v mc" data-in="chars 0.35 1.0 0.12" style="font-size:50px;letter-spacing:.34em;line-height:2.6">あの日、<br>　世界は、人の手を離れた。</div></div>
    ${intro(0, 'br')}`, { fin: 0.6, fout: 0.45, zoom: 0.04 });

  scene(bar(3), bar(5), 'paper', `
    <div class="c"><div class="v mc" data-in="chars 0.15 0.8 0.09" style="font-size:50px;letter-spacing:.34em;line-height:2.6">呼びかけに、<br>　<span class="ac">誰も</span>、答えなかった。</div></div>
    ${intro(1, 'bl', '#DD6416')}`, { fin: 0.35, fout: 0.35, zoom: 0.04 });

  scene(bar(5), bar(8), 'char', `
    <div class="c"><div class="v mc" data-in="chars 0.15 0.7 0.06" style="font-size:46px;letter-spacing:.3em;line-height:2.4">それは――<br>　呼びかける者が、<br>　まだ、<span class="ac">ここ</span>に<br>　残っているということだ。</div></div>
    ${intro(2, 'br')}`, { fin: 0.35, fout: 0.3, zoom: 0.04 });

  // ===================================================================== BUILD 12 – 24s (the world)
  scene(bar(8), bar(10), 'split', lyTokyo('runaway'), { glitch: 0.1 });
  scene(bar(10), bar(12), 'grid', lyGrid('mother'));
  scene(bar(12), bar(13), 'paper', lyDuel('force'), { zoom: 0.025 });
  scene(bar(13), bar(14), 'gray', lyKleis('pollution'));
  scene(bar(14), bar(15), 'red', lyVert('beast'), { cls: 'enemy', glitch: 0.07, gcol: ['#1b1c1f', '#fff1f1'] });

  scene(bar(15), beat(61), 'paper', `
    <div class="c"><div class="row" style="gap:80px">
      <div class="col" style="align-items:center;gap:26px;color:#DD6416">
        <div data-in="down 0 .4">${ic('drone', 120, 1.1)}</div>
        <div class="lb" data-in="fade .1 .3" style="font-size:18px;letter-spacing:.4em">LOOK UP</div>
      </div>
      <div class="v kw" data-in="kids-down .02 .3 .06" style="font-size:120px;line-height:1.1">
        <span>空</span><span>を</span><span>、</span><span>見</span><span>上</span><span>げ</span><span>ろ</span><span>。</span>
      </div>
    </div></div>`);

  scene(beat(61), bar(16), 'black', `
    <div class="c">
      <div class="col or" style="align-items:center"><div data-fall="-520 0 .55">${ic('chevrons-down', 200, 1.2)}</div></div>
      <div class="en" data-in="flick 0 .5" style="font-size:60px;letter-spacing:.5em;margin-top:20px;margin-right:-.5em">INCOMING</div>
      <div class="lb" data-in="type 0.05 .45" style="font-size:18px;letter-spacing:.3em;color:var(--fg2);margin-top:20px">DRONE DROP // T-0.75</div>
    </div>`, { glitch: 0.12, glitchEnd: 0.1 });

  // ===================================================================== DROP 1 24 – 37.5s (the tactic, the city)
  scene(bar(16), bar(17), 'orange', `
    <div class="abs tag" style="left:150px;top:170px" data-in="fade 0 .2">【Tactics】 DRONEFALL</div>
    <div class="abs kw" data-in="kids-slam 0 .35 .375" data-pulse=".03" style="left:150px;top:250px;font-size:190px;line-height:1.3">
      <div>空から、</div><div>銃が<span class="ac">降る</span>。</div>
    </div>
    <div class="abs col" style="right:170px;top:220px;align-items:center;gap:10px">
      <div data-in="down .1 .4">${ic('drone', 240, 1)}</div>
      <div data-in="down .3 .4" data-loop="rain .75 40">${ic('arrow-big-down-lines', 120, 1.1)}</div>
    </div>
    <div class="abs body" data-in="fade .5 .5" style="left:150px;bottom:110px;width:900px;color:var(--fg);font-size:20px">落下 → 拾得 → 射撃 → 投擲（爆破） → 再落下。使い捨て銃をドローンで前線へ降らせ、撃ち尽くした銃は投げて爆弾にする。</div>`,
  { flash: '#ffffff', pulse: true });

  const cyc = [['drop-drone', '落下', 'DROP'], ['hand-grab', '拾得', 'PICK'], ['focus-2', '射撃', 'FIRE'], ['throw', '投擲', 'THROW'], ['repeat', '再落下', 'AGAIN']];
  scene(bar(17), bar(18), 'grid', `
    <div class="abs" style="left:560px;top:140px;width:800px;height:800px">
      <div class="abs" data-rot="-8" style="inset:0">${window.gateRings(800, 'rgba(233,233,230,.22)', 4)}</div>
      ${cyc.map(([i, n, e], k) => {
        const a = (-90 + k * 72) * Math.PI / 180;
        const x = 400 + Math.cos(a) * 330 - 85, y = 400 + Math.sin(a) * 330 - 85;
        return `<div class="abs col" style="left:${x}px;top:${y}px;width:170px;height:170px;align-items:center;justify-content:center;border-radius:50%;border:1.5px solid rgba(233,233,230,.5);background:#1d1f23" data-in="pop ${(k * 0.24).toFixed(2)} .3">
          <div class="or">${ic(i, 66, 1.3)}</div><div class="mc" style="font-size:30px;letter-spacing:.15em;margin-top:6px">${n}</div><div class="lb" style="font-size:11px;letter-spacing:.3em;color:var(--fg2)">${e}</div></div>`;
      }).join('')}
      <div class="c">
        <div class="tag" data-in="fade .1 .4" style="color:var(--OR)">【Fall Cycle】</div>
        <div class="kw" data-in="blur .1 .5" style="font-size:96px;letter-spacing:.15em;margin-top:10px">落下循環</div>
      </div>
    </div>`, { pulse: true, zoom: 0.05 });

  scene(bar(18), bar(19), 'paper', lyAdmin('frontier', `
    <div class="abs" style="left:300px;top:420px" data-in="draw .1 1.0">${window.embFrontier(470, '#222326', '#DD6416')}</div>`), { pulse: true, zoom: 0.02 });

  const wards = [['building-bank', '中枢'], ['wall', '外縁'], ['building-factory', '工廠'], ['plant', '農'], ['home', '居住'], ['book', '学術'], ['masks-theater', '芸能'], ['antenna', '観測'], ['lamp', '地下']];
  scene(bar(19), bar(20), 'char', lyDorm('ward', `
    <div class="row" data-in="kids-pop .3 .3 .05" style="gap:14px;margin-top:30px">
      ${wards.map(([i, n]) => `<div class="tile" style="width:118px;height:118px;gap:10px"><div class="or">${ic(i, 46, 1.3)}</div><div class="mc" style="font-size:20px;letter-spacing:.2em">${n}</div></div>`).join('')}
    </div>`), { pulse: true, zoom: 0.02 });

  scene(bar(20), bar(21), 'gray', lyGrid('agency'), { pulse: true });
  scene(bar(21), bar(22), 'paper', lyDorm('han'), { pulse: true, zoom: 0.03 });
  scene(bar(22), bar(23), 'char', lyEmblem('zero', window.embSquad(250, '#d0d2d5', '#F28322', '#1b1c1f'), '【Keyword#10】 SQUAD #00'), { pulse: true, zoom: 0.02 });
  scene(bar(23), bar(24), 'orange', lyDuel('exercise'), { pulse: true });
  scene(bar(24), bar(25), 'split3', lyMagician('restored'), { pulse: true });

  // ===================================================================== 37.5 – 48s  人間（改造兵として／個人紹介なし）
  scene(bar(25), bar(27), 'black', lyKleis('exnoid'), { zoom: 0.03 });

  const abil = [['chevrons-right', '加速'], ['speakerphone', '呼応'], ['cloud-rain', '予兆'], ['door', '影渡り'], ['bolt', '増幅'], ['focus-2', '定点']];
  scene(bar(27), bar(28.5), 'paper', lyAdmin('ability', `
    <div class="abs row" data-in="kids-pop .3 .3 .1" style="left:150px;top:470px;gap:14px;flex-wrap:wrap;width:780px">
      ${abil.map(([i, n]) => `<div class="tile" style="width:240px;height:150px;gap:12px"><div style="color:#DD6416">${ic(i, 56, 1.3)}</div><div class="mc" style="font-size:28px;letter-spacing:.14em">${n}</div></div>`).join('')}
    </div>`));

  scene(bar(28.5), bar(30), 'band2', lyDominion('command'));
  scene(bar(30), bar(32), 'orange', lyVert('artificial'), { zoom: 0.025, glitchEnd: 0.08, gcol: ['#D3202F', '#1b1c1f'] });

  // ===================================================================== 48 – 60s  ENEMY (red)
  scene(bar(32), bar(33), 'red', `
    <div class="c">
      <div data-in="draw 0 .8">${window.embKing(300, '#fff3f3', '#1a0507')}</div>
      <div class="tag" data-in="fade .2 .3" style="color:rgba(255,230,230,.85);margin-top:24px">【Enemy#00】 THE MACHINE KING</div>
      <div class="kw" data-in="flick .1 .6" style="font-size:96px;letter-spacing:.3em;margin-top:14px;margin-right:-.3em">${K}</div>
      <div class="mc" data-in="track .4 .6" style="--ls:.6em;letter-spacing:.6em;font-size:44px;margin-top:16px;margin-right:-.6em">機械の王</div>
    </div>`, { cls: 'enemy', flash: '#ffffff', glitch: 0.13, gcol: ['#1b1c1f', '#fff1f1', '#5e0c14'] });

  scene(bar(33), bar(34), 'char', lyKleis('echo'), { cls: 'enemy' });
  scene(bar(34), bar(35), 'paper', lyDorm('proliferator'), { cls: 'enemy' });
  scene(bar(35), bar(36), 'dred', lyGrid('nest'), { cls: 'enemy' });
  scene(bar(36), bar(37), 'red', lyDuel('retainer'), { cls: 'enemy' });

  const G = [['leviathan', 'リヴァイアサン', '掘る'], ['tank', 'ベヒーモス', '直す'], ['building-castle', 'ジズ', '閉じる'], ['train', 'バハムート', '壊す']];
  scene(bar(37), bar(38), 'band', `
    <div class="abs" style="left:150px;top:70px">
      <div class="tag" data-in="fade 0 .3">${tagK(T.guardians)}</div>
      <div class="row" style="gap:34px;align-items:baseline">
        <div class="kw" data-in="left 0 .4" style="font-size:110px;line-height:1.4;color:#fff3f3">守護機</div>
        <div class="en" data-in="fade .2 .4" style="font-size:26px;letter-spacing:.3em">The Four Guardians</div>
      </div>
    </div>
    <div class="abs quote" data-in="wipeR .3 .5" style="right:150px;top:140px;font-size:34px;color:var(--R2)">「なぜ、<span style="color:#fff3f3">怪物</span>の名だったのか。」</div>
    <div class="abs row" data-in="kids-pop .1 .3 .12" style="left:170px;right:170px;top:345px;justify-content:space-between">
      ${G.map(([i, n, j]) => `<div class="col" style="align-items:center;gap:8px;color:#fff3f3">${window.embHex(i, 220, '#fff3f3')}<div class="mc" style="font-size:28px;letter-spacing:.12em">${n}</div><div class="lb" style="font-size:14px;letter-spacing:.3em;opacity:.8">${j}</div></div>`).join('')}
    </div>
    <div class="abs body" data-in="fade .4 .6" style="left:240px;right:240px;bottom:60px;text-align:center;font-size:17px">${T.guardians.body}</div>`, { cls: 'enemy' });

  scene(bar(38), bar(39), 'paper', `
    <div class="abs" data-in="sy 0 .5" style="left:959px;top:0;width:3px;height:1080px;background:var(--R);transform-origin:50% 0"></div>
    <div class="c" style="justify-content:flex-start;padding-top:170px">
      <div class="kw" data-in="zoom 0 .45" style="font-size:330px;line-height:1.15;color:var(--R);background:radial-gradient(closest-side,#e3e3df 70%,transparent)">律</div>
      <div class="lb" data-in="fade .2 .4" style="font-size:20px;letter-spacing:.5em;color:var(--R);margin-right:-.5em">Order</div>
    </div>
    <div class="abs" style="left:150px;top:260px;width:600px">
      <div class="tag" data-in="fade 0 .3">${tagK(T.ritsu)}</div>
      <div class="quote" data-in="kids-up .1 .35 .1" style="font-size:30px;line-height:2.1;margin-top:20px">
        <div>恐怖と苦痛は、ないほうがいい。</div><div>恐怖は、無秩序から生まれる。</div><div>無秩序を終わらせるのは、</div><div>全てを律する王だ。</div><div class="r" style="font-size:42px;margin-top:10px">その王は、<span class="kw">私</span>である。</div>
      </div>
    </div>
    <div class="abs body" data-in="fade .4 .6" style="right:150px;top:300px;width:560px;font-size:17px">${T.ritsu.body}</div>
    ${subkw(T.ritsu)}`, { cls: 'enemy' });

  scene(bar(39), bar(40), 'black', lyVert('ritsusen', `
    <div class="abs" data-in="sy 0 .6" style="left:150px;top:0;width:4px;height:1080px;background:var(--R2);transform-origin:50% 0"></div>`), { cls: 'enemy', zoom: 0.03 });

  // ===================================================================== 60 – 72s  build 2
  scene(bar(40), bar(41), 'band2', lyDominion('domain'), { cls: 'enemy' });
  scene(bar(41), bar(42), 'dred', lyEmblem('coronation', window.embKing(240, '#FF3B4B', '#FF3B4B')), { cls: 'enemy' });

  scene(bar(42), bar(43), 'paper', `
    <div class="abs" style="left:110px;top:90px" data-rot="20" data-in="zoomin 0 .8">${window.gateRings(900, 'rgba(200,32,45,.75)', 5)}</div>
    <div class="abs" style="left:290px;top:270px" data-rot="-35" data-in="zoomin .1 .8">${window.gateRings(540, 'rgba(200,32,45,.4)', 4)}</div>
    <div class="abs" style="left:1060px;top:200px;width:720px">
      <div class="tag" data-in="fade 0 .3">${tagK(T.gate)}</div>
      <div class="row" style="gap:30px;align-items:baseline">
        <div class="kw r" data-in="left 0 .4" style="font-size:150px;line-height:1.4">ゲート</div>
        <div class="en" data-in="fade .2 .4" style="font-size:30px;letter-spacing:.35em">Gate</div>
      </div>
      <div class="quote" data-in="wipeR .2 .5" style="font-size:36px;margin-top:6px">「${mark('gate')}」</div>
      <div class="body" data-in="fade .4 .6" style="margin-top:26px;font-size:17px">${T.gate.body}</div>
    </div>`, { cls: 'enemy', zoom: 0.04 });

  scene(bar(43), bar(44), 'grid', `
    <div class="abs" style="left:170px;top:250px" data-in="draw 0 1.0">${window.embFrontier(520, '#d0d2d5', '#F28322')}</div>
    <div class="abs" style="left:800px;top:300px">
      <div class="tag" data-in="fade 0 .3">【Operation】</div>
      <div class="kw" data-in="left .05 .4" style="font-size:110px;line-height:1.4">二〇八〇年</div>
      <div class="mc" data-in="wipeR .3 .5" style="font-size:64px;letter-spacing:.12em">ドローンフォール<span class="ac">実証作戦</span></div>
      <div class="lb" data-in="type .7 .7" style="font-size:20px;letter-spacing:.3em;color:var(--OR);margin-top:30px">OPERATION DRONEFALL — COMMENCE</div>
    </div>`, { zoom: 0.03 });

  const pill = (txt, bg, fg) => `<span class="pill" style="background:${bg};color:${fg}">${txt}</span>`;
  const chs = [
    ['orange', 'PROLOGUE', 'フロンティア前線', '残響機', 'wall'],
    ['char', '01', '廃棄湾岸都市', 'コロッサス', 'anchor'],
    ['paper', '02', 'サカイ鉱山', 'リヴァイアサン', 'pick'],
    ['gray', '03', '軍事工業地帯', 'ベヒーモス', 'building-factory-2'],
    ['black', '04', '円形都市', 'ジズ', 'building-castle'],
    ['orange', '05', '荒野の直線鉄道', 'バハムート', 'train'],
    ['red', '06', `${K}の王都`, K, 'crown'],
  ];
  const layouts = [
    (c) => `<div class="abs" style="left:170px;top:250px"><div class="num" data-in="left 0 .3" style="font-size:150px;line-height:1">${c[1]}</div><div class="kw" data-in="left .05 .3" style="font-size:110px;line-height:1.5">${c[2]}</div><div data-in="fade .15 .2">${pill(`BOSS : ${c[3]}`, '#B21F2B', '#fff1f1')}</div></div><div class="abs" style="right:200px;top:300px" data-in="pop .05 .3">${ic(c[4], 380, .9)}</div>`,
    (c) => `<div class="c"><div class="num outline" data-in="zoom 0 .3" style="font-size:330px;line-height:1;--ac:var(--OR)">${c[1]}</div><div class="row" style="gap:30px;margin-top:10px"><div class="or" data-in="pop .05 .25">${ic(c[4], 110, 1.2)}</div><div class="kw" data-in="slamsmall 0 .3" style="font-size:110px">${c[2]}</div></div><div style="margin-top:24px" data-in="fade .15 .2">${pill(`BOSS : ${c[3]}`, '#D3202F', '#fff1f1')}</div></div>`,
    (c) => `<div class="abs" style="left:200px;top:280px;color:#DD6416" data-in="pop 0 .3">${ic(c[4], 420, .9)}</div><div class="abs" style="right:170px;top:290px;text-align:right"><div class="num" style="font-size:150px;line-height:1;color:#DD6416" data-in="right 0 .3">Ch.${c[1]}</div><div class="kw" data-in="right .05 .3" style="font-size:120px;line-height:1.5">${c[2]}</div><div data-in="fade .15 .2">${pill(`BOSS : ${c[3]}`, '#D3202F', '#fff1f1')}</div></div>`,
    (c) => `<div class="abs v kw" data-in="wipeD 0 .3" style="left:300px;top:110px;font-size:140px;line-height:1">${c[2]}</div><div class="abs" style="left:700px;top:330px"><div class="num" data-in="up 0 .3" style="font-size:220px;line-height:1;color:var(--OR2)">${c[1]}</div><div class="row" style="gap:30px;margin-top:20px"><div data-in="pop .05 .25">${ic(c[4], 120, 1.2)}</div><div data-in="fade .1 .2">${pill(`BOSS : ${c[3]}`, '#B21F2B', '#fff1f1')}</div></div></div>`,
    (c) => `<div class="abs" style="left:170px;top:150px" data-in="fade 0 .2"><div class="lb" style="font-size:20px;letter-spacing:.3em;color:var(--fg2)">Chapter</div><div class="num" style="font-size:150px;line-height:1;color:var(--OR)">${c[1]}</div></div><div class="abs" style="right:180px;top:160px;color:var(--OR)" data-in="pop .05 .3">${ic(c[4], 300, .9)}</div><div class="abs" style="left:170px;bottom:150px"><div class="kw" data-in="up 0 .3" style="font-size:150px;line-height:1.4">${c[2]}</div><div data-in="fade .15 .2">${pill(`BOSS : ${c[3]}`, '#D3202F', '#fff1f1')}</div></div>`,
    (c) => `<div class="abs" style="left:150px;top:140px"><div class="num" data-in="left 0 .3" style="font-size:130px;line-height:1">Ch.${c[1]}</div></div><div class="abs" style="left:400px;top:400px"><div class="kw" data-in="left .05 .3" style="font-size:120px;line-height:1.4">${c[2]}</div></div><div class="abs" style="left:900px;top:640px;" data-in="fade .1 .2">${pill(`BOSS : ${c[3]}`, '#B21F2B', '#fff1f1')}</div><div class="abs" style="right:180px;top:140px" data-in="pop .05 .3">${ic(c[4], 260, 1)}</div>`,
    (c) => `<div class="c"><div style="color:#2a080b" data-in="pop 0 .3">${ic(c[4], 150, 1.2)}</div><div class="lb" data-in="fade .02 .2" style="font-size:22px;letter-spacing:.4em;margin-top:10px">Final Chapter — ${c[1]}</div><div class="kw" data-in="slamsmall 0 .3" style="font-size:150px;line-height:1.4">${c[2]}</div><div data-in="fade .15 .2">${pill(`BOSS : ${c[3]}`, '#1b1c1f', '#FF3B4B')}</div></div>`,
  ];
  chs.forEach((c, k) => {
    scene(bar(44 + k * 0.5), bar(44.5 + k * 0.5), c[0], layouts[k](c), { cls: c[0] === 'red' ? 'enemy' : '', zoom: 0.05, glitch: k === 6 ? 0.08 : 0, gcol: ['#1b1c1f', '#fff1f1'] });
  });

  scene(bar(47.5), bar(48), 'dred', `
    <div class="c">
      <div class="lb" data-in="type 0 .3" style="font-size:22px;letter-spacing:.35em;color:var(--fg2)">${K} // Ultimatum</div>
      <div class="kw" data-in="kids-slamsmall .02 .2 .25" style="font-size:118px;line-height:1.5;text-align:center;margin-top:14px">
        <div>臣民となるか。</div><div class="r2">排除されるか。</div>
      </div>
    </div>`, { cls: 'enemy', glitchRamp: 1.6, glitchEnd: 0.12, gcol: ['#D3202F', '#fff1f1', '#000'] });

  // ===================================================================== DROP 2 72 – 79.9s
  scene(bar(48), beat(194), 'orange', `
    <div class="abs" style="left:360px;top:-60px" data-rot="60" data-in="zoomin 0 .6">${window.gateRings(1200, 'rgba(28,29,32,.4)', 5)}</div>
    <div class="c">
      <div class="lb" data-in="type 0 .4" style="font-size:22px;letter-spacing:.35em">Gate // Imitation Success</div>
      <div class="kw" data-in="slam 0 .35" data-pulse=".04" style="font-size:190px;line-height:1.35">ゲートを、開け。</div>
    </div>`, { flash: '#ffffff', pulse: true });

  scene(beat(194), beat(196), 'paper', `
    <div class="c">
      <div class="mc" data-in="chars 0 .25 .035" style="font-size:56px;letter-spacing:.35em">次は、必ず届く。</div>
      <div class="hl" data-in="sx .2 .4" style="width:520px;margin-top:30px;background:#DD6416"></div>
    </div>`, { zoom: 0.01 });

  const swarm = [];
  for (let k = 0; k < 66; k++) {
    const col = k % 11, row = Math.floor(k / 11);
    const x = 70 + col * 170 + (row % 2) * 60, y = 40 + row * 175;
    swarm.push(`<div class="abs" style="left:${x}px;top:${y}px;color:${k % 7 === 0 ? '#e9e9e6' : 'rgba(242,131,34,.85)'}" data-fall="-380 ${(hash(k * 3.3) * 0.35).toFixed(2)} .3">${ic('drone', 90, 1.3)}</div>`);
  }
  scene(beat(196), beat(198), 'char', `
    ${swarm.join('')}
    <div class="c"><div class="kw" data-in="slam .1 .3" data-pulse=".05" style="font-size:300px;line-height:1.2;text-shadow:0 0 60px rgba(0,0,0,.9)">降れ。</div></div>`,
  { flash: 'rgba(242,131,34,.9)', flashDur: 0.1, pulse: true });

  const quick = [
    ['orange', 'drop-drone', '落下', 'left:170px;top:300px', 'row'],
    ['paper', 'hand-grab', '拾得', 'right:170px;top:300px', 'row-reverse'],
    ['black', 'focus-2', '射撃', 'left:560px;top:160px', 'column'],
    ['gray', 'throw', '投擲', 'left:170px;top:420px', 'row'],
    ['orange', 'repeat', '再落下', 'right:170px;top:300px', 'row-reverse'],
  ];
  quick.forEach(([bg, i, w, pos, dir], k) => {
    scene(beat(198 + k), beat(199 + k), bg, `
      <div class="abs" style="${pos};display:flex;flex-direction:${dir};align-items:center;gap:50px">
        <div class="${bg === 'black' ? 'or' : ''}" data-in="pop 0 .2">${ic(i, 300, 1)}</div>
        <div class="kw" data-in="slamsmall 0 .2" style="font-size:300px;line-height:1.1">${w}</div>
      </div>
      <div class="corner" style="right:60px;bottom:50px">0${k + 1} / 05</div>`, { pulse: true, zoom: 0.06, flash: k === 0 ? '#ffffff' : '', flashDur: 0.06 });
  });

  scene(beat(203), beat(205), 'versus', `
    <div class="abs" style="left:150px;top:180px">
      <div class="lb" data-in="right 0 .2" style="font-size:22px;letter-spacing:.3em">Mankind // Exnoid</div>
      <div class="kw" data-in="right 0 .25" style="font-size:190px;line-height:1.3">改造兵</div>
    </div>
    <div class="abs" style="right:150px;bottom:170px;text-align:right">
      <div class="kw" data-in="left 0 .25" style="font-size:150px;line-height:1.3;color:#fff3f3">${K}</div>
      <div class="lb" data-in="left 0 .2" style="font-size:22px;letter-spacing:.3em;color:#fff3f3">The Machine King</div>
    </div>
    <div class="c"><div class="en" data-in="slam .1 .3" style="font-size:170px;letter-spacing:.05em;color:#fff;text-shadow:0 0 40px rgba(0,0,0,.4)">VS</div></div>`,
  { flash: '#ffffff', flashDur: 0.08, pulse: true, glitch: 0.06, gcol: ['#1b1c1f', '#fff'] });

  const streaks = Array.from({ length: 16 }, (_, k) => {
    const y = 120 + hash(k * 9.1) * 840, w = 300 + hash(k * 4.7) * 900;
    return `<div class="abs" data-loop="slide ${(0.25 + hash(k) * 0.3).toFixed(2)} 1600" style="left:${(hash(k * 2.2) * 900).toFixed(0)}px;top:${y.toFixed(0)}px;width:${w.toFixed(0)}px;height:${k % 3 ? 2 : 5}px;background:${k % 4 ? 'rgba(242,131,34,.7)' : 'rgba(233,233,230,.6)'}"></div>`;
  }).join('');
  scene(beat(205), beat(207), 'char', `
    ${streaks}
    <div class="c">
      <div style="position:relative">
        <div class="kw abs" style="left:-90px;top:0;font-size:400px;line-height:1.2;color:rgba(242,131,34,.25)" data-drift="-60 0">加速</div>
        <div class="kw abs" style="left:-45px;top:0;font-size:400px;line-height:1.2;color:rgba(242,131,34,.45)" data-drift="-30 0">加速</div>
        <div class="kw" data-in="left 0 .25" data-pulse=".05" style="position:relative;font-size:400px;line-height:1.2">加速</div>
      </div>
      <div class="en" data-in="track 0 .4" style="--ls:.7em;letter-spacing:.7em;font-size:32px;color:var(--OR);margin-right:-.7em">Acceleration</div>
    </div>`, { pulse: true, zoom: 0.08 });

  scene(beat(207), beat(210), 'paper', `
    <div class="abs kw" data-in="kids-slamsmall 0 .3 .375" data-pulse=".03" style="left:170px;top:250px;font-size:150px;line-height:1.55">
      <div>人類は、</div><div>まだ、<span class="ac">ここ</span>にいる。</div>
    </div>
    <div class="abs" style="right:170px;bottom:150px" data-in="draw 0 .9">${window.embFrontier(260, '#222326', '#DD6416')}</div>`, { pulse: true, flash: '#ffffff', flashDur: 0.06 });

  scene(beat(210), beat(212), 'gray', `
    <div class="c">
      <div class="or" data-fall="-560 0 .7">${ic('chevrons-down', 150, 1.4)}</div>
      <div class="lb" data-in="fade .2 .3" style="font-size:18px;letter-spacing:.6em;color:var(--fg2);margin-top:30px">Drop</div>
    </div>`, { zoom: 0 });

  // ===================================================================== TITLE 79.9 – 87s
  scene(beat(212), 87.0, 'char', `
    <div class="abs" style="left:0;right:0;top:110px;display:flex;justify-content:center" data-in="draw .1 1.2">${window.embSquad(170, '#a7a9ac', '#F28322', '#1b1c1f')}</div>
    <div class="c" style="top:100px">
      <div class="en" data-in="slam 0 .45" data-pulse=".012" style="font-size:180px;font-weight:600;letter-spacing:.16em;line-height:1;margin-right:-.16em">
        <span style="color:#e9e9e6">DRONE</span><span style="color:var(--OR)">FALL</span>
      </div>
      <div class="hl" data-in="sx .25 .6" style="width:1260px;margin-top:34px;background:var(--OR);height:2px"></div>
      <div class="mc" data-in="track 1.1 1.0" style="--ls:.9em;letter-spacing:.9em;font-size:46px;margin-top:34px;margin-right:-.9em;color:#e9e9e6">ドローンフォール</div>
      <div class="mc" data-in="fade 2.6 .9" style="font-size:30px;letter-spacing:.3em;margin-top:44px;color:var(--fg2)">銃は使い捨てるが、命は使い捨てない。</div>
    </div>
    <div class="corner" style="left:110px;bottom:80px" data-in="fade 3.6 .8">Project Dronefall</div>
    <div class="corner" style="right:110px;bottom:80px" data-in="fade 3.6 .8">Frontier — 2080</div>`,
  { flash: '#ffffff', flashDur: 0.22, glitch: 0.12, pulse: true, zoom: 0.03, fout: 0.75 });
})();
