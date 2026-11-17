/* La Guerre des relatifs — interface : campagne, tutoriels, exercices, Aide-moi, mémo. */
(function () {
  'use strict';
  const GR = window.GR;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const M = GR.MINUS;
  const MISS = GR.MISSIONS;
  const SERIE = 10;
  const PASS = 7;
  const GUIDED = 3; // questions guidées au début du niveau 1

  /* ================= PROGRESSION ================= */
  const KEY = 'gr-v2';
  const fresh = () => ({ best: {}, xp: 0, tuto: {}, all: false, sound: false, test: false });
  function load() {
    try { const x = JSON.parse(localStorage.getItem(KEY) || 'null'); if (x && typeof x === 'object') return Object.assign(fresh(), x); } catch (e) { /* indisponible */ }
    return fresh();
  }
  let P = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* indisponible */ } };
  const qs = new URLSearchParams(location.search);
  if (qs.get('reset') === '1') { P = fresh(); save(); }
  if (qs.get('prof') === '1') { P.all = true; save(); }
  if (qs.get('test') === '1') { P.test = true; save(); }
  if (qs.get('test') === '0') { P.test = false; save(); }
  if (qs.has('prof') || qs.has('reset') || qs.has('test')) history.replaceState(null, '', location.pathname);

  const sessionTuto = {};
  const tutoSeen = (mid) => (P.test ? sessionTuto[mid] : P.tuto[mid]);
  const markTuto = (mid) => { if (P.test) sessionTuto[mid] = true; else { P.tuto[mid] = true; save(); } };
  const best = (m, l) => P.best[m + '-' + l] || 0;
  const starsOf = (sc) => (sc >= 10 ? 3 : sc >= 8 ? 2 : sc >= PASS ? 1 : 0);
  const midx = (id) => MISS.findIndex((m) => m.id === id);
  function unlocked(mi, l) {
    if (P.all || P.test) return true;
    if (l === 1) return mi === 0 || best(MISS[mi - 1].id, 2) >= PASS;
    return unlocked(mi, 1) && best(MISS[mi].id, l - 1) >= PASS;
  }
  const snapshot = () => MISS.map((m, mi) => [1, 2, 3].map((l) => unlocked(mi, l)));
  function totalStars() { let t = 0; MISS.forEach((m) => { for (let l = 1; l <= 3; l++) t += starsOf(best(m.id, l)); }); return t; }
  const MAXSTARS = MISS.length * 9;
  const RANKS = [[0, 'Recrue', '🪖'], [3, 'Soldat', '🎖️'], [9, 'Caporal', '🎖️'], [16, 'Sergent', '🏅'], [24, 'Adjudant', '🏅'], [33, 'Lieutenant', '⭐'], [43, 'Capitaine', '⭐'], [55, 'Colonel', '🌟'], [66, 'Général', '👑']];
  function rank() { const t = totalStars(); let i = 0; RANKS.forEach((r, k) => { if (t >= r[0]) i = k; }); return { t, r: RANKS[i], next: RANKS[i + 1] }; }

  /* ================= SON ET EFFETS ================= */
  let actx = null;
  function tone(f, d, type, vol, delay) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + (delay || 0);
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.03);
    } catch (e) { /* audio indisponible */ }
  }
  GR.sfx = function (k) {
    if (!P.sound) return;
    if (k === 'ok') [523, 659, 784].forEach((f, i) => tone(f, 0.14, 'triangle', 0.12, i * 0.08));
    else if (k === 'ko') tone(150, 0.3, 'sawtooth', 0.06);
    else if (k === 'flip') tone(720, 0.07, 'square', 0.025);
    else if (k === 'boom') { tone(95, 0.35, 'sawtooth', 0.08); tone(55, 0.45, 'square', 0.05, 0.02); }
    else if (k === 'star') tone(988, 0.18, 'triangle', 0.1);
    else if (k === 'win') [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.12, i * 0.11));
  };
  const sndBtn = () => { $('snd').textContent = P.sound ? '🔊' : '🔇'; };
  $('snd').onclick = () => { P.sound = !P.sound; save(); sndBtn(); GR.sfx('ok'); };
  sndBtn();

  function confetti(n) {
    const box = $('confetti');
    const cols = ['#22c55e', '#f04444', '#fbbf24', '#8b5cf6', '#38bdf8'];
    for (let i = 0; i < (n || 40); i++) {
      const c = h('i');
      c.style.background = cols[i % cols.length];
      c.style.left = 35 + Math.random() * 30 + 'vw';
      box.appendChild(c);
      const dx = (Math.random() - 0.5) * 700, dy = -(220 + Math.random() * 380);
      c.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + Math.random() * 720 + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(' + dx * 1.2 + 'px,' + (dy + 560) + 'px) rotate(' + Math.random() * 1080 + 'deg)', opacity: 0 }],
      { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)' }).onfinish = () => c.remove();
    }
  }
  function xpFly(txt, anchor) {
    const r = (anchor || $('qcard')).getBoundingClientRect();
    const f = h('div', 'xpfly', txt);
    f.style.left = r.left + r.width / 2 - 40 + 'px'; f.style.top = r.top + 30 + 'px';
    document.body.appendChild(f);
    f.animate([{ transform: 'translateY(0)', opacity: 0 }, { transform: 'translateY(-20px)', opacity: 1, offset: 0.2 }, { transform: 'translateY(-70px)', opacity: 0 }], { duration: 1300, easing: 'ease-out' }).onfinish = () => f.remove();
  }
  let toastT = null;
  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = h('div', 'toast', msg); document.body.appendChild(t);
    clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2600);
  }

  /* ================= NAVIGATION ================= */
  let players = [];
  const keep = (p) => { players.push(p); return p; };
  const killPlayers = () => { players.forEach((p) => p && p.destroy && p.destroy()); players = []; };
  function show(id) {
    killPlayers();
    ['home', 'ex', 'end', 'help', 'memo'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === id || ((id === 'ex' || id === 'end') && b.dataset.go === 'home')));
    if (id === 'home') renderHome();
    if (id === 'memo') renderMemo();
    if (id === 'help') setTimeout(() => $('help-in').focus(), 50);
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) { closeAllModals(); show(g.dataset.go); } });

  const LOOK = {
    bataille: ['⚔️', '#f97316'], ordres: ['📣', '#8b5cf6'], fideles: ['🎭', '#ec4899'], longues: ['🛡️', '#22c55e'],
    deguise: ['🕵️', '#06b6d4'], manoeuvres: ['🗺️', '#eab308'], groupe: ['👥', '#a855f7'], contre: ['🔍', '#ef4444'],
  };
  function testBar() { $('testbar').classList.toggle('hidden', !P.test); }
  $('test-off').onclick = () => { P.test = false; save(); testBar(); show('home'); toast('Mode test désactivé.'); };
  testBar();

  /* ================= CAMPAGNE ================= */
  function renderHome() {
    const R = rank();
    const pct = R.next ? ((R.t - R.r[0]) / (R.next[0] - R.r[0])) * 100 : 100;
    $('rank').innerHTML = '<div class="rk-ico">' + R.r[2] + '</div><div><div class="rk-n">' + R.r[1] + '</div><div class="rk-s">⭐ ' + R.t + ' / ' + MAXSTARS + ' · ' + P.xp + ' XP</div><div class="bar"><i style="width:' + pct + '%"></i></div><div class="rk-next">' + (R.next ? 'Prochain grade : ' + R.next[1] + ' (' + R.next[0] + ' ⭐)' : 'Grade maximum !') + '</div></div>';
    const sc = $('hero-scene');
    if (!sc.dataset.ok) {
      sc.dataset.ok = '1';
      const line = document.createElement('div');
      line.className = 'pl-line';
      [['+', 5], ['+', 3], ['+', 7]].forEach(([s, v], i) => { const e = GR.soldier(s, v, true, true); e.style.animationDelay = i * 0.3 + 's'; line.appendChild(e); });
      const vs = document.createElement('div'); vs.className = 'vs'; vs.textContent = 'VS'; line.appendChild(vs);
      [['-', 4], ['-', 6], ['-', 2]].forEach(([s, v], i) => { const e = GR.soldier(s, v, true, true); e.style.animationDelay = 0.15 + i * 0.3 + 's'; line.appendChild(e); });
      sc.appendChild(line);
    }
    if (P.test) $('rank').innerHTML = '<div class="rk-ico">🧪</div><div><div class="rk-n">Mode test</div><div class="rk-next">Tout est débloqué, rien n’est enregistré.</div></div>';
    const road = $('road');
    road.innerHTML = '';
    MISS.forEach((m, mi) => {
      const open = unlocked(mi, 1);
      const done = best(m.id, 2) >= PASS;
      const state = !open ? 'locked' : done ? 'done' : 'current';
      const st = [1, 2, 3].reduce((a, l) => a + starsOf(best(m.id, l)), 0);
      const stop = h('div', 'stop ' + (mi % 2 ? 'right' : 'left') + ' ' + state);
      stop.appendChild(h('div', 'node', state === 'locked' ? '🔒' : state === 'done' ? '✓' : String(m.n)));
      const card = h('button', 'mcard');
      card.style.setProperty('--acc', LOOK[m.id][1]);
      card.innerHTML = '<div class="mc-top"><span class="mc-ico">' + LOOK[m.id][0] + '</span><span class="mc-n">Mission ' + m.n + '</span><span class="mc-st">★ ' + st + ' / 9</span></div><h3>' + m.titre + '</h3><p>' + m.desc + '</p><div class="mc-demo"></div>' +
        (state === 'locked' ? '<div class="mc-lock">🔒 Réussis le niveau 2 de la mission ' + (mi) + ' pour l\'ouvrir</div>' : '');
      GR.lineupOnly(card.querySelector('.mc-demo'), GR.DEMOS[m.id], 'sm');
      card.onclick = () => { if (open) openSheet(mi); else { toast('🔒 Mission verrouillée : réussis d\'abord le niveau 2 de la mission ' + mi + '.'); card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 }); } };
      stop.appendChild(card);
      road.appendChild(stop);
    });
  }

  /* ================= FICHE MISSION ================= */
  function closeAllModals() { ['modal', 'sheet', 'tuto'].forEach((id) => $(id).classList.add('hidden')); killModalPlayers(); }
  let modalPlayers = [];
  const killModalPlayers = () => { modalPlayers.forEach((p) => p && p.destroy()); modalPlayers = []; };
  function openSheet(mi) {
    const m = MISS[mi];
    const box = $('sheet-box');
    box.style.setProperty('--acc', LOOK[m.id][1]);
    box.innerHTML = '<div class="mhead"><div class="sh-t"><span class="mc-ico big">' + LOOK[m.id][0] + '</span><div><div class="kicker">Mission ' + m.n + '</div><h2>' + m.titre + '</h2></div></div><button class="icon-btn" id="sheet-x" aria-label="Fermer">✕</button></div><p class="lead">' + m.desc + '</p><div id="sheet-demo" style="margin-top:12px"></div><div class="actions"><button class="btn violet" id="sheet-tuto">📖 Tutoriel animé</button></div><div class="lvls" id="sheet-lvls"></div><p class="note">🔓 Il faut <b>7/10</b> pour réussir un niveau. Réussir le <b>niveau 2</b> débloque la mission suivante ; le niveau 3 est un défi bonus.</p>';
    $('sheet').classList.remove('hidden');
    killModalPlayers();
    modalPlayers.push(GR.Player($('sheet-demo'), GR.DEMOS[m.id], { mode: 'auto', showResult: true, onRestart: (p) => modalPlayers.push(p) }));
    $('sheet-x').onclick = closeAllModals;
    $('sheet-tuto').onclick = () => { closeAllModals(); openTuto(m.id, null); };
    const icons = ['🎓', '⚔️', '🏆'];
    const names = ['Niveau 1 · guidé et animé', 'Niveau 2 · sans aide', 'Niveau 3 · défi bonus'];
    [1, 2, 3].forEach((l) => {
      const ok = unlocked(mi, l);
      const bs = best(m.id, l);
      const b = h('button', 'lvbtn');
      b.disabled = !ok;
      b.innerHTML = '<div class="lv-ico">' + (ok ? icons[l - 1] : '🔒') + '</div><div><div class="lv-n">' + names[l - 1] + '</div><div class="lv-d">' + m.lv[l - 1] + '</div></div><div class="lv-r">' +
        (ok ? '<div class="st">' + '★'.repeat(starsOf(bs)) + '<span style="opacity:.25">' + '★'.repeat(3 - starsOf(bs)) + '</span></div><div class="lv-d">' + (bs ? 'record ' + bs + '/10' : 'à faire') + '</div>' : '<div class="lv-d">réussis le niveau ' + (l - 1) + '</div>') + '</div>';
      b.onclick = () => { closeAllModals(); startLevel(m.id, l); };
      $('sheet-lvls').appendChild(b);
    });
  }
  function startLevel(mid, l) {
    if (l === 1 && !tutoSeen(mid)) openTuto(mid, () => startSeries(mid, 1));
    else startSeries(mid, l);
  }

  /* ================= TUTORIEL ================= */
  let T = null;
  function openTuto(mid, onDone) {
    T = { mid, slides: GR.TUTOS[mid], i: 0, onDone };
    $('tuto').classList.remove('hidden');
    renderTuto();
  }
  function renderTuto() {
    const { slides, i } = T;
    const s = slides[i];
    const m = MISS[midx(T.mid)];
    $('tuto-kicker').textContent = 'Tutoriel · Mission ' + m.n + ' — ' + m.titre;
    $('tuto-dots').innerHTML = slides.map((_, k) => '<i class="' + (k === i ? 'on' : k < i ? 'past' : '') + '"></i>').join('');
    $('tuto-t').textContent = s.t;
    $('tuto-d').innerHTML = s.d;
    killModalPlayers();
    const demo = $('tuto-demo');
    demo.innerHTML = '';
    let expr = s.expr;
    if (expr === undefined) for (let k = i; k >= 0; k--) if (slides[k].expr !== undefined) { expr = slides[k].expr; break; }
    if (expr) modalPlayers.push(GR.Player(demo, expr, { mode: 'interactive', until: s.until || null, showResult: true, onRestart: (p) => modalPlayers.push(p) }));
    else demo.innerHTML = s.html || '';
    $('tuto-prev').disabled = i === 0;
    $('tuto-next').textContent = i === slides.length - 1 ? (T.onDone ? '⚔️ C\'est parti !' : '✓ J\'ai compris') : 'Suivant ▶';
  }
  $('tuto-next').onclick = () => {
    if (T.i < T.slides.length - 1) { T.i++; renderTuto(); return; }
    markTuto(T.mid);
    const cb = T.onDone;
    closeAllModals(); T = null;
    if (cb) cb();
  };
  $('tuto-prev').onclick = () => { if (T.i > 0) { T.i--; renderTuto(); } };
  $('tuto-x').onclick = () => { if (T) { markTuto(T.mid); } closeAllModals(); T = null; };

  /* ================= BATAILLE EN FENÊTRE ================= */
  function openBattle(expr, title) {
    closeAllModals();
    $('modal-title').textContent = title || GR.str(GR.parse(expr));
    $('modal').classList.remove('hidden');
    modalPlayers.push(GR.Player($('modal-body'), expr, { mode: 'interactive', showResult: true, onRestart: (p) => modalPlayers.push(p) }));
  }
  $('modal-x').onclick = closeAllModals;
  ['modal', 'sheet', 'tuto'].forEach((id) => $(id).addEventListener('click', (e) => { if (e.target.id === id) { if (id === 'tuto' && T) { markTuto(T.mid); T = null; } closeAllModals(); } }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (T) { markTuto(T.mid); T = null; } closeAllModals(); } });

  /* ================= PAVÉ ================= */
  function buildPad(el, keys, getTarget, onOk) {
    el.innerHTML = '';
    keys.forEach((k) => {
      const b = h('button', k === '⌫' ? 'k-del' : (k === '+' || k === M || k === '×') ? 'k-sign' : '', k);
      b.type = 'button';
      b.setAttribute('aria-label', k === '⌫' ? 'Effacer' : k);
      b.addEventListener('pointerdown', (e) => e.preventDefault());
      b.onclick = () => {
        const t = getTarget();
        if (!t || t.disabled) return;
        if (k === '⌫') t.value = t.value.slice(0, -1); else t.value += k;
        t.dispatchEvent(new Event('input'));
      };
      el.appendChild(b);
    });
    const ok = h('button', 'k-ok', 'Valider ✓');
    ok.type = 'button';
    ok.addEventListener('pointerdown', (e) => e.preventDefault());
    ok.onclick = onOk;
    el.appendChild(ok);
  }
  const KEYS = ['7', '8', '9', '⌫', '4', '5', '6', '(', '1', '2', '3', ')', '+', '0', ',', M];
  const KEYS_HELP = KEYS.concat(['×']);

  /* ================= EXERCICES ================= */
  const S = { mission: null, level: 1, i: 0, score: 0, q: null, step: 0, tries: 0, failed: false, gotRight: false, done: false, input: null, recent: [], res: [], streak: 0, xpGain: 0, before: null, player: null, guided: false };

  function startSeries(mid, l) {
    Object.assign(S, { mission: mid, level: l, i: 0, score: 0, recent: [], res: [], streak: 0, xpGain: 0, before: snapshot() });
    const m = MISS[midx(mid)];
    $('ex-title').textContent = LOOK[mid][0] + ' Mission ' + m.n + ' · ' + m.titre;
    $('qcard').style.setProperty('--acc', LOOK[mid][1]);
    $('ex-level').textContent = ['Niveau 1 · guidé et animé', 'Niveau 2 · sans aide', 'Niveau 3 · défi bonus'][l - 1];
    show('ex');
    nextQuestion();
  }
  $('ex-back').onclick = () => show('home');
  $('ex-tuto').onclick = () => openTuto(S.mission, null);

  function renderPips() {
    $('pips').innerHTML = Array.from({ length: SERIE }, (_, k) => '<i class="' + (S.res[k] || '') + (k === S.i - 1 && !S.res[k] ? ' cur' : '') + '"></i>').join('');
    const st = $('streak');
    st.textContent = S.streak >= 2 ? '🔥 ' + S.streak : '';
  }

  function nextQuestion() {
    if (S.i >= SERIE) { endSeries(); return; }
    let q;
    for (let k = 0; k < 25; k++) { q = GR.generate(S.mission, S.level); if (!S.recent.includes(q.display)) break; }
    S.recent.push(q.display);
    const guided = S.level === 1 && S.i < GUIDED && (q.kind === 'result' || q.kind === 'twostep') && q.node && !q.node.hasProd;
    Object.assign(S, { q, step: 0, tries: 0, failed: false, gotRight: false, done: false, input: null, guided });
    S.i++;
    renderQuestion();
  }

  const stageSource = (q) => (q.kind && q.kind.startsWith('deguise') ? GR.parse(q.full) : q.node || null);
  function setStage(mode, showResult, extra) {
    killPlayers();
    const stg = $('q-stage');
    const src = S.q.kind.startsWith('deguise') && mode === 'static' ? GR.parse(S.q.expr) : stageSource(S.q);
    if (!src) { stg.innerHTML = ''; stg.classList.add('hidden'); return null; }
    stg.classList.remove('hidden');
    S.player = keep(GR.Player(stg, src, Object.assign({ mode, showResult, hideFlat: !showResult, onRestart: (p) => { S.player = keep(p); } }, extra || {})));
    return S.player;
  }

  function renderQuestion() {
    const q = S.q;
    renderPips();
    $('q-label').innerHTML = (S.guided ? '<span class="tag">Question guidée</span>' : '') + q.label;
    const disp = q.display.replace('( … )', '<span class="hole">( … )</span>').replace(' … (', ' <span class="hole">…</span> (');
    $('q-expr').innerHTML = q.kind === 'vf' || q.kind.startsWith('deguise') ? disp : disp + ' <span class="eq">= ?</span>';
    ['q-fb', 'q-actions', 'q-hints', 'q-zone'].forEach((id) => { $(id).innerHTML = ''; });
    $('q-stage').innerHTML = '';
    killPlayers();
    if (S.guided) setStage('guided', false);
    else if (S.level === 1 && q.kind !== 'vf') setStage('static', false);
    else $('q-stage').classList.add('hidden');
    $('btn-sold').textContent = '👁 Soldats';
    advance();
  }

  function advance() { if (S.guided) guidedStep(); else renderStep(); }

  // Questions guidées : l'élève fait avancer la bataille en touchant les éléments, puis répond
  async function guidedStep() {
    const q = S.q, p = S.player;
    $('q-zone').innerHTML = '';
    const rem = p.remaining();
    if (q.kind === 'twostep' && S.step === 0 && !rem.includes('orders')) {
      tag('Étape 1 : regarde les soldats et écris la ligne sans parenthèses');
      addInputRow('=', true, 'ligne sans parenthèses');
      return;
    }
    if (rem.length) {
      const st = p.current();
      tag('👆 ' + st.label.replace(/^\S+\s/, '') + ' : touche les éléments en surbrillance');
      const row = h('div', 'choice');
      const skip = h('button', 'btn ghost sm', '👉 Montre-moi');
      skip.onclick = () => p.skip();
      row.appendChild(skip);
      $('q-zone').appendChild(row);
      const ok = await p.next();
      if (ok && S.player === p && !S.done) guidedStep();
      return;
    }
    tag(q.kind === 'twostep' ? 'Étape 2 : quel est le résultat ? (n\'oublie pas la couleur, donc le signe)' : 'À toi : quel est le résultat ?');
    addInputRow('=', false);
  }

  function addInputRow(label, wide, placeholder) {
    const row = h('div', 'answer-row');
    if (label) row.appendChild(h('label', null, label));
    const inp = h('input', 'ans' + (wide ? ' wide' : ''));
    inp.setAttribute('inputmode', 'none');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('aria-label', 'Réponse');
    if (placeholder) inp.placeholder = placeholder;
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); validate(); } });
    inp.addEventListener('input', () => inp.classList.remove('ko'));
    row.appendChild(inp);
    $('q-zone').appendChild(row);
    S.input = inp;
    setTimeout(() => inp.focus(), 30);
    return inp;
  }
  function addChoice(opts, cb) {
    const row = h('div', 'choice');
    opts.forEach((o) => {
      const b = h('button', 'btn big ' + (o.cls || ''), o.lbl);
      b.onclick = () => { row.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.disabled = false; b.style.outline = '3px solid var(--gold)'; b.onclick = null; cb(o.val); };
      row.appendChild(b);
    });
    $('q-zone').appendChild(row);
    S.input = null;
  }
  function tag(t) { $('q-zone').appendChild(h('div', 'step-tag', '<span>' + t + '</span>')); }
  function fb(type, html) {
    const box = h('div', 'fb ' + type);
    box.appendChild(GR.mascot());
    box.appendChild(h('div', null, html));
    $('q-fb').innerHTML = '';
    $('q-fb').appendChild(box);
  }
  function oops() { GR.sfx('ko'); const c = $('qcard'); c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

  function renderStep() {
    const q = S.q;
    switch (q.kind) {
      case 'result':
      case 'deguise':
        addInputRow(q.kind === 'deguise' ? 'Soldat caché :' : '=', false, q.kind === 'deguise' ? 'ex : ' + M + '8' : '');
        break;
      case 'twostep':
        if (S.step === 0) { tag('Étape 1 : exécute les ordres et écris sans parenthèses'); addInputRow('=', true, 'ligne sans parenthèses'); }
        else { tag('Étape 2 : la bataille'); addInputRow('=', false); }
        break;
      case 'switch':
        if (S.step === 0) { tag('Étape 1 : de quoi s\'agit-il ?'); addChoice([{ lbl: '⚔️ Une bataille (somme)', val: 'sum' }, { lbl: '✖️ Un produit', val: 'prod', cls: 'violet' }], chooseSwitch); }
        else { tag('Étape 2 : calcule'); addInputRow('=', false); }
        break;
      case 'vf':
        addChoice([{ lbl: '✔️ Vrai', val: true, cls: 'go' }, { lbl: '✖️ Faux', val: false, cls: 'violet' }], chooseVF);
        break;
      case 'deguise-ordre':
        addChoice([{ lbl: '+ fidèle', val: '+', cls: 'go' }, { lbl: M + ' traître', val: '-', cls: 'violet' }], chooseOrdre);
        break;
    }
  }

  function validate() {
    if (S.done) { nextQuestion(); return; }
    const q = S.q, inp = S.input;
    if (!inp || inp.disabled) return;
    if (!inp.value.trim()) { fb('info', 'Écris d\'abord ta réponse.'); return; }
    if (q.kind === 'twostep' && S.step === 0) { checkLine(inp); return; }
    numericCheck(inp, q.answer);
  }

  function checkLine(inp) {
    const q = S.q;
    const p = GR.tryParse(inp.value);
    if (p.error) { fb('info', p.error); return; }
    const r = GR.checkSimplified(q.node, inp.value);
    if (r.soft) { fb('info', r.msg); return; }
    if (r.ok) {
      inp.classList.remove('ko'); inp.classList.add('ok'); inp.disabled = true;
      fb('ok', '<b>Bien !</b> Les ordres sont exécutés. Place à la bataille.');
      GR.sfx('ok');
      S.step = 1; S.tries = 0; advance();
      return;
    }
    S.failed = true; S.tries++; oops();
    if (S.tries < 2) { inp.classList.add('ko'); fb('ko', '<b>Pas tout à fait.</b> ' + r.msg + ' Essaie encore !'); return; }
    inp.value = GR.flatStr(q.flat); inp.classList.add('ko'); inp.disabled = true;
    fb('ko', r.msg + '<div class="phr">La bonne ligne : <b>' + GR.flatStr(q.flat) + '</b></div>');
    S.step = 1; S.tries = 0; advance();
  }

  function productExplain(node) {
    const p = node.items[0];
    if (!p || p.kind !== 'prod') return '';
    const n = (p.s === '-' ? 1 : 0) + p.factors.filter((f) => GR.val({ kind: 'sum', items: [f] }) < 0).length;
    return 'Produit : ' + n + ' facteur' + (n > 1 ? 's' : '') + ' négatif' + (n > 1 ? 's' : '') + ' → ' + (n % 2 === 0 ? 'nombre pair → positif.' : 'nombre impair → négatif.');
  }
  function successText() {
    const q = S.q;
    if (q.kind === 'deguise') return q.expl;
    if (q.node && q.node.hasProd) return productExplain(q.node);
    if (q.flat) { const b = GR.battle(q.flat); return '<div class="phr">' + GR.phrase(b.G, b.R) + '</div>'; }
    return '';
  }

  function numericCheck(inp, expected) {
    const q = S.q;
    const v = GR.readNumber(inp.value);
    if (v === null) { fb('info', 'Écris un seul nombre, avec son signe s\'il est négatif (ex : ' + M + '7).'); return; }
    if (v === expected) {
      inp.classList.remove('ko'); inp.classList.add('ok'); inp.disabled = true;
      S.gotRight = true;
      fb('ok', '<b>' + (S.failed ? 'C\'est juste !' : pick(['Bravo !', 'Excellent !', 'Bien joué, soldat !', 'Parfait !'])) + '</b> ' + successText());
      finish();
      return;
    }
    S.failed = true; S.tries++; oops();
    let diag = null;
    if (q.kind === 'deguise') diag = 'Regarde l\'ordre devant la parenthèse : avec « + » le soldat garde sa veste, avec « ' + M + ' » il va la retourner.';
    else if (q.node) diag = GR.diagnose(q.node, v);
    if (S.tries < 2) { inp.classList.add('ko'); fb('ko', '<b>Pas tout à fait.</b> ' + (diag || '') + ' Essaie encore !'); inp.select(); return; }
    inp.classList.add('ko'); inp.disabled = true;
    fb('ko', '<b>La bonne réponse était ' + GR.fmt(expected, q.kind === 'deguise') + '.</b> ' + (q.kind === 'deguise' ? q.expl : (diag || '') + ' ' + successText()));
    finish();
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function chooseSwitch(val) {
    const q = S.q;
    const good = q.isProd ? 'prod' : 'sum';
    if (val === good) fb('ok', q.isProd ? 'Exact : il y a un ×, c\'est un produit → règle des signes.' : 'Exact : pas de ×, c\'est une somme → bataille !');
    else { S.failed = true; oops(); fb('ko', q.isProd ? 'Regarde bien : il y a un signe ×. C\'est un produit → règle des signes.' : 'Regarde bien : il n\'y a pas de ×. C\'est une somme → bataille ! Deux « ' + M + ' » à la suite ne font pas « + » ici.'); }
    S.step = 1; renderStep();
  }
  function chooseVF(val) {
    const q = S.q;
    if (val === q.answer) { S.gotRight = true; fb('ok', '<b>Bien vu !</b> ' + q.expl); }
    else { S.failed = true; oops(); fb('ko', '<b>Raté.</b> ' + q.expl); }
    finish();
  }
  function chooseOrdre(val) {
    const q = S.q;
    if (val === q.answer) { S.gotRight = true; fb('ok', '<b>Bravo !</b> ' + q.expl); }
    else { S.failed = true; oops(); fb('ko', '<b>Non.</b> ' + q.expl); }
    finish();
  }

  function finish() {
    S.done = true;
    const q = S.q;
    const ok = !S.failed;
    S.res[S.i - 1] = ok ? 'ok' : S.gotRight ? 'mid' : 'ko';
    if (ok) { S.score++; S.streak++; } else S.streak = 0;
    const gain = ok ? 10 + Math.min(S.streak - 1, 5) * 2 : S.gotRight ? 4 : 0;
    if (gain) { if (!P.test) P.xp += gain; S.xpGain += gain; save(); xpFly('+' + gain + ' XP'); }
    if (ok) { GR.sfx('ok'); confetti(26); if (S.streak >= 2) { const st = $('streak'); st.classList.remove('bump'); void st.offsetWidth; st.classList.add('bump'); } }
    renderPips();

    const act = $('q-actions');
    act.innerHTML = '';
    const src = stageSource(q);
    const animable = src && (!src.hasProd || (src.items.length === 1 && src.items[0].kind === 'prod'));
    if (S.guided) {
      const b = h('button', 'btn ghost', '↺ Rejouer la bataille');
      b.onclick = () => { setStage('interactive', true); b.remove(); };
      act.appendChild(b);
    } else if (animable && S.level === 1) {
      setStage('interactive', true);
      $('q-stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (animable) {
      const b = h('button', 'btn violet', '▶ Jouer la bataille');
      b.onclick = () => { setStage('interactive', true); b.remove(); };
      act.appendChild(b);
    }
    const n = h('button', 'btn go', S.i >= SERIE ? 'Voir mon score 🏁' : 'Question suivante ▶');
    n.onclick = nextQuestion;
    act.appendChild(n);
  }

  function endSeries() {
    const sc = S.score;
    const k = S.mission + '-' + S.level;
    if (!P.test && sc > (P.best[k] || 0)) P.best[k] = sc;
    save();
    const mi = midx(S.mission);
    const m = MISS[mi];
    const st = starsOf(sc);
    show('end');
    $('end-stars').innerHTML = [0, 1, 2].map(() => '<span class="es">★</span>').join('');
    const es = $('end-stars').children;
    for (let i = 0; i < st; i++) setTimeout(() => { es[i].classList.add('on'); GR.sfx('star'); }, 400 + i * 380);
    $('end-title').textContent = sc >= PASS ? (sc === SERIE ? 'Sans faute, bravo !' : 'Niveau réussi !') : 'Pas encore…';
    $('end-score').textContent = sc + ' / ' + SERIE;
    $('end-xp').textContent = '+' + S.xpGain + ' XP · Mission ' + m.n + ', niveau ' + S.level;
    const now = snapshot();
    const news = [];
    now.forEach((lv, i) => lv.forEach((u, l) => { if (u && !S.before[i][l]) news.push(l === 0 ? '🔓 Nouvelle mission : ' + MISS[i].titre : '🔓 Niveau ' + (l + 1) + ' débloqué'); }));
    $('end-unlock').innerHTML = news.map((t, i) => '<span class="unlock" style="animation-delay:' + (0.6 + i * 0.25) + 's">' + t + '</span>').join('');
    $('end-msg').textContent = sc >= PASS
      ? (S.level === 1 ? 'Tu peux passer au niveau 2, sans les animations.' : S.level === 2 ? 'Le niveau 3 (défi bonus) et la mission suivante t\'attendent.' : 'Défi relevé ! Continue la campagne.')
      : 'Il faut 7/10 pour réussir le niveau. Revois le tutoriel si besoin, puis retente ta chance !';
    if (sc >= PASS) setTimeout(() => { GR.sfx('win'); confetti(90); }, 300);
    $('end-again').onclick = () => startSeries(S.mission, S.level);
    const nb = $('end-next');
    nb.classList.remove('hidden');
    if (sc < PASS) { nb.textContent = '📖 Revoir le tutoriel'; nb.onclick = () => openTuto(S.mission, () => startSeries(S.mission, S.level)); }
    else if (S.level < 3 && unlocked(mi, S.level + 1)) { nb.textContent = 'Niveau ' + (S.level + 1) + ' ▶'; nb.onclick = () => startSeries(S.mission, S.level + 1); }
    else if (mi < MISS.length - 1 && unlocked(mi + 1, 1)) { nb.textContent = 'Mission suivante ▶'; nb.onclick = () => startLevel(MISS[mi + 1].id, 1); }
    else nb.classList.add('hidden');
  }

  /* --- indice / soldats --- */
  $('btn-sold').onclick = () => {
    const stg = $('q-stage');
    if (S.guided || (S.done && S.level === 1)) return;
    if (!stg.classList.contains('hidden') && stg.innerHTML) { killPlayers(); stg.innerHTML = ''; stg.classList.add('hidden'); $('btn-sold').textContent = '👁 Soldats'; return; }
    if (S.q.kind === 'vf') { toast('Pas de soldats pour un vrai/faux : réfléchis !'); return; }
    if (setStage('static', false)) $('btn-sold').textContent = '🙈 Cacher';
  };
  $('btn-hint').onclick = () => {
    const q = S.q;
    const box = $('q-hints');
    if (box.innerHTML) { box.innerHTML = ''; return; }
    let list;
    if (q.kind && q.kind.startsWith('deguise')) {
      list = [
        { t: 'Une armée, plusieurs écritures', d: 'Les deux écritures doivent donner exactement les mêmes soldats sur le terrain.' },
        { t: 'Ordre +', d: 'Le soldat est fidèle : il garde sa veste. Il doit donc déjà porter la bonne couleur.' },
        { t: 'Ordre ' + M, d: 'Le soldat est un traître : il va retourner sa veste. Il doit donc porter la couleur opposée.' },
      ];
    } else if (q.node) list = GR.hints(q.node);
    else return;
    box.innerHTML = list.map((x) => '<div class="hint' + (x.warn ? ' warn' : '') + (x.order === '-' ? ' o-minus' : '') + '"><h4>' + x.t + '</h4><p>' + x.d + '</p></div>').join('');
  };

  buildPad($('pad'), KEYS, () => S.input, validate);

  /* ================= AIDE-MOI ================= */
  let helpFocus = null;
  $('help').addEventListener('focusin', (e) => { if (e.target.tagName === 'INPUT') helpFocus = e.target; });
  buildPad($('pad-help'), KEYS_HELP, () => helpFocus || $('help-in'), () => { const t = helpFocus || $('help-in'); if (t && t._onOk) t._onOk(); else analyse(); });
  $('help-go').onclick = analyse;
  $('help-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); analyse(); } });
  $('help-in')._onOk = analyse;

  function analyse() {
    killPlayers();
    const out = $('help-out');
    out.innerHTML = '';
    $('help-err').textContent = '';
    const r = GR.tryParse($('help-in').value);
    if (r.error) { $('help-err').textContent = r.error + ' Exemple d\'écriture : ' + M + '6 ' + M + ' (' + M + '7)'; return; }
    const node = r.node;
    const visu = h('div');
    visu.style.marginTop = '14px';
    out.appendChild(visu);
    keep(GR.Player(visu, node, { mode: 'interactive', showResult: false, hideFlat: true, onRestart: (p) => keep(p) }));
    out.appendChild(h('h3', null, '📋 La méthode'));
    out.lastChild.style.marginTop = '18px';
    const hints = h('div', 'hints');
    hints.innerHTML = GR.hints(node).map((x) => '<div class="hint' + (x.warn ? ' warn' : '') + (x.order === '-' ? ' o-minus' : '') + '"><h4>' + x.t + '</h4><p>' + x.d + '</p></div>').join('');
    out.appendChild(hints);
    out.appendChild(h('h3', null, '✅ Je vérifie mon travail'));
    out.lastChild.style.marginTop = '18px';
    const fbBox = h('div');
    const say = (type, html) => { fbBox.innerHTML = ''; const b = h('div', 'fb ' + type); b.appendChild(GR.mascot()); b.appendChild(h('div', null, html)); fbBox.appendChild(b); };
    function row(label, onCheck, wide) {
      const rw = h('div', 'answer-row');
      rw.style.justifyContent = 'flex-start';
      const lb = h('span', 'q-label', label);
      const inp = h('input', 'ans' + (wide ? ' wide' : ''));
      inp.setAttribute('inputmode', 'none'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-label', label);
      const b = h('button', 'btn sm', 'Vérifier');
      const run = () => onCheck(inp);
      b.onclick = run; inp._onOk = run;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      rw.append(lb, inp, b);
      out.appendChild(rw);
    }
    if (node.hasGroup && !node.hasProd) {
      row('Ma ligne sans parenthèses :', (inp) => {
        if (!inp.value.trim()) return say('info', 'Écris ta ligne sans parenthèses.');
        const p = GR.tryParse(inp.value);
        if (p.error) return say('info', p.error);
        const c = GR.checkSimplified(node, inp.value);
        if (c.ok) say('ok', '<b>Oui, ta ligne est juste.</b> Il ne reste plus que la bataille.');
        else say(c.soft ? 'info' : 'ko', c.msg);
      }, true);
    }
    row('Mon résultat :', (inp) => {
      if (!inp.value.trim()) return say('info', 'Écris ton résultat.');
      const v = GR.readNumber(inp.value);
      if (v === null) return say('info', 'Écris un seul nombre, avec son signe s\'il est négatif.');
      if (v === GR.val(node)) { say('ok', '<b>Bravo, c\'est juste !</b>'); GR.sfx('ok'); confetti(20); }
      else say('ko', '<b>Ce n\'est pas encore ça.</b> ' + (GR.diagnose(node, v) || 'Reprends les étapes une par une.'));
    });
    out.appendChild(fbBox);
  }

  /* ================= MÉMO ================= */
  let memoReady = false;
  function renderMemo() {
    if (memoReady) return;
    memoReady = true;
    GR.lineupOnly($('memo-sold'), '5-3+12-7', '');
    document.querySelectorAll('[data-ex]').forEach((box) => {
      box.dataset.ex.split('|').forEach((e) => {
        const b = h('button', 'ex-chip', '▶ ' + GR.str(GR.parse(e)));
        b.onclick = () => openBattle(e);
        box.appendChild(b);
      });
    });
  }

  show('home');
})();
