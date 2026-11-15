/* Let's Go LIFE (1tree) — new screens for the surviving LIFE voice clips.
 * The clips describe Sam's room in 21 scenes of three sentences, each sentence
 * recorded as 2-4 phrase clips; scenes 1, 10, 11 and 12 also have answer forms.
 * No original program or pictures survive, so this is a listen + build-the-sentence
 * activity in the look of the other 1tree apps (640x480 stage, scaled to fit).
 */
'use strict';

const A = 'assets/';
const stage = document.getElementById('stage');
const SCENES = window.LIFE_SCENES || [];

// ---------------------------------------------------------------- scaling
function fit() {
  const s = Math.min(innerWidth / 640, innerHeight / 480);
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
  const s = e.style;
  if (o.x != null) { e.classList.add('a'); s.left = o.x + 'px'; s.top = o.y + 'px'; }
  if (o.w != null) s.width = o.w + 'px';
  if (o.h != null) s.height = o.h + 'px';
  if (o.style) Object.assign(s, o.style);
  if (o.click) { e.classList.add('hot'); e.addEventListener('click', ev => { ev.stopPropagation(); o.click(ev); }); }
  if (parent) parent.appendChild(e);
  return e;
}
const vbtn = (x, y, w, h, text, click, cls = '') => el('div', { cls: 'vbtn he ' + cls, x, y, w, h, text, click });
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- audio
// Every screen change bumps `epoch`; pending sequences from the old screen stop.
let epoch = 0, current = null;
const audioCache = {};
function stopAudio() { epoch++; if (current) { current.pause(); current = null; } }
function play(file) {
  const my = epoch;
  return new Promise(res => {
    if (my !== epoch || !file) return res(my === epoch);
    let a = audioCache[file];
    if (!a) { a = audioCache[file] = new Audio(A + file + '.wav'); a.preload = 'auto'; }
    if (current && current !== a) current.pause();
    current = a; a.currentTime = 0;
    let done = false;
    const fin = ok => { if (!done) { done = true; a.onended = a.onerror = null; clearTimeout(t); res(ok && my === epoch); } };
    a.onended = () => fin(true); a.onerror = () => fin(true);
    const t = setTimeout(() => fin(true), 8000);
    a.play().catch(() => fin(true));
  });
}
const wait = ms => { const my = epoch; return new Promise(r => setTimeout(() => r(my === epoch), ms)); };

/** Plays a sentence clip by clip, marking each phrase element while it sounds. */
async function playSentence(clips, nodes = []) {
  stopAudio();
  for (let i = 0; i < clips.length; i++) {
    nodes.forEach((n, j) => n.classList.toggle('cur', j === i));
    if (!(await play(clips[i][0]))) return false;
    if (!(await wait(120))) return false;
  }
  nodes.forEach(n => n.classList.remove('cur'));
  return true;
}

// ---------------------------------------------------------------- progress (per browser, optional)
const done = (() => { try { return new Set(JSON.parse(localStorage.getItem('life_done') || '[]')); } catch { return new Set(); } })();
const doneKey = (n, ans, si) => `${n}${ans ? 'a' : ''}_${si}`;
function markDone(k) { done.add(k); try { localStorage.setItem('life_done', JSON.stringify([...done])); } catch {} }
const sceneDone = sc => sc.s.every((_, i) => done.has(doneKey(sc.n, false, i)));

// ---------------------------------------------------------------- screens
function clear(bg = '#8080ff') { stopAudio(); dragCancel(); stage.innerHTML = ''; stage.style.background = bg; }

function showCover() {
  clear('#ff0000');
  el('div', { cls: 'panel', x: 70, y: 50, w: 500, h: 280 });
  el('img', { src: A + 'onetree_logo.png', x: 102, y: 80, w: 436, h: 66 });
  el('div', { cls: 'title', x: 0, y: 170, text: "Let's Go LIFE", style: { fontSize: '56px', direction: 'ltr' } });
  el('div', { cls: 'he', x: 90, y: 262, w: 460, text: 'החדר של סם: האזנה למשפטים באנגלית ושיבוץ החלקים לפי הסדר', style: { textAlign: 'center', fontSize: '17px', fontWeight: 'bold' } });
  vbtn(240, 370, 160, 54, 'התחל', showMenu, 'grey').style.fontSize = '24px';
}

function showMenu() {
  clear();
  el('div', { cls: 'bar he', text: 'בחר סצנה' });
  SCENES.forEach((sc, i) => {
    const c = i % 7, r = Math.floor(i / 7);
    const card = el('div', { cls: 'card' + (sceneDone(sc) ? ' done' : '') + (sc.a ? ' has-ans' : ''), x: 640 - 8 - 84 - c * 90, y: 50 + r * 124, w: 84, h: 118, click: () => showScene(sc.n, false) });
    el('div', { cls: 'num', text: sc.n }, card);
    el('div', { cls: 'txt', text: sc.s[0].map(c => c[1]).join(' ') }, card);
  });
  const lg = el('div', { cls: 'legend he', x: 220, y: 440, w: 250 });
  el('i', {}, lg); el('span', { text: 'בסצנה צהובה יש גם תשובות' }, lg);
  vbtn(486, 428, 140, 42, 'יציאה', showCover);
}

function showScene(n, ans) {
  clear();
  const sc = SCENES[n - 1], sents = ans ? sc.a : sc.s;
  el('div', { cls: 'bar he', text: `סצנה ${n}` + (ans ? ' · תשובות' : '') });
  el('div', { cls: 'mode he', x: 14, y: 48, w: 612, text: 'לחץ על חלק במשפט כדי לשמוע אותו', style: { textAlign: 'right' } });
  const rows = sents.map((clips, si) => {
    const y = 80 + si * 104;
    const row = el('div', { cls: 'row', x: 14, y });
    const nodes = clips.map(c => el('div', { cls: 'phrase', text: c[1], click: () => { stopAudio(); play(c[0]); } }, row));
    vbtn(548, y, 78, 36, '▶ שמע', () => playSentence(clips, nodes));
    const b = vbtn(466, y, 76, 36, (done.has(doneKey(n, ans, si)) ? '✓ ' : '') + 'שבץ', () => showBuild(n, ans, si));
    if (done.has(doneKey(n, ans, si))) b.style.color = '#008000';
    return { clips, nodes };
  });
  vbtn(486, 420, 140, 46, 'חזרה לתפריט', showMenu);
  vbtn(336, 420, 140, 46, '▶ שמע הכל', async () => {
    for (const r of rows) { if (!(await playSentence(r.clips, r.nodes))) return; if (!(await wait(500))) return; }
  });
  if (sc.a) vbtn(186, 420, 140, 46, ans ? 'משפטים' : 'תשובות', () => showScene(n, !ans));
  const prev = vbtn(98, 420, 82, 46, '▶ הקודמת', () => showScene(n - 1, false));
  const next = vbtn(14, 420, 80, 46, 'הבאה ◀', () => showScene(n + 1, false));
  prev.style.fontSize = next.style.fontSize = '14px';
  if (n === 1) prev.setAttribute('disabled', '');
  if (n === SCENES.length) next.setAttribute('disabled', '');
}

function showBuild(n, ans, si) {
  clear();
  const sc = SCENES[n - 1], clips = (ans ? sc.a : sc.s)[si];
  el('div', { cls: 'bar he', text: `סצנה ${n} · שבץ את המשפט` });
  el('div', { cls: 'hint he', x: 14, y: 54, text: 'הקשב למשפט וגרור את החלקים לפי הסדר' });
  const line = el('div', { cls: 'pool built', x: 14, y: 90, style: { minHeight: '64px' } });
  const box = el('div', { cls: 'dropbox' }, line);
  const pool = el('div', { cls: 'pool', x: 14, y: 220 });
  let pos = 0, finished = false;
  const back = () => showScene(n, ans);
  shuffle(clips.map((_, i) => i)).forEach(i => {
    const chip = el('div', { cls: 'chip', text: clips[i][1] }, pool);
    draggable(chip, {
      targets: () => [{ el: line }],
      drop: async tg => {
        if (!tg) return;
        if (clips[i][1] !== clips[pos][1]) { tryAgain(); return; }
        chip.style.visibility = 'hidden'; chip.dataset.locked = '1';
        line.insertBefore(el('div', { cls: 'chip', text: clips[pos][1] }, null), box);
        stopAudio(); const file = clips[pos][0]; pos++;
        if (pos < clips.length) { play(file); return; }
        finished = true; box.remove(); markDone(doneKey(n, ans, si));
        if (!(await playSentence(clips, [...line.children]))) return;
        if (!(await play('verygood'))) return;
        if (await wait(500)) back();
      },
    });
  });
  vbtn(486, 420, 140, 46, 'חזרה', back);
  vbtn(336, 420, 140, 46, '▶ שמע שוב', () => playSentence(clips));
  vbtn(186, 420, 140, 46, 'רמז', () => { if (!finished) { stopAudio(); play(clips[pos][0]); } });
  wait(250).then(ok => ok && playSentence(clips));
}

function tryAgain() {
  stopAudio(); play('again');
  const s = el('img', { src: A + 'try_again.png', x: 249, y: 177, style: { zIndex: 40, pointerEvents: 'none' } });
  setTimeout(() => s.remove(), 900);
}

// ---------------------------------------------------------------- drag and drop (pointer events)
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
    Object.assign(ghost.style, { position: 'absolute', width: nr.width / s + 'px', height: nr.height / s + 'px', left: (nr.left - sr.left) / s + 'px', top: (nr.top - sr.top) / s + 'px' });
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
