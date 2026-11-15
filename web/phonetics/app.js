/* Let's Go Phonetics (1tree, ~1995) — faithful HTML rebuild.
 * Screens, layouts and behaviour were recorded from the original GO_PHONS.EXE
 * running under Wine at its native 640x480; the lesson data (sound families,
 * words, highlighted letters, sentences, translations) was decoded from the EXE.
 * All coordinates are in the original pixel space; the stage is scaled to fit.
 */
'use strict';

const A = 'assets/', UI = 'assets/ui/';
const stage = document.getElementById('stage');
const PAGES = window.PH_PAGES || [];
const KEYS = window.PH_KEYS || {};
const picSrc = (w, colored) => `${A}${w.pic}_${colored ? 3 : 1}.png`;
const sentence = (wd, n) => (wd.s[n] || '') + '.';
const COLOURS = ['#8080ff', '#ff80ff'];   // the colour button toggles the background
let colour = 0;
const bg = () => COLOURS[colour];

// ---------------------------------------------------------------- scaling
function fit() {
  const s = Math.min(innerWidth / 640, innerHeight / 480);
  stage.style.transform = `scale(${s})`;
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
  if (src.startsWith('rec_') || src === 'mic') e.dataset.mic = '1';
  return e;
};
const hot = (x0, y0, x1, y1, click, parent = stage) => el('div', { x: x0, y: y0, w: x1 - x0, h: y1 - y0, click }, parent);
const show = (...es) => es.forEach(e => e && e.classList.remove('hidden'));
const hide = (...es) => es.forEach(e => e && e.classList.add('hidden'));
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------------------------------------------------------------- audio
// Every screen change bumps `epoch`; pending sequences from the old screen stop.
let epoch = 0, current = null;
const audioCache = {};
function stopAudio() { epoch++; if (current) { current.pause(); current = null; } }
function play(name) {
  const my = epoch;
  return new Promise(res => {
    if (my !== epoch || !name) return res(my === epoch);
    const file = name.toLowerCase().replace(/[^a-z0-9_']/g, '');
    if (!file) return res(true);
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
async function seq(...names) { for (const n of names) if (!(await play(n))) return false; return true; }

// ---------------------------------------------------------------- shared pieces
function clear(colourOrBg = bg()) {
  stopAudio(); dragCancel();
  stage.innerHTML = ''; stage.style.background = colourOrBg;
  document.onkeydown = null;
}

function tryAgain() {
  play('again');
  const s = el('img', { src: UI + 'try_again.png', x: 249, y: 177, style: { zIndex: 40 } });
  setTimeout(() => s.remove(), 900);
}

/** A Windows 3.1 3D button; `html` is its face. */
const vbtn = (x, y, w, h, html, click, style = {}, parent = stage) =>
  el('div', { cls: 'vbtn he', x, y, w, h, html, click, style }, parent);

/** Letters in separate white boxes, the sound's letters on yellow (as on the menus). */
function letterRow(word, hl, x, y, parent = stage) {
  const row = el('div', { cls: 'letters', x, y }, parent);
  [...word].forEach((ch, i) => el('span', { text: ch, cls: hl.includes(i + 1) ? 'hl' : '' }, row));
  return row;
}

/** Full-screen help image with an exit hotspot. */
function helpScreen(src, exitBox, { onClose, extra } = {}) {
  const layer = el('div', { x: 0, y: 0, w: 640, h: 480, style: { zIndex: 30, background: '#fff' } });
  el('img', { src, x: 0, y: 0 }, layer);
  if (extra) extra(layer);
  hot(...exitBox, () => { layer.remove(); onClose && onClose(); }, layer);
  return layer;
}
/** A bitmap help card (installer's HELP.BMP etc.) on the pale help background. */
function helpCard(src, { onClose } = {}) {
  const layer = el('div', { x: 0, y: 0, w: 640, h: 480, style: { zIndex: 30, background: '#ffffe0' } });
  const i = el('img', { src, x: 0, y: 0 }, layer);
  i.onload = () => { i.style.left = Math.round(300 - i.naturalWidth / 2) + 'px'; i.style.top = Math.round(Math.max(0, 220 - i.naturalHeight / 2)) + 'px'; };
  img('drag_help_exit', 539, 417, () => { layer.remove(); onClose && onClose(); }, layer);
  return layer;
}

// ================================================================ 1. cover (form "frmLogo")
function showCover() {
  clear('#ff0000');
  img('cover_bg', 0, 0);
  el('div', { x: 0, y: 466, w: 110, h: 14, cls: 'he', text: '© כל הזכויות שמורות', style: { background: '#fff', fontSize: '11px', lineHeight: '14px', paddingRight: '3px' } });
  hot(75, 419, 178, 467, () => helpCard(A + 'help.png'));                      // הסבר
  hot(269, 419, 372, 467, () => helpCard(A + 'hevra.png'));                    // הזמנות
  hot(466, 419, 570, 469, () => { play('lets_go'); showTop(0); });             // התחל
}

// ================================================================ 2. sound families (form "top_form")
const CARD_X = [27, 241, 454], CARD_Y = [21, 241];
function showTop(page) {
  clear();
  PAGES[page].forEach((fam, i) => {
    const x = CARD_X[i % 3], y = CARD_Y[Math.floor(i / 3)];
    const card = el('div', { cls: 'card', x, y, w: 159, h: 138, click: () => showInner(page, i) });
    el('img', { src: `${A}${fam.key.toLowerCase()}_1.png` }, card);
    img('grey_sq', x, y, () => play(fam.sfx));                                 // plays the yellow letters' sound
    letterRow(fam.key, fam.hl, x, y + 145);
  });
  img('top_help', 3, 436, () => helpScreen(UI + 'help_top.png', [19, 419, 125, 470], {
    extra: l => el('div', { x: 299, y: 428, w: 39, h: 37, style: { background: bg() } }, l),
  }));
  img('top_colour_' + colour, 297, 436, () => { colour = (colour + 1) % COLOURS.length; showTop(page); });
  if (page > 0) img('top_up', 422, 436, () => showTop(page - 1));
  if (page < PAGES.length - 1) img('top_down', 478, 436, () => showTop(page + 1));
  img('top_end', 535, 436, showCover);
}

// ================================================================ 3. a family's words (form "inner_form")
const IN_X = [23, 237, 450], IN_Y = [14, 237];
function showInner(page, fi) {
  clear();
  const fam = PAGES[page][fi];
  const cards = fam.words.map((wd, i) => {
    const x = IN_X[i % 3], y = IN_Y[Math.floor(i / 3)];
    const c = el('div', { cls: 'card', x, y, w: 167, h: 146, click: () => cardClick(i) });
    el('img', { src: picSrc(wd) }, c);
    const lbl = letterRow(wd.w, wd.hl, x, y + 152);
    return { c, lbl };
  });
  const helpB = img('in_help', 7, 436, () => helpScreen(UI + 'help_inner.png', [19, 419, 125, 470]));
  const gameB = img('in_game', 270, 436, startGame);
  img('in_exit', 531, 436, () => (game ? showInner(page, fi) : showTop(page)));

  let game = null;
  function startGame() {
    hide(helpB, gameB); cards.forEach(k => hide(k.lbl));
    game = { tries: 0, ok: 0, left: shuffle(fam.words.map((_, i) => i)), target: -1 };
    next();
  }
  function next() {
    if (!game.left.length) { showScore(game, () => showInner(page, fi)); return; }
    game.target = game.left.shift();
    play(fam.words[game.target].w);
  }
  function cardClick(i) {
    if (!game) { showPrat(page, fi, i); return; }
    if (game.target < 0 || cards[i].c.style.visibility === 'hidden') return;
    game.tries++;
    if (i === game.target) { game.ok++; cards[i].c.style.visibility = 'hidden'; next(); }
    else { tryAgain(); wait(900).then(ok => ok && play(fam.words[game.target].w)); }
  }
}

function showScore(st, back) {
  clear();
  const box = (x, y, w, h, bgc, text, fs) => el('div', { cls: 'he', x, y, w, h, text, style: { background: bgc, fontSize: fs + 'px', textAlign: 'center', lineHeight: h + 'px' } });
  box(155, 145, 116, 32, '#ffff80', 'הצלחות', 18);
  box(369, 145, 116, 32, '#80ff80', 'נסיונות', 18);
  box(155, 199, 116, 82, '#ffff80', String(st.ok), 56);
  box(369, 199, 116, 83, '#80ff80', String(st.tries), 56);
  img('score_exit', 531, 436, back);
  if (st.ok === st.tries) play('verygood');
}

// ================================================================ 4. lesson (form "PRAT")
function showPrat(page, fi, wi, sn = 0) {
  clear();
  const fam = PAGES[page][fi], wd = fam.words[wi];
  let sent = sn;
  const back = () => showPrat(page, fi, wi, sent);

  // picture (box sized to the picture), word, sentence
  const pb = el('div', { cls: 'picbox', x: 240, y: 20, style: { border: '1px solid #808080' } });
  const pic = el('img', { src: picSrc(wd) }, pb);
  const word = el('div', { cls: 'word', text: wd.w, x: 420, y: 20, style: { fontSize: '26px', height: '30px', lineHeight: '30px', padding: '0 1px' } });
  const sentEl = el('div', { cls: 'sentence', x: 320, y: 173 });
  const layout = () => {
    const w = pic.naturalWidth || 159, h = pic.naturalHeight || 138;
    Object.assign(pb.style, { left: Math.round(320 - w / 2 - 1) + 'px', width: w + 'px', height: h + 'px' });
    word.style.left = Math.round(320 + w / 2 + 21) + 'px';
    sentEl.style.top = (20 + h + 2 + 13) + 'px';
  };
  pic.onload = layout; if (pic.complete) layout();
  const setSentence = () => { sentEl.innerHTML = ''; sentence(wd, sent).split(' ').forEach((t, i) => { if (i) sentEl.append(' '); el('span', { text: t }, sentEl); }); };
  setSentence();

  // left column: sentence study; right column: word study
  const left = img('prat_left', 6, 7);
  const spin = el('div', { cls: 'spin he', x: 6, y: 60, w: 100, h: 29 });
  const spinTxt = el('span', { text: `משפט ${sent + 1}` }, spin);
  const upDown = el('div', { cls: 'updown' }, spin);
  const flip = () => { sent = 1 - sent; spinTxt.textContent = `משפט ${sent + 1}`; setSentence(); trans.textContent = wd.he[sent] || ''; play(wd.w + sent); };
  el('div', { text: '▲', click: flip }, upDown); el('div', { text: '▼', click: flip }, upDown);
  const trans = el('div', { cls: 'he trans', x: 7, y: 382, w: 108, h: 22, text: wd.he[sent] || '' });
  const leftHots = [
    hot(8, 102, 108, 144, () => readLetters()),
    hot(8, 159, 108, 201, () => readWords()),
    hot(8, 215, 108, 257, () => sentenceGame()),
    hot(8, 271, 108, 311, () => showSentKeyboard(wd, sent, back)),
    hot(8, 326, 108, 368, () => mic(wd.w + sent)),
  ];
  const right = img('prat_right', 529, 7);
  const rightHots = [
    hot(531, 60, 633, 102, () => spell()),
    hot(531, 116, 633, 158, () => wordGame()),
    hot(531, 173, 633, 213, () => showKeyboard(wd, back)),
    hot(531, 227, 633, 269, () => mic(wd.w)),
  ];
  const helpB = img('prat_help', 531, 377, pratHelp);
  const exitB = img('prat_exit', 531, 434, () => showInner(page, fi));
  const chrome = [left, spin, ...leftHots, right, ...rightHots, helpB, exitB];
  let extra = [];
  const busy = (keep = []) => { hide(...chrome.filter(c => !keep.includes(c))); };
  const restore = () => { stopAudio(); dragCancel(); extra.forEach(e => e.remove()); extra = []; stage.style.background = bg(); show(...chrome, word, sentEl, trans, pb); sentEl.querySelectorAll('span').forEach(s => s.className = ''); };

  if (sn === 0) seq(wd.w + '0', wd.w);

  // איות: the letters appear one by one under the picture
  async function spell() {
    busy(); hide(word, sentEl); stage.style.background = '#c0c0c0';
    const tiles = tileRow(wd.w.length, 173);
    if (!(await play(wd.w))) return;
    for (let i = 0; i < wd.w.length; i++) {
      tiles[i].textContent = wd.w[i]; show(tiles[i]);
      if (!(await play(wd.w[i]))) return;
    }
    if (!(await play(wd.w))) return;
    if (await wait(600)) restore();
  }
  function tileRow(n, y) {
    const x0 = Math.round(320 - (n * 87 - 20) / 2);
    const t = Array.from({ length: n }, (_, i) => el('div', { cls: 'tile hidden', x: x0 + i * 87, y, w: 67, h: 80 }));
    extra.push(...t); return t;
  }

  // אות...: each word, then its letters
  async function readLetters() {
    busy();
    const spans = [...sentEl.querySelectorAll('span')];
    for (const s of spans) {
      const t = s.textContent.replace(/[.,?!]/g, '');
      s.className = 'cur';
      if (!(await play(t))) return;
      s.innerHTML = [...s.textContent].map(c => `<b>${c}</b>`).join('');
      for (const b of s.querySelectorAll('b')) {
        if (!/[a-z]/i.test(b.textContent)) continue;
        b.className = 'cur';
        if (!(await play(b.textContent))) return;
        b.className = '';
      }
      s.textContent = s.textContent; s.className = '';
    }
    restore();
  }
  // מילה...: word by word
  async function readWords() {
    busy();
    for (const s of sentEl.querySelectorAll('span')) {
      s.className = 'cur';
      if (!(await play(s.textContent.replace(/[.,?!]/g, '')))) return;
      s.className = '';
    }
    restore();
  }

  // משחק (word): drag the scrambled letters into the slots in order
  function wordGame() {
    busy(); hide(sentEl, trans); stage.style.background = '#c0c0c0';
    const letters = wd.w.split('');
    let order = shuffle(letters.map((_, i) => i));
    if (letters.length > 1) while (order.every((v, i) => letters[v] === letters[i])) order = shuffle(order);
    const n = letters.length, x0 = Math.round(320 - (n * 87 - 20) / 2);
    const slots = letters.map((_, i) => el('div', { cls: 'tile', x: x0 + i * 87, y: 267, w: 67, h: 80 }));
    const built = el('div', { cls: 'tile built hidden', x: x0, y: 267, h: 80 });
    extra.push(...slots, built);
    let pos = 0;
    order.forEach((src, k) => {
      const t = el('div', { cls: 'tile', x: x0 + k * 87, y: 173, w: 67, h: 80, text: letters[src] });
      extra.push(t);
      draggable(t, {
        targets: () => [{ el: slots[pos] }, { el: built }],
        drop: tg => {
          if (tg && t.textContent === letters[pos]) {
            t.remove(); hide(slots[pos]); pos++;
            built.textContent = wd.w.slice(0, pos); show(built);
            if (pos === n) seq(...letters, wd.w).then(ok => ok && restore());
            else play(letters[pos - 1]);
          } else tryAgain();
        },
      });
    });
    gameButtons('הסתר מילה', 'הצג מילה', word, () => helpScreen(UI + 'help_wordgame.png', [539, 417, 635, 458], {
      extra: l => el('div', { cls: 'he helpnote', x: 466, y: 291, w: 104, h: 80, text: 'גרור את האותיות לפי הסדר הנכון' }, l),
    }));
  }
  function gameButtons(hideTxt, showTxt, target, helpFn) {
    let hidden = false;
    const tog = vbtn(259, 434, 122, 45, hideTxt, () => { hidden = !hidden; tog.textContent = hidden ? showTxt : hideTxt; target.classList.toggle('hidden', hidden); }, { color: '#ff0000', fontSize: '20px', background: '#e8e8e8' });
    extra.push(tog, img('g_help', 531, 377, helpFn), img('g_exit', 531, 434, restore));
  }

  // משחק (sentence): drag the words (and the full stop) into the box in sentence order
  function sentenceGame() {
    busy(); hide(word, trans); stage.style.background = '#c0c0c0';
    const tokens = sentence(wd, sent).replace(/\.$/, ' .').split(' ');
    const pool = el('div', { cls: 'pool', x: 13, y: 244, w: 600 });
    const line = el('div', { cls: 'pool built-line', x: 13, y: 327, w: 600 });
    const box = el('div', { cls: 'dropbox' }, line);
    extra.push(pool, line);
    let pos = 0;
    shuffle(tokens.map((t, i) => i)).forEach(i => {
      const t = el('div', { cls: 'chip', text: tokens[i].split('').join(' ') }, pool);
      t.dataset.word = tokens[i];
      draggable(t, {
        targets: () => [{ el: box }],
        drop: tg => {
          if (tg && t.dataset.word === tokens[pos]) {
            t.style.visibility = 'hidden';
            const placed = el('div', { cls: 'chip', text: t.textContent });
            line.insertBefore(placed, box); placed.dataset.locked = '1';
            pos++;
            if (pos === tokens.length) { box.remove(); play('verygood').then(ok => ok && restore()); }
            else play(tokens[pos]);
          } else { tryAgain(); wait(900).then(ok => ok && play(tokens[pos])); }
        },
      });
    });
    play(tokens[0]);
    gameButtons('הסתר משפט', 'הצג משפט', sentEl, () => helpScreen(UI + 'help_sentgame.png', [539, 417, 635, 458], {
      extra: l => el('div', { cls: 'he helpnote', x: 466, y: 291, w: 104, h: 80, text: 'גרור את המילים לפי סדר הופעתן במשפט' }, l),
    }));
  }

  // microphone: record and compare with the model sound
  function mic(model) {
    busy(); hide(word, sentEl, trans);
    recorder({ model, onClose: restore, add: e => extra.push(e) });
  }

  function pratHelp() {
    const L = ['לחץ ויוצג משפט', 'הקרא אות אות', 'הקרא מילה מילה', 'שבץ מילים לפי הסדר', 'למד ותרגל הקלדת המשפט', 'הקלט והשמע את המשפט'];
    const LY = [78, 136, 196, 251, 307, 363];
    const R = ['כתוב את המילה', 'שבץ אותיות לפי הסדר', 'למד ותרגל הקלדת המילה', 'הקלט והשמע את המילה'];
    const RB = [[390, 74, 499], [348, 133, 495], [324, 185, 495], [334, 240, 495]];
    helpScreen(UI + 'help_prat_raw.png', [279, 430, 385, 478], {
      extra: l => {
        const LW = [106, 104, 116, 139, 175, 164];
        L.forEach((t, i) => el('div', { cls: 'he pnote', x: 130, y: LY[i], w: LW[i] + 10, text: t, style: { background: '#ffff00', color: '#000' } }, l));
        R.forEach((t, i) => el('div', { cls: 'he pnote', x: RB[i][0], y: RB[i][1], w: RB[i][2] - RB[i][0], text: t, style: { background: '#008000', color: '#ffff00' } }, l));
        [[3, 433, 242], [413, 433, 224]].forEach(([x, y, w]) => el('div', { cls: 'he pbar', x, y, w, h: 44, text: 'מסך הסבר' }, l));
      },
    });
  }
}

// ================================================================ shared: recorder bar (form "Wav")
let lastRecording = null;
function recorder({ model, onClose, add }) {
  const bar = img('rec_bar', 149, 382);
  const helpB = img('rec_help', 531, 396, micHelp);
  const parts = [bar, helpB];
  let rec = null;
  const recBtn = hot(167, 392, 222, 438, async () => {
    if (rec) { rec.stop(); return; }
    await play('record');
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
      setTimeout(() => rec && rec.state === 'recording' && rec.stop(), 4000);
    } catch (e) { console.warn('microphone unavailable', e); rec = null; }
  });
  const playMine = () => new Promise(r => {
    if (!lastRecording) return r();
    const a = new Audio(lastRecording); a.onended = r; a.onerror = r; a.play().catch(r);
  });
  parts.push(recBtn,
    hot(240, 392, 290, 437, async () => { if (await play(model)) await playMine(); }),   // model, then mine
    hot(311, 392, 351, 437, playMine),                                                   // mine
    hot(370, 392, 470, 433, () => { parts.forEach(p => p.remove()); onClose(); }));       // יציאה
  parts.forEach(p => add && add(p));
}

function micHelp() {
  const layer = el('div', { x: 0, y: 0, w: 640, h: 480, style: { zIndex: 30, background: '#ffffe0' } });
  el('div', { cls: 'he', x: 120, y: 20, w: 400, h: 34, text: 'אפשרויות להקליט ולהשמיע קול', style: { fontSize: '24px', textAlign: 'center', textDecoration: 'underline', color: '#0000c0' } }, layer);
  img('rec_bar', 149, 150, null, layer);
  const notes = [[194, 'הקלט קולך'], [265, 'השמע את קול המערכת'], [331, 'השמע את קולך המוקלט'], [420, 'חזור למסך הקודם']];
  notes.forEach(([cx, t], i) => {
    const y = [118, 92, 66, 118][i];
    const n = el('div', { cls: 'he pnote', x: cx, y, text: t, style: { background: '#fff', border: '1px solid #000', transform: 'translateX(-50%)' } }, layer);
    if (i === 3) n.style.transform = 'translateX(-30%)';
    el('div', { x: cx, y: y + 18, w: 1, h: 160 - y - 18, style: { background: '#000' } }, layer);
  });
  el('div', { cls: 'he', x: 100, y: 260, w: 440, h: 80, html: 'במקרה שההקלטה שלך לא נשמעת<br>ודא שהמיקרופון במצב "פעל"<br>ודא שאופציית "הקלטה" מופעלת בתוכנת כרטיס הקול', style: { fontSize: '16px', textAlign: 'center', background: '#fff', border: '1px solid #808080', lineHeight: '24px' } }, layer);
  img('drag_help_exit', 539, 417, () => layer.remove(), layer);
}

// ================================================================ 5. keyboard: a word (form "KeyBord")
function keyboardBase(wd, labelText, labelSize) {
  const pb = el('div', { cls: 'picbox', x: 241, y: 7, w: 159, h: 138 });
  const pic = el('img', { src: picSrc(wd) }, pb);
  const label = el('div', { cls: 'word', text: labelText, style: { top: '153px', left: '320px', transform: 'translateX(-50%)', fontSize: labelSize + 'px', fontWeight: 'normal', height: '44px', lineHeight: '44px', padding: '0 1px' } });
  const board = img('k_keyboard', 68, 257);
  const space = img('k_space', 163, 428);
  const greens = {};
  const keyBox = ch => {
    if (ch === ' ') return greens[' '] || (greens[' '] = el('div', { x: 163, y: 428, w: 323, h: 28, cls: 'hidden', style: { background: '#00ff00', pointerEvents: 'none', border: '1px solid #808080', boxSizing: 'border-box' } }));
    const k = KEYS[ch.toUpperCase()];
    if (!k) return null;
    return greens[ch.toUpperCase()] || (greens[ch.toUpperCase()] = el('div', { x: 68 + k[0], y: 257 + k[1], w: k[2] - k[0], h: k[3] - k[1], cls: 'hidden key-green', text: ch.toUpperCase() }));
  };
  const greenOff = () => Object.values(greens).forEach(g => hide(g));
  return { pic, label, board, space, keyBox, greenOff };
}

function showKeyboard(wd, back) {
  clear();
  const kb = keyboardBase(wd, wd.w, 40);
  const word = wd.w.toLowerCase().split('');
  const helpB = vbtn(3, 3, 110, 53, 'עזרה', toggleHelp, { color: '#800080', fontSize: '30px' });
  const modes = img('k_modes', 560, 8);
  const mh = [hot(568, 16, 626, 69, demo), hot(568, 85, 626, 138, () => practice('mouse')), hot(568, 155, 626, 208, () => practice('hand'))];
  const notes = [['למד את מיקום האותיות', 336, 35, 224], ['תרגל עם העכבר', 405, 104, 155], ['תרגל הקלדה', 437, 174, 123]]
    .map(([t, x, y, w]) => el('div', { cls: 'he pnote hidden', x, y, w, text: t, style: { background: '#ffff80', color: '#000', height: '23px', lineHeight: '23px', fontSize: '15px' } }));
  const ctl = [helpB, modes, ...mh];
  const exitB = img('k_exit', 538, 436, () => (session ? endPractice() : back()));
  let session = null, helpOn = false;
  function toggleHelp() { helpOn = !helpOn; helpB.textContent = helpOn ? 'הסתר' : 'עזרה'; notes.forEach(n => n.classList.toggle('hidden', !helpOn)); }

  async function demo() {
    hide(...ctl, ...notes, exitB);
    if (!(await play(wd.w))) return;
    for (const L of word) {
      kb.greenOff(); show(kb.keyBox(L));
      if (!(await play(L))) return;
      if (!(await wait(250))) return;
    }
    kb.greenOff();
    if (await play(wd.w)) { show(...ctl, exitB); if (helpOn) show(...notes); }
  }
  function practice(kind) {
    hide(...ctl, ...notes);
    const hint = kind === 'mouse' ? img('k_hint_mouse', 0, 0) : el('img', { src: A + 'helptyp0.png', x: 0, y: 0 });
    const box = kind === 'hand' ? el('div', { cls: 'typed', x: 282, y: 200, w: 76, h: 50 }) : null;
    session = { kind, pos: 0, hint, box, keyHots: [] };
    const mark = () => { kb.greenOff(); if (session.pos < word.length) show(kb.keyBox(word[session.pos])); };
    mark();
    const press = L => {
      if (!session || session.pos >= word.length) return;
      if (L === word[session.pos]) {
        session.pos++;
        if (box) { box.textContent = wd.w.slice(0, session.pos); box.style.width = Math.max(76, 24 * session.pos + 20) + 'px'; box.style.left = Math.round(320 - parseInt(box.style.width) / 2) + 'px'; }
        mark();
        play(L).then(async ok => {
          if (!ok || session.pos < word.length) return;
          if (!(await play('verygood'))) return;
          if (await wait(800)) endPractice();
        });
      } else tryAgain();
    };
    if (kind === 'mouse') {
      for (const L of 'qwertyuiopasdfghjklzxcvbnm') {
        const k = KEYS[L.toUpperCase()];
        session.keyHots.push(hot(68 + k[0], 257 + k[1], 68 + k[2], 257 + k[3], () => press(L)));
      }
    } else {
      document.onkeydown = e => { if (e.key.length === 1 && /[a-z]/i.test(e.key)) press(e.key.toLowerCase()); };
    }
  }
  function endPractice() {
    if (!session) return;
    stopAudio(); kb.greenOff();
    session.hint.remove(); session.box && session.box.remove(); session.keyHots.forEach(h => h.remove());
    document.onkeydown = null; session = null;
    show(...ctl, exitB); if (helpOn) show(...notes);
  }
}

// ================================================================ 6. keyboard: the sentence (קל / קשה)
function showSentKeyboard(wd, sn, back) {
  clear();
  const text = sentence(wd, sn);
  const kb = keyboardBase(wd, text, 40);
  const easyB = img('k_easy', 10, 10, easy), hardB = img('k_hard', 10, 82, hard);
  const exitB = img('k_exit_top', 538, 1, () => (mode ? endMode() : back()));
  let mode = null, parts = [];

  function easy() {
    mode = 'easy'; hide(easyB, hardB);
    const hint = el('img', { src: A + 'helptyp0.png', x: 0, y: 0 });
    const box = el('div', { cls: 'typed', x: 200, y: 200, w: 240, h: 50, style: { fontSize: '34px' } });
    const shiftHelp = el('img', { src: A + 'helptype.png', x: 0, y: 0, cls: 'hidden', style: { zIndex: 20 } });
    parts = [hint, box, shiftHelp];
    let pos = 0;
    const mark = () => { kb.greenOff(); if (pos < text.length) { const g = kb.keyBox(text[pos]); g && show(g); } };
    mark();
    document.onkeydown = e => {
      if (e.key.length !== 1 || pos >= text.length) return;
      e.preventDefault();
      const want = text[pos];
      if (e.key === want) {
        pos++; hide(shiftHelp); box.textContent = text.slice(0, pos);
        mark();
        if (/[a-z]/i.test(e.key)) play(e.key);
        if (pos === text.length) play('verygood').then(ok => ok && wait(800).then(o => o && endMode()));
      } else if (e.key.toLowerCase() === want.toLowerCase()) { show(shiftHelp); play('again'); }
      else tryAgain();
    };
  }

  function hard() {
    mode = 'hard'; hide(easyB, hardB, kb.label, kb.board, kb.space);
    const panel = el('img', { src: A + 'helptyp2.png', x: 0, y: 0 });
    const edit = el('div', { x: 0, y: 0, w: 640, h: 325, cls: 'hidden', style: { background: '#ffff80' } });
    el('img', { src: A + 'edit.png', x: 4, y: 18 }, edit);
    exitB.style.zIndex = 5;
    const input = el('input', { cls: 'hardline', x: 0, y: 330, w: 640, h: 54 });
    input.setAttribute('autocomplete', 'off'); input.setAttribute('spellcheck', 'false');
    const guide = el('div', { cls: 'hardline guide', x: 0, y: 388, w: 640, h: 54, text: text });
    const hideB = vbtn(0, 446, 157, 31, 'הסתר משפט', () => { guide.classList.toggle('hidden'); hideB.textContent = guide.classList.contains('hidden') ? 'הצג את המשפט' : 'הסתר משפט'; }, { fontSize: '16px', background: '#f0f0f0' });
    const check = () => {
      if (input.value.trim().replace(/\s+/g, ' ') === text) play('verygood').then(ok => ok && endMode());
      else { tryAgain(); input.focus(); }
    };
    const checkB = vbtn(241, 446, 157, 31, 'בדיקה', check, { fontSize: '16px', background: '#f0f0f0' });
    const editB = vbtn(483, 446, 157, 31, 'עזרה בעריכה', () => {
      const on = edit.classList.toggle('hidden'); panel.classList.toggle('hidden', !on); editB.textContent = on ? 'עזרה בעריכה' : 'הסתר';
    }, { fontSize: '16px', background: '#f0f0f0' });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
    hide(kb.pic.parentNode);
    parts = [panel, edit, input, guide, hideB, checkB, editB];
    setTimeout(() => input.focus(), 50);
  }

  function endMode() {
    stopAudio(); kb.greenOff(); document.onkeydown = null;
    parts.forEach(p => p.remove()); parts = []; mode = null;
    show(easyB, hardB, kb.label, kb.pic.parentNode, kb.board, kb.space);
  }
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
    Object.assign(ghost.style, { transform: 'none', position: 'absolute', width: nr.width / s + 'px', height: nr.height / s + 'px', left: (nr.left - sr.left) / s + 'px', top: (nr.top - sr.top) / s + 'px' });
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
      const hit = targets().find(t => { if (!t.el || t.el.classList.contains('hidden')) return false; const r = t.el.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; });
      drop(hit || null);
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  });
}

// ---------------------------------------------------------------- boot
showCover();
