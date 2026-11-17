/* La Guerre des relatifs — interface : missions, exercices, Aide-moi, mémo. */
(function () {
  'use strict';
  const GR = window.GR;
  const $ = (id) => document.getElementById(id);
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const SERIE = 10;
  const M = GR.MINUS;

  /* ---------- étoiles (mémoire du navigateur, facultative) ---------- */
  const store = {
    get() { try { return JSON.parse(localStorage.getItem('gr-stars') || '{}') || {}; } catch (e) { return {}; } },
    set(k, v) { try { const s = store.get(); if (!s[k] || s[k] < v) { s[k] = v; localStorage.setItem('gr-stars', JSON.stringify(s)); } } catch (e) { /* stockage indisponible */ } },
  };
  const starsHtml = (n) => '<span class="stars" aria-label="' + n + ' étoile(s) sur 3">' + [1, 2, 3].map((i) => '<span class="' + (i <= n ? 'on' : '') + '">★</span>').join('') + '</span>';

  /* ---------- navigation ---------- */
  function show(id) {
    ['home', 'ex', 'end', 'help', 'memo'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.go === id || ((id === 'ex' || id === 'end') && b.dataset.go === 'home')));
    if (id === 'home') renderHome();
    if (id === 'help') setTimeout(() => $('help-in').focus(), 50);
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) show(g.dataset.go); });

  function renderHome() {
    const s = store.get();
    const grid = $('missions');
    grid.innerHTML = '';
    GR.MISSIONS.forEach((m) => {
      const c = h('div', 'card mission');
      c.innerHTML = '<div class="head"><div class="num">' + m.n + '</div><h3>' + m.titre + '</h3></div><div class="ex">' + m.ex + '</div><p>' + m.desc + '</p>';
      const lv = h('div', 'levels');
      m.lv.forEach((t, i) => {
        const b = h('button', 'lvl');
        b.innerHTML = '<span><b>Niveau ' + (i + 1) + '</b>' + t + '</span>' + starsHtml(s[m.id + '-' + (i + 1)] || 0);
        b.onclick = () => startSeries(m.id, i + 1);
        lv.appendChild(b);
      });
      c.appendChild(lv);
      grid.appendChild(c);
    });
  }

  /* ---------- pavé numérique ---------- */
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
    const ok = h('button', 'k-ok', 'Valider');
    ok.type = 'button';
    ok.addEventListener('pointerdown', (e) => e.preventDefault());
    ok.onclick = onOk;
    el.appendChild(ok);
  }
  const KEYS = ['7', '8', '9', '⌫', '4', '5', '6', '(', '1', '2', '3', ')', '+', '0', ',', M];
  const KEYS_HELP = ['7', '8', '9', '⌫', '4', '5', '6', '(', '1', '2', '3', ')', '+', '0', ',', M, '×'];

  /* ---------- fenêtre « Rejouer la bataille » ---------- */
  let modalCtl = null;
  function openBattle(expr) {
    $('modal').classList.remove('hidden');
    try { modalCtl = GR.mountBattle($('modal-body'), expr, { showResult: true }); }
    catch (e) { $('modal-body').textContent = 'Impossible d\'afficher cette bataille.'; }
  }
  function closeBattle() { if (modalCtl && modalCtl.destroy) modalCtl.destroy(); modalCtl = null; $('modal').classList.add('hidden'); }
  $('modal-x').onclick = closeBattle;
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeBattle(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('modal').classList.contains('hidden')) closeBattle(); });

  /* ================= EXERCICES ================= */
  const S = { mission: null, level: 1, i: 0, score: 0, q: null, step: 0, tries: 0, failed: false, done: false, input: null, recent: [] };

  function startSeries(m, l) {
    Object.assign(S, { mission: m, level: l, i: 0, score: 0, recent: [] });
    const mi = GR.MISSIONS.find((x) => x.id === m);
    $('ex-title').textContent = mi.n + '. ' + mi.titre;
    $('ex-level').textContent = 'Niveau ' + l;
    show('ex');
    nextQuestion();
  }

  function nextQuestion() {
    if (S.i >= SERIE) { endSeries(); return; }
    let q;
    for (let k = 0; k < 25; k++) { q = GR.generate(S.mission, S.level); if (!S.recent.includes(q.display)) break; }
    S.recent.push(q.display);
    Object.assign(S, { q, step: 0, tries: 0, failed: false, done: false, input: null });
    S.i++;
    renderQuestion();
  }

  const battleable = (q) => q.node && !q.node.hasProd;

  function renderQuestion() {
    const q = S.q;
    $('ex-count').textContent = S.i + ' / ' + SERIE;
    $('ex-prog').style.width = ((S.i - 1) / SERIE) * 100 + '%';
    $('q-label').textContent = q.label;
    const disp = q.display.replace('( … )', '<span style="color:var(--ordre)">( … )</span>').replace(' … (', ' <span style="color:var(--ordre)">…</span> (');
    $('q-expr').innerHTML = (q.kind === 'vf' || q.kind.startsWith('deguise')) ? disp : disp + ' <span class="eq">= ?</span>';
    ['q-visu', 'q-fb', 'q-actions', 'q-hints', 'q-zone'].forEach((id) => { $(id).innerHTML = ''; });
    $('btn-sold').textContent = 'Voir les soldats';
    if (q.showSquares || (S.level === 1 && q.node && q.node.hasGroup && !q.node.hasProd)) {
      toggleSoldiers(true);
    }
    renderStep();
  }

  function addInputRow(label, wide, placeholder) {
    const row = h('div', 'answer-row');
    if (label) row.appendChild(h('label', null, label));
    const inp = h('input', 'ans' + (wide ? ' wide' : ''));
    inp.setAttribute('inputmode', 'none');
    inp.setAttribute('autocomplete', 'off');
    inp.setAttribute('aria-label', label ? label.replace(/<[^>]+>/g, '') : 'Réponse');
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
      const b = h('button', 'btn big', o.lbl);
      b.onclick = () => { row.querySelectorAll('button').forEach((x) => { x.disabled = true; }); b.style.outline = '3px solid var(--ordre)'; cb(o.val); };
      row.appendChild(b);
    });
    $('q-zone').appendChild(row);
    S.input = null;
  }
  function fb(type, html) { $('q-fb').innerHTML = '<div class="fb ' + type + '">' + html + '</div>'; }
  function tag(t) { const d = h('div', null, '<span class="step-tag">' + t + '</span>'); d.style.textAlign = 'center'; d.style.marginTop = '10px'; $('q-zone').appendChild(d); }

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
        if (S.step === 0) {
          tag('Étape 1 : de quoi s\'agit-il ?');
          addChoice([{ lbl: 'Une bataille (somme)', val: 'sum' }, { lbl: 'Un produit (règle des signes)', val: 'prod' }], chooseSwitch);
        } else { tag('Étape 2 : calcule'); addInputRow('=', false); }
        break;
      case 'vf':
        addChoice([{ lbl: 'Vrai', val: true }, { lbl: 'Faux', val: false }], chooseVF);
        break;
      case 'deguise-ordre':
        addChoice([{ lbl: '+ (fidèle)', val: '+' }, { lbl: M + ' (traître)', val: '-' }], chooseOrdre);
        break;
    }
  }

  function validate() {
    if (S.done) { nextQuestion(); return; }
    const q = S.q;
    const inp = S.input;
    if (!inp) return;
    if (!inp.value.trim()) { fb('info', 'Écris d\'abord ta réponse.'); return; }
    if (q.kind === 'twostep' && S.step === 0) return checkLine(inp);
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
      S.step = 1; S.tries = 0; renderStep();
      return;
    }
    S.failed = true; S.tries++;
    if (S.tries < 2) { inp.classList.add('ko'); fb('ko', '<b>Pas tout à fait.</b> ' + r.msg + ' Essaie encore !'); return; }
    inp.value = GR.flatStr(q.flat); inp.classList.add('ko'); inp.disabled = true;
    fb('ko', r.msg + '<div class="phr">La bonne ligne : <b>' + GR.flatStr(q.flat) + '</b></div>');
    S.step = 1; S.tries = 0; renderStep();
  }

  function productExplain(node) {
    const p = node.items[0];
    if (!p || p.kind !== 'prod') return '';
    const nMinus = (p.s === '-' ? 1 : 0) + p.factors.filter((f) => GR.val({ kind: 'sum', items: [f] }) < 0).length;
    return 'Produit : ' + nMinus + ' signe' + (nMinus > 1 ? 's' : '') + ' « ' + M + ' » → ' + (nMinus % 2 === 0 ? 'nombre pair → résultat positif.' : 'nombre impair → résultat négatif.');
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
      fb('ok', '<b>' + (S.failed ? 'C\'est juste !' : 'Bravo !') + '</b> ' + successText());
      finish();
      return;
    }
    S.failed = true; S.tries++;
    let diag = null;
    if (q.kind === 'deguise') diag = 'Vérifie l\'ordre devant la parenthèse : avec « + » le soldat garde sa veste, avec « ' + M + ' » il va la retourner.';
    else if (q.node) diag = GR.diagnose(q.node, v);
    if (S.tries < 2) { inp.classList.add('ko'); fb('ko', '<b>Pas tout à fait.</b> ' + (diag || '') + ' Essaie encore !'); inp.select(); return; }
    inp.classList.add('ko'); inp.disabled = true;
    fb('ko', '<b>La bonne réponse était ' + GR.fmt(expected, q.kind === 'deguise') + '.</b> ' + (q.kind === 'deguise' ? q.expl : (diag || '') + ' ' + successText()));
    finish();
  }

  function chooseSwitch(val) {
    const q = S.q;
    const good = q.isProd ? 'prod' : 'sum';
    if (val === good) fb('ok', q.isProd ? 'Exact : il y a un ×, c\'est un produit → règle des signes.' : 'Exact : pas de ×, c\'est une somme → bataille !');
    else { S.failed = true; fb('ko', q.isProd ? 'Regarde bien : il y a un signe ×. C\'est un produit → règle des signes.' : 'Regarde bien : il n\'y a pas de ×. C\'est une somme → bataille ! Deux « ' + M + ' » à la suite ne font pas « + » ici.'); }
    S.step = 1; renderStep();
  }
  function chooseVF(val) {
    const q = S.q;
    if (val === q.answer) fb('ok', '<b>Bien vu !</b> ' + q.expl);
    else { S.failed = true; fb('ko', '<b>Raté.</b> ' + q.expl); }
    finish();
  }
  function chooseOrdre(val) {
    const q = S.q;
    if (val === q.answer) fb('ok', '<b>Bravo !</b> ' + q.expl);
    else { S.failed = true; fb('ko', '<b>Non.</b> ' + q.expl); }
    finish();
  }

  function finish() {
    S.done = true;
    if (!S.failed) S.score++;
    $('ex-prog').style.width = (S.i / SERIE) * 100 + '%';
    const act = $('q-actions');
    act.innerHTML = '';
    const q = S.q;
    const expr = q.node ? q.node : (q.kind.startsWith('deguise') ? q.expr : null);
    if (expr && (typeof expr === 'string' || !expr.hasProd)) {
      const b = h('button', 'btn', '▶ Rejouer la bataille');
      b.onclick = () => openBattle(expr);
      act.appendChild(b);
    }
    const n = h('button', 'btn main', S.i >= SERIE ? 'Voir mon score' : 'Question suivante ▶');
    n.onclick = nextQuestion;
    act.appendChild(n);
    setTimeout(() => n.focus(), 30);
  }

  function endSeries() {
    const sc = S.score;
    const st = sc === SERIE ? 3 : sc >= 8 ? 2 : sc >= 5 ? 1 : 0;
    store.set(S.mission + '-' + S.level, st);
    $('end-stars').innerHTML = starsHtml(st);
    $('end-score').textContent = sc + ' / ' + SERIE;
    $('end-msg').textContent = st === 3 ? 'Parfait ! Tu peux passer au niveau suivant.' : st === 2 ? 'Très bien ! Encore un effort pour le sans-faute.' : st === 1 ? 'C\'est un bon début. Recommence, et utilise « Rejouer la bataille » sur tes erreurs.' : 'Recommence tranquillement : relis le mémo, et utilise les indices.';
    const idx = GR.MISSIONS.findIndex((m) => m.id === S.mission);
    const nb = $('end-next');
    if (S.level < 3) { nb.textContent = 'Niveau suivant ▶'; nb.onclick = () => startSeries(S.mission, S.level + 1); nb.classList.remove('hidden'); }
    else if (idx < GR.MISSIONS.length - 1) { nb.textContent = 'Mission suivante ▶'; nb.onclick = () => startSeries(GR.MISSIONS[idx + 1].id, 1); nb.classList.remove('hidden'); }
    else nb.classList.add('hidden');
    $('end-again').onclick = () => startSeries(S.mission, S.level);
    show('end');
  }

  /* --- indices et soldats pendant l'exercice --- */
  function toggleSoldiers(force) {
    const q = S.q;
    const v = $('q-visu');
    if (!force && v.dataset.on === '1') { v.innerHTML = ''; v.dataset.on = ''; $('btn-sold').textContent = 'Voir les soldats'; return; }
    v.innerHTML = '';
    const src = q.node || (q.expr ? GR.parse(q.expr) : null);
    if (!src) return;
    if (q.kind === 'vf') return;
    GR.mountBattle(v, src, { staticOnly: true });
    v.dataset.on = '1';
    $('btn-sold').textContent = 'Cacher les soldats';
  }
  $('btn-sold').onclick = () => toggleSoldiers(false);

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
  buildPad($('pad-help'), KEYS_HELP, () => helpFocus || $('help-in'), () => {
    const t = helpFocus || $('help-in');
    if (t && t._onOk) t._onOk(); else analyse();
  });
  $('help-go').onclick = analyse;
  $('help-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); analyse(); } });
  $('help-in')._onOk = analyse;

  function analyse() {
    const raw = $('help-in').value;
    const out = $('help-out');
    out.innerHTML = '';
    $('help-err').textContent = '';
    const r = GR.tryParse(raw);
    if (r.error) { $('help-err').textContent = r.error + ' Exemple d\'écriture : ' + M + '6 ' + M + ' (' + M + '7)'; return; }
    const node = r.node;
    const visu = h('div', 'q-visu');
    out.appendChild(visu);
    GR.mountBattle(visu, node, { staticOnly: true });
    const hints = h('div', 'hints');
    hints.innerHTML = GR.hints(node).map((x) => '<div class="hint' + (x.warn ? ' warn' : '') + (x.order === '-' ? ' o-minus' : '') + '"><h4>' + x.t + '</h4><p>' + x.d + '</p></div>').join('');
    out.appendChild(h('h2', null, 'La méthode'));
    out.appendChild(hints);

    out.appendChild(h('h2', null, 'Je vérifie mon travail'));
    const fbBox = h('div');
    function row(label, onCheck, wide) {
      const rw = h('div', 'answer-row');
      rw.style.justifyContent = 'flex-start';
      rw.appendChild(h('label', null, label));
      const inp = h('input', 'ans' + (wide ? ' wide' : ''));
      inp.setAttribute('inputmode', 'none'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-label', label);
      const b = h('button', 'btn', 'Vérifier');
      const run = () => onCheck(inp);
      b.onclick = run; inp._onOk = run;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); run(); } });
      rw.append(inp, b);
      out.appendChild(rw);
      return inp;
    }
    const say = (type, html) => { fbBox.innerHTML = '<div class="fb ' + type + '">' + html + '</div>'; };
    if (node.hasGroup && !node.hasProd) {
      row('Ma ligne sans parenthèses :', (inp) => {
        const p = GR.tryParse(inp.value);
        if (!inp.value.trim()) return say('info', 'Écris ta ligne sans parenthèses.');
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
      if (v === GR.val(node)) say('ok', '<b>Bravo, c\'est juste !</b>');
      else say('ko', '<b>Ce n\'est pas encore ça.</b> ' + (GR.diagnose(node, v) || 'Reprends les étapes une par une.'));
    });
    out.appendChild(fbBox);
  }

  /* ================= MÉMO ================= */
  (function memo() {
    const ms = $('memo-sold');
    [['+', 5, true], ['-', 3, true], ['+', 12, true], ['-', 7, true]].forEach(([s, v, e]) => ms.appendChild(GR.soldier(s, v, e)));
    document.querySelectorAll('[data-ex]').forEach((box) => {
      box.dataset.ex.split('|').forEach((e) => {
        const b = h('button', 'ex-chip', GR.str(GR.parse(e)));
        b.onclick = () => openBattle(e);
        box.appendChild(b);
      });
    });
  })();

  show('home');
})();
