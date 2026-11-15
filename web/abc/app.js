/* Let's Go ABC (1tree, ~1995) — faithful HTML rebuild.
 * Screens, layouts and behaviour were recorded from the original GO_ABC.EXE
 * running under Wine at its native 640x480. All coordinates are in the
 * original pixel space; the stage is scaled to fit the window.
 */
'use strict';

const A = 'assets/', UI = 'assets/ui/';
const stage = document.getElementById('stage');

// ---------------------------------------------------------------- data
const WORDS = [
  ['a', 'apple'], ['b', 'ball'], ['c', 'cat'], ['d', 'dog'], ['e', 'ear'], ['f', 'foot'],
  ['g', 'girl'], ['h', 'hat'], ['i', 'igloo'], ['j', 'jeep'], ['k', 'key'], ['l', 'lock'],
  ['m', 'man'], ['n', 'nose'], ['o', 'old'], ['p', 'pen'], ['q', 'queen'], ['r', 'rabbit'],
  ['s', 'snake'], ['t', 'turtle'], ['u', 'umbrella', 'umbrla'], ['v', 'villa'], ['w', 'woman'],
  ['x', 'ax'], ['y', 'yoyo'], ['z', 'zebra'],
].map(([l, w, pic]) => ({ l, w, pic: pic || w }));
const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const picSrc = (wd, colored) => `${A}${wd.pic}_${colored ? 3 : 1}.png`;

let STROKES = window.STROKE_INDEX || {};   // "l_a" -> [frame indices]
let KEYS = window.KEY_BOXES || {};      // "Q" -> [x0,y0,x1,y1] within the keyboard image

// ---------------------------------------------------------------- scaling
function fit() {
  const bar = document.getElementById('home') ? 34 : 0;   // room for the home bar
  const s = Math.min(innerWidth / 640, (innerHeight - bar) / 480);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  stage.dataset.scale = s;
}
addEventListener('resize', fit); fit();
const scale = () => parseFloat(stage.dataset.scale) || 1;

// ---------------------------------------------------------------- DOM helpers
function el(tag, o = {}, parent = stage) {
  const e = document.createElement(tag);
  if (o.cls) e.className = o.cls;
  if (o.src) e.src = o.src;
  if (o.text != null) e.textContent = o.text;
  if (o.html != null) e.innerHTML = o.html;
  const s = e.style;
  if (o.x != null) { e.classList.add('a'); s.left = o.x + 'px'; s.top = o.y + 'px'; }
  if (o.w != null) s.width = o.w + 'px';
  if (o.h != null) s.height = o.h + 'px';
  if (o.style) Object.assign(s, o.style);
  if (o.click) { e.classList.add('hot'); e.addEventListener('click', ev => { ev.stopPropagation(); o.click(ev); }); }
  if (parent) parent.appendChild(e);
  return e;
}
const img = (src, x, y, click, parent = stage) => {
  const e = el('img', { src: UI + src + '.png', x, y, click }, parent);
  if (src === 'btn_mic' && window.ABC_NO_MIC) e.classList.add('nomic');   // no microphone where the page is hosted
  return e;
};
const hot = (x0, y0, x1, y1, click, parent = stage) => el('div', { x: x0, y: y0, w: x1 - x0, h: y1 - y0, click }, parent);
const show = (...es) => es.forEach(e => e && e.classList.remove('hidden'));
const hide = (...es) => es.forEach(e => e && e.classList.add('hidden'));

// ---------------------------------------------------------------- audio
// Every screen change bumps `epoch`; pending sequences from the old screen stop.
let epoch = 0, current = null;
const audioCache = {};
function stopAudio() { epoch++; if (current) { current.pause(); current = null; } }
function play(name) {
  const my = epoch;
  return new Promise(res => {
    if (my !== epoch) return res(false);
    let a = audioCache[name];
    if (!a) { a = audioCache[name] = new Audio(A + name.toLowerCase() + '.wav'); a.preload = 'auto'; }
    if (current && current !== a) current.pause();
    current = a; a.currentTime = 0;
    let done = false;
    const fin = ok => { if (!done) { done = true; a.onended = a.onerror = null; clearTimeout(t); res(ok && my === epoch); } };
    a.onended = () => fin(true); a.onerror = () => fin(true);
    const t = setTimeout(() => fin(true), 6000);
    a.play().catch(() => fin(true));
  });
}
const wait = ms => { const my = epoch; return new Promise(r => setTimeout(() => r(my === epoch), ms)); };
async function seq(...names) { for (const n of names) if (!(await play(n))) return false; return true; }

// ---------------------------------------------------------------- screens
function clear(bg = '#fff') {
  stopAudio(); dragCancel();
  stage.innerHTML = ''; stage.style.background = bg;
  document.onkeydown = null;
}

function tryAgain() {
  play('again');
  const s = img('try_again', 249, 177);
  s.style.zIndex = 40;
  setTimeout(() => s.remove(), 900);
}

/** Help overlay: either an image, or the drag-help text panel + image. */
function help(src, { drag = false, back } = {}) {
  const layer = el('div', { x: 0, y: 0, w: 640, h: 480, style: { background: '#ffffe0', zIndex: 30 } });
  if (drag) {
    img('help_drag_text', 187, 0, null, layer);
    const i = el('img', { src, x: 0, y: 0 }, layer);
    i.onload = () => { i.style.left = Math.round(320 - i.naturalWidth / 2) + 'px'; i.style.top = '250px'; };
  } else {
    const i = el('img', { src, x: 0, y: 0 }, layer);
    i.onload = () => { i.style.left = Math.round(300 - i.naturalWidth / 2) + 'px'; i.style.top = Math.round(Math.max(0, 230 - i.naturalHeight / 2)) + 'px'; };
  }
  img('help_exit', 579, 412, () => { layer.remove(); back && back(); }, layer);
  return layer;
}

// ================================================================ 1. cover
function showCover() {
  clear('#ff0000');
  img('cover_bg', 0, 0);
  el('div', { x: 0, y: 466, w: 110, h: 14, cls: 'he', text: '© כל הזכויות שמורות', style: { background: '#fff', fontSize: '11px', lineHeight: '14px', paddingRight: '3px' } });
  hot(136, 422, 232, 463, () => help(A + 'help.png'));                 // הסבר
  hot(273, 422, 370, 465, () => help(A + 'hevra.png'));                // הזמנות
  hot(412, 422, 511, 467, () => { showMenu(); play('lets_go'); });     // התחל
}

// ================================================================ 2. main menu (form "Cover")
const MENU_ITEMS = [];
LETTERS.forEach((l, i) => {
  MENU_ITEMS.push({ type: 'L', i });
  if (i % 3 === 2 || i === 25) MENU_ITEMS.push({ type: 'S', upto: i });
});
const ROW_Y = [10, 78, 147, 216, 284, 353, 421];
const menu = { top: 0, panel: -1 };

function showMenu() {
  clear('#ffff80');
  const list = el('div', { x: 0, y: 0, w: 518, h: 480 });
  const draw = () => {
    list.innerHTML = '';
    for (let r = 0; r < 7; r++) {
      const item = MENU_ITEMS[menu.top + r];
      if (!item) break;
      const y = ROW_Y[r];
      const bar = el('div', { cls: 'rowbar', style: { top: y + 'px' } }, list);
      if (item.type === 'S') {
        img('btn_smiley', 220, 2, () => showGames(item.upto), bar);
        continue;
      }
      const L = LETTERS[item.i];
      el('div', { cls: 'vbtn', x: 10, y: 1, w: 40, h: 49, text: L, click: () => showGrid({ caseU: false, mode: 'learn', letter: item.i, back: showMenu }) }, bar);
      el('div', { cls: 'vbtn', x: 70, y: 1, w: 51, h: 49, text: L.toUpperCase(), click: () => showGrid({ caseU: true, mode: 'learn', letter: item.i, back: showMenu }) }, bar);
      if (menu.panel === item.i) {
        const wd = WORDS[item.i];
        const p = el('div', { x: 147, y: y - 10, w: 242, h: 84, style: { background: '#ff0000' } }, list);
        el('div', { cls: 'vbtn', x: 23, y: 13, w: 36, h: 62, text: L, style: { fontSize: '44px', fontWeight: 'bold', paddingBottom: '8px' }, click: () => showWrite(item.i) }, p);
        const pb = el('div', { cls: 'vbtn white', x: 79, y: 6, w: 85, h: 75, click: () => showWord(item.i) }, p);
        el('img', { src: picSrc(wd), style: { maxWidth: '75px', maxHeight: '65px' } }, pb);
        img('btn_sub_keyboard', 183, 23, () => showKeyboard(item.i), p);
      } else {
        img('btn_row_yellow', 389, 3, () => { menu.panel = item.i; play(L); draw(); }, bar);
      }
    }
  };
  draw();
  img('menu_side', 518, 0);
  const max = MENU_ITEMS.length - 7;
  const scroll = d => { menu.top = Math.max(0, Math.min(max, menu.top + d)); draw(); };
  hot(530, 3, 626, 44, showCover);                                    // יציאה
  hot(530, 54, 626, 95, () => help(A + 'help.png'));                  // הסבר
  hot(528, 388, 572, 432, () => scroll(7));                           // page down
  hot(587, 388, 631, 432, () => scroll(-7));                          // page up
  hot(528, 435, 572, 479, () => scroll(1));                           // line down
  hot(587, 435, 631, 479, () => scroll(-1));                          // line up
}

// ================================================================ 3. letter grid (form "smal_abc")
const COL_X = [0, 91, 182, 274, 365, 457, 548, 640], ROW_GY = [0, 120, 240, 360, 480];
/**
 * modes: learn (from a menu row: highlight the letter and its neighbours),
 * review, place (drag the yellow tile to its cell), pair (lower tile onto the
 * CAPS grid), find (hear a letter, click it).
 */
function showGrid({ caseU, mode, letter = 0, back }) {
  clear('#fff');
  const st = { caseU, tries: 0, ok: 0, start: Date.now(), done: new Set() };
  const cells = LETTERS.map((l, i) => {
    const c = i % 7, r = Math.floor(i / 7);
    return el('div', { cls: 'cell', x: COL_X[c], y: ROW_GY[r], w: COL_X[c + 1] - COL_X[c], h: 120, click: () => cellClick(i) });
  });
  const label = () => cells.forEach((c, i) => c.textContent = st.caseU ? LETTERS[i].toUpperCase() : LETTERS[i]);
  label();

  const scored = mode === 'place' || mode === 'pair' || mode === 'find';
  const exit = () => scored ? showStats(st, back) : back();
  img(mode === 'find' ? 'grid_ctrl_find' : 'grid_ctrl', 457, 371);
  const tog = img(st.caseU ? 'grid_btn_small' : 'grid_btn_caps', 524, 417, () => {
    st.caseU = !st.caseU; tog.src = UI + (st.caseU ? 'grid_btn_small' : 'grid_btn_caps') + '.png'; label();
  });
  hot(467, 416, 516, 472, () => play('abcsong'));
  hot(576, 428, 636, 480, exit);
  if (mode !== 'find') {
    if (mode === 'place' || mode === 'pair') img('grid_help_green', 517, 376, () => help(UI + 'help_place.png', { drag: false }));
    else hot(517, 376, 576, 407, () => help(UI + 'help_grid.png'));
  }

  // learn: the chosen letter yellow, up to two neighbours on each side green, read in order
  if (mode === 'learn') {
    const from = Math.max(0, letter - 2), to = Math.min(25, letter + 2);
    const ids = [];
    for (let i = from; i <= to; i++) { cells[i].classList.add(i === letter ? 'yellow' : 'green'); ids.push(LETTERS[i]); }
    seq(...ids);
  }

  // place / pair: a yellow tile that must be dragged onto its cell
  let tile = null, target = -1;
  const nextTile = () => {
    if (st.done.size === 26) { tile && tile.remove(); play('verygood'); return; }
    target = target < 0 ? Math.floor(Math.random() * 26) : target;
    while (st.done.has(target)) target = (target + 1) % 26;
    const upper = mode === 'place' ? caseU : false;
    tile.textContent = upper ? LETTERS[target].toUpperCase() : LETTERS[target];
    play(LETTERS[target]);
  };
  if (mode === 'place' || mode === 'pair') {
    tile = el('div', { cls: 'tile', x: 460, y: 359, w: 53, h: 66, style: { background: '#ffff00', fontSize: '52px', fontWeight: 'bold', lineHeight: '58px' } });
    draggable(tile, {
      targets: () => cells.map((c, i) => ({ el: c, i })),
      drop: t => {
        st.tries++;
        if (t && t.i === target) {
          st.ok++; st.done.add(target); cells[target].classList.add('green');
          seq(LETTERS[target]).then(ok => ok && nextTile());
        } else tryAgain();
      },
    });
    nextTile();
  }

  // find: hear a letter, click it
  const nextFind = () => {
    const left = LETTERS.map((_, i) => i).filter(i => !st.done.has(i));
    if (!left.length) { play('verygood'); target = -1; return; }
    target = left[Math.floor(Math.random() * left.length)];
    play(LETTERS[target]);
  };
  if (mode === 'find') wait(400).then(ok => ok && nextFind());

  function cellClick(i) {
    if (mode === 'find') {
      if (target < 0 || st.done.has(i)) return;
      st.tries++;
      if (i === target) { st.ok++; st.done.add(i); cells[i].classList.add('green'); nextFind(); }
      else tryAgain();
    } else if (mode === 'learn' || mode === 'review') play(LETTERS[i]);
  }
}

// ================================================================ 4. score screen
function showStats(st, back) {
  clear('#0000ff');
  const secs = Math.round((Date.now() - st.start) / 1000);
  const pct = st.tries ? Math.round(100 * st.ok / st.tries) : 0;
  const box = (x, y, w, h, bg, html, fs) => el('div', { cls: 'he', x, y, w, h, html, style: { background: bg, fontSize: fs + 'px', fontWeight: 'bold', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1.1 } });
  box(215, 33, 209, 36, '#ff8080', `שיחקת ${secs} שניות`, 26);
  box(20, 226, 173, 29, '#ffffe0', `${st.tries}&nbsp; ניסיונות`, 22);
  box(269, 229, 102, 22, '#ffff80', `${st.ok} הצלחות`, 15);
  box(482, 185, 102, 110, '#ffff80', `${pct}<br>אחוזי<br>הצלחה`, 28);
  img('stats_exit', 542, 439, back);
}

// ================================================================ shared: recorder bar (form "Wav")
let lastRecording = null;
function recorder({ model, onClose }) {
  const bar = img('rec_bar', 149, 408);
  const helpB = img('rec_help', 537, 428, () => help(A + 'help.png'));
  const parts = [bar, helpB];
  let rec = null;
  const recBtn = hot(171, 418, 226, 465, async () => {
    if (rec) { rec.stop(); return; }
    await play('pleasrec');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      rec = new MediaRecorder(stream);
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        lastRecording = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        rec = null; recBtn.style.outline = '';
      };
      rec.start(); recBtn.style.outline = '3px solid red';
      setTimeout(() => rec && rec.state === 'recording' && rec.stop(), 3000);
    } catch (e) { console.warn('microphone unavailable', e); rec = null; }
  });
  const playMine = () => new Promise(r => {
    if (!lastRecording) return r();
    const a = new Audio(lastRecording); a.onended = r; a.onerror = r; a.play().catch(r);
  });
  parts.push(recBtn,
    hot(246, 418, 296, 463, async () => { if (await play(model)) await playMine(); }),   // model, then mine
    hot(317, 418, 356, 463, playMine),                                                   // mine
    hot(376, 418, 472, 459, () => { parts.forEach(p => p.remove()); onClose(); }));       // יציאה
}

// ================================================================ 5. letter writing (form "t0327")
function strokeFrames(L, upper) {
  const key = (upper ? 'u_' : 'l_') + L;
  const idx = STROKES[key] || [];
  const anim = idx.filter(i => i > 0);
  return { key, full: idx.includes(0) ? 0 : idx[idx.length - 1], anim };
}
const strokeSrc = (key, i) => `${A}strokes/${key}_${String(i).padStart(2, '0')}.png`;

function showWrite(i) {
  clear('#8080ff');
  const L = LETTERS[i];
  let upper = false;
  el('div', { x: 274, y: 194, w: 93, h: 93, style: { background: '#ffffb4', borderRadius: '50%' } });
  const letterImg = el('img', { x: 0, y: 0 });
  const setFrame = (key, f) => {
    letterImg.src = strokeSrc(key, f);
    letterImg.onload = () => { letterImg.style.left = Math.round(320 - letterImg.naturalWidth / 2) + 'px'; letterImg.style.top = Math.round(241 - letterImg.naturalHeight / 2) + 'px'; };
  };
  const showFull = () => { const s = strokeFrames(L, upper); setFrame(s.key, s.full); };
  showFull();

  const hint = img('hint_choose', 181, 350);
  const btns = [
    img('w_slow', 480, 29, () => animate(450)),
    img('w_fast', 480, 97, () => animate(130)),
    caseBtn(false, 540, 165, 34, 45),
    caseBtn(true, 523, 230, 67, 71),
    img('w_help', 508, 321, () => help(A + 'help.png')),
    img('w_exit', 508, 382, showMenu),
    img('btn_mic', 7, 428, () => { hide(...btns, hint); recorder({ model: L, onClose: () => show(...btns) }); }),
  ];
  // the original showed the current letter on these two buttons (handwritten small / Arial capital)
  function caseBtn(up, x, y, w, h) {
    const b = el('div', { cls: 'vbtn white', x, y, w, h, click: () => { upper = up; showFull(); play(L); } });
    if (up) { b.textContent = L.toUpperCase(); b.style.fontSize = '64px'; }
    else el('img', { src: strokeSrc('l_' + L, strokeFrames(L).full), style: { maxWidth: '28px', maxHeight: '39px' } }, b);
    return b;
  }
  async function animate(ms) {
    hide(...btns, hint);
    const s = strokeFrames(L, upper);
    play(L);
    for (const f of s.anim) { setFrame(s.key, f); if (!(await wait(ms))) return; }
    show(...btns);
  }
}

// ================================================================ 6. word screen (form "APPLE")
function showWord(i) {
  clear('#8080ff');
  const wd = WORDS[i];
  const label = el('div', { cls: 'word', text: wd.w, style: { right: (640 - 221) + 'px', top: '20px', height: '45px', fontSize: '40px', fontWeight: 'normal', lineHeight: '45px', padding: '0 1px' } });
  const pb = el('div', { cls: 'picbox', x: 241, y: 20, w: 159, h: 138 });
  const pic = el('img', { src: picSrc(wd) }, pb);
  play(wd.w);

  const hint = img('hint_choose', 181, 350);
  const mic = img('btn_mic', 14, 428, () => { hide(...main); recorder({ model: wd.w, onClose: restore }); });
  const main = [
    img('b_spell', 476, 11, spell),
    img('b_write', 476, 74, chooseWrite),
    img('b_game1', 476, 138, () => letterGame(1)),
    img('b_game2', 476, 203, () => letterGame(2)),
    img('b_wexit', 476, 266, showMenu),
    hint, mic,
  ];
  let extra = [];
  const restore = () => { extra.forEach(e => e.remove()); extra = []; show(...main, label); hide(hint); pic.src = picSrc(wd); };

  // writing strip with a dashed handwriting line
  const strip = () => {
    const s = el('div', { x: 92, y: 178, w: 457, h: 94, style: { background: '#fff' } });
    el('div', { x: 0, y: 60, w: 457, h: 1, style: { background: 'repeating-linear-gradient(90deg,#000 0 13px,transparent 13px 18px)' } }, s);
    extra.push(s); return s;
  };
  const placeLetter = (s, x, L, frame) => {
    const im = el('img', { x, y: 0 }, s);
    im.onload = () => { const h = im.naturalHeight; im.style.top = ('gjpqy'.includes(L) ? 60 - 36 : 60 - h) + 'px'; };
    im.src = strokeSrc('l_' + L, frame);
    return im;
  };
  const letterW = L => ({ m: 38, w: 28, a: 26, o: 25, g: 24 }[L] || ('ijlft'.includes(L) ? 14 : 23));

  async function spell() {
    hide(...main);
    const s = strip();
    if (!(await play(wd.w))) return;
    let x = 13;
    for (const L of wd.w) {
      placeLetter(s, x, L, strokeFrames(L).full); x += letterW(L) + 13;
      if (!(await play(L))) return;
    }
    if (!(await play(wd.w))) return;
    if (await wait(700)) restore();
  }

  function chooseWrite() {
    hide(...main);
    extra.push(img('b_wslow', 476, 74, () => write(350)), img('b_wfast', 476, 123, () => write(90)));
  }
  async function write(ms) {
    extra.forEach(e => e.remove()); extra = [];
    hide(label);
    const s = strip();
    if (!(await play(wd.w))) return;
    let x = 13;
    for (const L of wd.w) {
      const f = strokeFrames(L);
      const im = placeLetter(s, x, L, f.anim[0] ?? f.full);
      play(L);
      for (const fr of f.anim) { im.src = strokeSrc(f.key, fr); if (!(await wait(ms))) return; }
      x += letterW(L) + 13;
    }
    if (!(await play(wd.w))) return;
    if (await wait(500)) restore();
  }

  // game 1: drag each black letter onto the matching blue one
  // game 2: scrambled letters, drag each into its empty slot
  function letterGame(n) {
    hide(...main);
    const word = wd.w.split('');
    const size = n === 1 ? { w: 57, h: 73, x0: 7, dx: 77, fs: 56 } : { w: 67, h: 67, x0: 33, dx: 87, fs: 56 };
    const order = word.map((_, k) => k);
    if (n === 2) { do { order.sort(() => Math.random() - .5); } while (word.length > 1 && order.every((v, k) => word[v] === word[k])); }
    const slots = word.map((L, k) => {
      const t = el('div', { cls: 'tile', x: size.x0 + k * size.dx, y: 277, w: size.w, h: size.h, text: n === 1 ? L : '', style: { fontSize: size.fs + 'px', lineHeight: size.h + 'px', color: '#0000c0' } });
      extra.push(t); return { el: t, L, filled: false, k };
    });
    let placed = 0;
    order.forEach((src, k) => {
      const L = word[src];
      const t = el('div', { cls: 'tile', x: size.x0 + k * size.dx, y: 194, w: size.w, h: size.h, text: L, style: { fontSize: size.fs + 'px', lineHeight: size.h + 'px' } });
      extra.push(t);
      draggable(t, {
        targets: () => slots.filter(s => !s.filled).map(s => ({ el: s.el, s })),
        drop: tg => {
          if (tg && tg.s.L === L) {
            tg.s.filled = true; tg.s.el.textContent = L; tg.s.el.style.color = '#000';
            t.remove(); placed++;
            play(L).then(ok => { if (ok && placed === word.length) play(wd.w).then(ok2 => ok2 && wait(600).then(o => o && restore())); });
          } else tryAgain();
        },
      });
    });
    let hidden = false;
    const tog = el('div', { cls: 'vbtn he', x: 244, y: 407, w: 152, h: 48, text: 'הסתר מילה', style: { background: '#e8e8e8', fontSize: '20px' } });
    tog.addEventListener('click', () => { hidden = !hidden; tog.textContent = hidden ? 'הצג מילה' : 'הסתר מילה'; label.classList.toggle('hidden', hidden); });
    extra.push(tog,
      img('g_help', 7, 407, () => help(A + 'drag1.png', { drag: true })),
      img('g_exit', 481, 407, restore));
  }
}

// ================================================================ 7. keyboard (form "KeyBord")
function showKeyboard(i) {
  clear('#8080ff');
  const wd = WORDS[i];
  const pb = el('div', { cls: 'picbox', x: 240, y: 7, w: 161, h: 140, style: { border: '1px solid #808080' } });
  const pic = el('img', { src: picSrc(wd) }, pb);
  el('div', { cls: 'word', text: wd.w, style: { top: '155px', left: '320px', transform: 'translateX(-50%)', fontSize: '40px', height: '44px', lineHeight: '44px', padding: '0 1px' } });
  img('k_keyboard', 68, 257);
  const greens = {};
  const keyBox = L => {
    const k = KEYS[L.toUpperCase()];
    return greens[L] || (greens[L] = el('div', { x: 68 + k[0], y: 257 + k[1], w: k[2] - k[0], h: k[3] - k[1], cls: 'hidden', style: { background: '#00ff00', color: '#000', fontSize: '14px', paddingLeft: '18px', lineHeight: '20px', pointerEvents: 'none' }, text: L.toUpperCase() }));
  };
  const lbl = el('div', { cls: 'he', x: 424, y: 1, w: 199, h: 26, text: 'בחר באחד הכפתורים', style: { background: '#ffff80', color: '#0000c0', fontSize: '17px', fontWeight: 'bold', textAlign: 'center', lineHeight: '26px' } });
  const ctl = [
    lbl,
    img('k_help', 2, 4, () => help(A + 'help.png')),
    img('k_demo', 568, 28, demo),
    img('k_mouse', 568, 89, () => practice('mouse')),
    img('k_hand', 568, 150, () => practice('hand')),
  ];
  const exitB = img('k_exit', 486, 431, () => (session ? endPractice() : showMenu()));
  let session = null;
  const word = wd.w.split('');
  const greenOff = () => Object.values(greens).forEach(g => hide(g));

  async function demo() {
    hide(...ctl, exitB);
    if (!(await play(wd.w))) return;
    for (const L of word) {
      greenOff(); show(keyBox(L));
      if (!(await play(L))) return;
      if (!(await wait(250))) return;
    }
    greenOff();
    if (await play(wd.w)) show(...ctl, exitB);
  }

  function practice(kind) {
    hide(...ctl);
    const hint = img(kind === 'mouse' ? 'k_hint_mouse' : 'k_hint_hand', 0, 0);
    const box = kind === 'hand' ? el('div', { x: 269, y: 207, w: 194, h: 50, style: { background: '#fff', fontSize: '38px', fontWeight: 'bold', lineHeight: '50px', paddingLeft: '12px', borderLeft: '1px solid #000' } }) : null;
    session = { kind, pos: 0, hint, box, keyHots: [] };
    play(kind === 'mouse' ? 'click' : 'type');
    const mark = () => { greenOff(); if (session.pos < word.length) show(keyBox(word[session.pos])); };
    mark();
    const press = L => {
      if (!session || session.pos >= word.length) return;
      if (L === word[session.pos]) {
        session.pos++;
        if (box) box.textContent = wd.w.slice(0, session.pos);
        mark(); hide(hint);
        play(L).then(async ok => {
          if (!ok || session.pos < word.length) return;
          pic.src = picSrc(wd, true);
          if (!(await seq(wd.w, 'verygood'))) return;
          if (await wait(1500)) endPractice();
        });
      } else tryAgain();
    };
    if (kind === 'mouse') {
      for (const L of 'qwertyuiopasdfghjklzxcvbnm') {
        const k = KEYS[L.toUpperCase()];
        session.keyHots.push(hot(68 + k[0], 257 + k[1], 68 + k[2], 257 + k[3], () => press(L)));
      }
    } else {
      document.onkeydown = e => {
        if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
        if (e.getModifierState && e.getModifierState('CapsLock')) { help(A + 'helpcaps.png'); return; }
        press(e.key.toLowerCase());
      };
    }
  }
  function endPractice() {
    if (!session) return;
    stopAudio(); greenOff();
    session.hint.remove(); session.box && session.box.remove(); session.keyHots.forEach(h => h.remove());
    document.onkeydown = null; session = null;
    pic.src = picSrc(wd); show(...ctl, exitB);
  }
}

// ================================================================ 8. games menu (form "Games")
function showGames(upto) {
  clear('#0000ff');
  img('games_bg', 0, 0);
  el('div', { cls: 'he', x: 213, y: 454, w: 213, h: 26, text: 'בחר באחד המשחקים', style: { background: '#ffff80', fontSize: '17px', fontWeight: 'bold', textAlign: 'center', lineHeight: '26px' } });
  const back = () => showGames(upto);
  const words = WORDS.slice(0, upto + 1);
  hot(12, 35, 97, 115, () => showGrid({ caseU: false, mode: 'review', back }));      // חזרה ABC
  hot(118, 35, 203, 115, () => showGrid({ caseU: false, mode: 'place', back }));     // שבץ abc
  hot(225, 35, 310, 115, () => showGrid({ caseU: true, mode: 'place', back }));      // שבץ ABC
  hot(332, 35, 417, 115, () => showGrid({ caseU: false, mode: 'find', back }));      // מצא abc
  hot(439, 35, 524, 115, () => showGrid({ caseU: true, mode: 'find', back }));       // מצא ABC
  hot(544, 35, 629, 115, () => showGrid({ caseU: true, mode: 'pair', back }));       // זווג a-A
  hot(12, 185, 97, 265, () => showWords(words, 'review', back));                     // חזרה מילים
  hot(118, 185, 203, 265, () => showWords(words, 'find', back));                     // מצא מילה
  hot(21, 312, 145, 441, () => showFindPic(words, back));                            // מצא את התמונה
  hot(190, 312, 314, 441, () => showMatch(words.slice(-6), back));                   // התאם מילה לתמונה
  hot(540, 439, 636, 480, showMenu);                                                 // יציאה
}

// ---------------------------------------------------------------- word review / find word
function showWords(words, mode, back) {
  clear('#0000ff');
  const st = { tries: 0, ok: 0, start: Date.now(), done: new Set() };
  const rows = Math.ceil(words.length / 3);
  const pitch = rows <= 3 ? 192 : Math.floor(445 / rows);
  const fs = rows <= 3 ? 50 : Math.min(50, Math.floor(pitch * 0.8));
  const CX = [107, 320, 533];
  const els = words.map((wd, k) => el('div', {
    cls: 'word', text: wd.w,
    style: { left: CX[k % 3] + 'px', top: Math.floor(k / 3) * pitch + 'px', transform: 'translateX(-50%)', fontSize: fs + 'px', background: mode === 'find' ? '#ffffe0' : '#fff', cursor: 'pointer' },
    click: () => pick(k),
  }));
  img('gw_exit', 0, 449, () => (mode === 'find' ? showStats(st, back) : back()));
  img(mode === 'find' ? 'gw_hint_find' : 'gw_hint_review', 421, 449);
  let target = -1;
  const next = () => {
    const left = words.map((_, k) => k).filter(k => !st.done.has(k));
    if (!left.length) { play('verygood'); target = -1; return; }
    target = left[Math.floor(Math.random() * left.length)];
    play(words[target].w);
  };
  if (mode === 'find') wait(400).then(ok => ok && next());
  function pick(k) {
    if (mode === 'review') { els.forEach(e => e.style.background = '#fff'); els[k].style.background = '#80ff80'; play(words[k].w); return; }
    if (target < 0 || st.done.has(k)) return;
    st.tries++;
    if (k === target) { st.ok++; st.done.add(k); els[k].style.background = '#80ff80'; next(); }
    else tryAgain();
  }
}

// ---------------------------------------------------------------- find the picture
function showFindPic(words, back) {
  clear('#0000ff');
  const st = { tries: 0, ok: 0, start: Date.now(), done: new Set() };
  const n = words.length;
  const cols = n <= 9 ? 3 : n <= 16 ? 4 : n <= 20 ? 5 : 6;
  const rows = Math.ceil(n / cols);
  const cw = 640 / cols, ch = Math.min(174, 449 / rows);
  const pw = Math.min(154, cw - 14, (ch - 8) * 154 / 133), ph = pw * 133 / 154;
  const pics = words.map((wd, k) => {
    const c = k % cols, r = Math.floor(k / cols);
    const b = el('div', { cls: 'picbox hot', x: Math.round(c * cw + (cw - pw) / 2), y: Math.round(r * ch), w: Math.round(pw), h: Math.round(ph), click: () => pick(k) });
    const im = el('img', { src: picSrc(wd) }, b);
    return im;
  });
  img('gw_exit', 0, 449, () => showStats(st, back));
  el('div', { cls: 'he', x: 236, y: 461, w: 168, h: 19, text: 'בחר את התמונה הנכונה', style: { background: '#ffff00', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', lineHeight: '19px' } });
  let target = -1;
  const next = () => {
    const left = words.map((_, k) => k).filter(k => !st.done.has(k));
    if (!left.length) { play('verygood'); target = -1; return; }
    target = left[Math.floor(Math.random() * left.length)];
    play(words[target].w);
  };
  wait(400).then(ok => ok && next());
  function pick(k) {
    if (target < 0 || st.done.has(k)) return;
    st.tries++;
    if (k === target) { st.ok++; st.done.add(k); pics[k].src = picSrc(words[k], true); next(); }
    else tryAgain();
  }
}

// ---------------------------------------------------------------- match word to picture
function showMatch(words, back) {
  clear('#0000ff');
  const st = { tries: 0, ok: 0, start: Date.now() };
  const PX = [30, 243, 456];
  const pics = words.map((wd, k) => {
    const b = el('div', { cls: 'picbox', x: PX[k % 3], y: 33 + Math.floor(k / 3) * 200, w: 154, h: 133 });
    return { box: b, im: el('img', { src: picSrc(wd) }, b), k, done: false };
  });
  const order = words.map((_, k) => k).sort(() => Math.random() - .5);
  const slotY = words.length <= 3 ? [193] : [393, 437];
  const CX = [107, 320, 533];
  let matched = 0;
  order.forEach((wk, pos) => {
    const t = el('div', { cls: 'word', text: words[wk].w, style: { left: CX[pos % 3] + 'px', top: slotY[Math.floor(pos / 3)] + 'px', transform: 'translateX(-50%)', fontSize: '26px', padding: '0 1px', background: '#ffffe0', cursor: 'grab' } });
    draggable(t, {
      targets: () => pics.filter(p => !p.done).map(p => ({ el: p.box, p })),
      drop: tg => {
        st.tries++;
        if (tg && tg.p.k === wk) {
          st.ok++; tg.p.done = true; matched++;
          tg.p.im.src = picSrc(words[wk], true);
          t.style.left = (parseInt(tg.p.box.style.left) + 77) + 'px';
          t.style.top = (parseInt(tg.p.box.style.top) + 138) + 'px';
          t.style.cursor = 'default'; t.dataset.locked = '1';
          play(words[wk].w).then(ok => ok && matched === words.length && play('verygood'));
        } else tryAgain();
      },
    });
  });
  img('gw_exit', 0, 449, () => showStats(st, back));
  img('gw_help', 585, 452, () => help(A + 'drg_word.png', { drag: true }));
}

// ---------------------------------------------------------------- drag & drop (pointer events; works with touch)
let drag = null;
function dragCancel() { if (drag) { drag.ghost.remove(); drag.src.classList.remove('dragging'); drag = null; } }
function draggable(node, { targets, drop }) {
  node.style.cursor = 'grab';
  node.addEventListener('pointerdown', e => {
    if (node.dataset.locked) return;
    e.preventDefault();
    const sr = stage.getBoundingClientRect(), s = scale();
    const nr = node.getBoundingClientRect();
    const ghost = node.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.transform = 'none';
    ghost.style.left = (nr.left - sr.left) / s + 'px'; ghost.style.top = (nr.top - sr.top) / s + 'px';
    stage.appendChild(ghost); node.classList.add('dragging');
    drag = { src: node, ghost, ox: (e.clientX - nr.left) / s, oy: (e.clientY - nr.top) / s };
    const move = ev => {
      if (!drag) return;
      ghost.style.left = ((ev.clientX - sr.left) / s - drag.ox) + 'px';
      ghost.style.top = ((ev.clientY - sr.top) / s - drag.oy) + 'px';
    };
    const up = ev => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      if (!drag) return;
      const x = ev.clientX, y = ev.clientY;
      dragCancel();
      const hit = targets().find(t => { const r = t.el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
      drop(hit || null);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}

// ---------------------------------------------------------------- boot
showCover();
