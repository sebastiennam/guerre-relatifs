/* La Guerre des relatifs — soldats et « lecteur de bataille ».
   Modes du lecteur :
   - static      : les soldats seulement ;
   - auto        : toutes les étapes s'enchaînent seules ;
   - interactive : l'élève touche les éléments (ordres, soldats, camps, VS…) pour avancer ;
   - guided      : comme interactive, mais l'appli appelle elle-même next() étape par étape. */
(function () {
  'use strict';
  const GR = window.GR;
  const M = GR.MINUS;
  const CANCEL = { cancel: true };
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // Soldat illustré : bottes, pantalon, veste (couleur = signe), ceinturon, casque…
  // Les éléments .sd-star / .sd-ep n'apparaissent que pour un général (taille « big »).
  const SVG = '<svg class="sd-svg" viewBox="0 0 64 96" aria-hidden="true">' +
    '<ellipse class="sd-shadow" cx="32" cy="93" rx="19" ry="3.2"/>' +
    '<path class="sd-pants" d="M20 72 L21 87 L30.5 87 L31 72 Z M33 72 L33.5 87 L43 87 L44 72 Z"/>' +
    '<path class="sd-boot" d="M19.5 85.5 H31 V91 H17.5 Q17.5 87.5 19.5 85.5 Z M33 85.5 H44.5 Q46.5 87.5 46.5 91 H33 Z"/>' +
    '<path class="sd-sleeve" d="M14 45 Q7 50 7.5 66 L13.5 67 Q14 55 18.5 50 Z"/><path class="sd-sleeve" d="M50 45 Q57 50 56.5 66 L50.5 67 Q50 55 45.5 50 Z"/>' +
    '<circle class="sd-skin" cx="10.5" cy="68.5" r="3.7"/><circle class="sd-skin" cx="53.5" cy="68.5" r="3.7"/>' +
    '<path class="sd-veste" d="M14 47 Q15 36.5 25 34.5 L39 34.5 Q49 36.5 50 47 L51 75 L13 75 Z"/>' +
    '<path class="sd-shade" d="M37 34.5 L39 34.5 Q49 36.5 50 47 L51 75 L41 75 Z"/>' +
    '<path class="sd-pocket" d="M17 50 H25 M39 50 H47"/>' +
    '<rect class="sd-belt" x="13" y="64.5" width="38" height="5" rx="1.2"/><rect class="sd-buckle" x="29" y="63.8" width="6" height="6.4" rx="1.2"/>' +
    '<rect class="sd-ep" x="13.5" y="38" width="9" height="3.2" rx="1.6"/><rect class="sd-ep" x="41.5" y="38" width="9" height="3.2" rx="1.6"/>' +
    '<path class="sd-col" d="M25 34.5 L32 43 L39 34.5 Z"/>' +
    '<circle class="sd-skin" cx="21" cy="24.5" r="2.6"/><circle class="sd-skin" cx="43" cy="24.5" r="2.6"/>' +
    '<circle class="sd-skin" cx="32" cy="23.5" r="11"/>' +
    '<circle class="sd-cheek" cx="25.6" cy="28.6" r="1.9"/><circle class="sd-cheek" cx="38.4" cy="28.6" r="1.9"/>' +
    '<path class="sd-brow" d="M25.5 21.3 L29.8 20.7 M34.2 20.7 L38.5 21.3"/>' +
    '<circle class="sd-eye" cx="28" cy="24.8" r="1.6"/><circle class="sd-eye" cx="36" cy="24.8" r="1.6"/>' +
    '<path class="sd-mouth" d="M29 30 Q32 32.6 35 30"/>' +
    '<path class="sd-strap" d="M21.6 22.5 Q23 33.5 32 34.5 Q41 33.5 42.4 22.5"/>' +
    '<path class="sd-helm" d="M19 22.5 Q19 8 32 8 Q45 8 45 22.5 Z"/>' +
    '<path class="sd-rim" d="M15.5 22.3 Q32 18.8 48.5 22.3 L48.5 24.4 Q32 21 15.5 24.4 Z"/>' +
    '<path class="sd-hl" d="M23.5 13.5 Q27.5 9.8 33 9.6"/>' +
    '<path class="sd-star" d="M32 10.6 l1.9 3.8 4.2 .6 -3 2.9 .7 4.2 -3.8 -2 -3.8 2 .7 -4.2 -3 -2.9 4.2 -.6 Z"/>' +
    '</svg>';

  function makeSoldier(s, v, explicit, size) {
    const el = h('div', 'sd ' + (s === '-' ? 'r' : s === '0' ? 'z' : 'g') + (size ? ' ' + size : ''));
    el.innerHTML = '<div class="sd-in">' + SVG + '<div class="sd-num"></div></div><div class="sd-hp"><i></i></div>';
    el._s = s; el._v = v; el._explicit = !!explicit; el._hidden = false;
    setLabel(el);
    return el;
  }
  // Un nombre sans signe écrit est positif : on affiche son « + » en fantôme
  function setLabel(el, txt) {
    const num = el.querySelector('.sd-num');
    num.classList.toggle('hid', !!el._hidden && txt == null);
    if (txt != null) { num.textContent = txt; return; }
    if (el._hidden) { num.textContent = '?'; return; }
    if (el._s === '-') num.textContent = M + GR.fmtAbs(el._v);
    else if (el._s === '0') num.textContent = '0';
    else if (el._explicit) num.textContent = '+' + GR.fmtAbs(el._v);
    else num.innerHTML = '<span class="gp">+</span>' + GR.fmtAbs(el._v);
  }
  function setSign(el, s) { el._s = s; el.classList.remove('g', 'r', 'z'); el.classList.add(s === '-' ? 'r' : 'g'); }
  GR.soldier = (s, v, explicit, small) => makeSoldier(s, v, explicit, small ? 'sm' : '');
  GR.mascot = () => { const m = makeSoldier('0', 0, false, 'sm'); setLabel(m, '0'); return m; };

  // Petite gerbe d'étincelles autour d'un élément
  function sparkle(el, n, cls) {
    const host = el.closest('.pl-stage') || el.parentElement;
    if (!host) return;
    const hr = host.getBoundingClientRect(), r = el.getBoundingClientRect();
    const cx = r.left - hr.left + r.width / 2, cy = r.top - hr.top + r.height * 0.45;
    for (let i = 0; i < (n || 8); i++) {
      const sp = h('i', 'spark ' + (cls || ''));
      sp.style.left = cx + 'px'; sp.style.top = cy + 'px';
      host.appendChild(sp);
      const a = (Math.PI * 2 * i) / (n || 8) + Math.random() * 0.5;
      const d = 26 + Math.random() * 30;
      sp.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.cos(a) * d + 'px), calc(-50% + ' + Math.sin(a) * d + 'px)) scale(.2)', opacity: 0 }], { duration: 520 + Math.random() * 260, easing: 'cubic-bezier(.2,.8,.3,1)' }).onfinish = () => sp.remove();
    }
  }
  GR.sparkle = sparkle;

  function flipSoldier(el, s) {
    const inner = el.querySelector('.sd-in');
    if (GR.sfx) GR.sfx('flip');
    return new Promise((res) => {
      const a = inner.animate([{ transform: 'rotateY(0deg) scale(1)' }, { transform: 'rotateY(90deg) scale(1.08)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => {
        setSign(el, s || (el._s === '-' ? '+' : '-'));
        el._explicit = true; setLabel(el);
        sparkle(el, 8, el._s === '-' ? 'r' : 'g');
        const b = inner.animate([{ transform: 'rotateY(-90deg) scale(1.08)' }, { transform: 'rotateY(0deg) scale(1)' }], { duration: 230, easing: 'ease-out' });
        a.cancel();
        b.onfinish = res;
      };
    });
  }

  // Déplacement fluide d'éléments d'un endroit de la page à un autre (technique FLIP), avec un petit saut
  function flipLayout(els, mutate, ms, hop) {
    const first = els.map((e) => e.getBoundingClientRect());
    mutate();
    els.forEach((e, i) => {
      const l = e.getBoundingClientRect(), f = first[i];
      const dx = f.left - l.left, dy = f.top - l.top;
      if (!dx && !dy) return;
      const frames = hop
        ? [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 - 34) + 'px) rotate(' + (dx > 0 ? -8 : 8) + 'deg)', offset: 0.5 }, { transform: 'none' }]
        : [{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }];
      e.animate(frames, { duration: ms, easing: hop ? 'ease-in-out' : 'cubic-bezier(.2,.8,.2,1)' });
    });
  }
  const FLAG = (c) => '<div class="flag ' + c + '"><svg viewBox="0 0 44 54" aria-hidden="true"><rect x="5" y="2" width="3.2" height="50" rx="1.6" class="pole"/><circle cx="6.6" cy="3" r="3" class="knob"/><path class="cloth" d="M8 5 Q21 1 38 7 Q24 13 38 19 Q22 23 8 19 Z"/></svg><span>' + (c === 'g' ? 'Camp vert (+)' : 'Camp rouge (' + M + ')') + '</span></div>';

  // Construit la rangée de soldats d'un calcul
  function build(node, parent, size) {
    const reg = { soldiers: [], cmds: [] };
    function add(items, par, stack) {
      items.forEach((n, i) => {
        if (n.kind === 'num') {
          const s = makeSoldier(n.s, n.v, n.explicit || i > 0, size);
          reg.soldiers.push(s); stack.forEach((c) => c.soldiers.push(s)); par.appendChild(s);
        } else if (n.kind === 'group') {
          const cmd = h('div', 'cmd');
          const c = { el: cmd, order: n.order, explicit: n.explicit, soldiers: [], badge: null, sel: null };
          if (n.explicit) {
            const b = h('div', 'od ' + (n.order === '-' ? 'm' : 'p'));
            b.innerHTML = '<div class="od-p">' + (n.order === '-' ? M : '+') + '</div><div class="od-t">' + (n.order === '-' ? 'ordre : traîtres' : 'ordre : fidèles') + '</div>';
            cmd.appendChild(b); c.badge = b;
          }
          const sel = h('div', 'sel');
          sel.appendChild(h('span', 'par', '('));
          reg.cmds.push(c);
          add(n.items, sel, stack.concat([c]));
          sel.appendChild(h('span', 'par', ')'));
          cmd.appendChild(sel); c.sel = sel;
          par.appendChild(cmd);
        } else if (n.kind === 'prod') {
          n.factors.forEach((f, k) => {
            if (k) par.appendChild(h('span', 'times', '×'));
            if (f.kind === 'num') {
              const s = makeSoldier(k === 0 ? n.s : '+', f.v, k === 0 && n.explicit, size);
              reg.soldiers.push(s); par.appendChild(s);
            } else {
              const sel = h('div', 'sel fac');
              sel.appendChild(h('span', 'par', '('));
              f.items.forEach((x) => { const s = makeSoldier(x.s, x.v, x.explicit, size); reg.soldiers.push(s); sel.appendChild(s); });
              sel.appendChild(h('span', 'par', ')'));
              par.appendChild(sel);
            }
          });
        }
      });
    }
    add(node.items, parent, []);
    return reg;
  }
  GR.lineupOnly = function (container, expr, size) {
    container.innerHTML = '';
    const line = h('div', 'pl-line');
    container.appendChild(line);
    build(typeof expr === 'string' ? GR.parse(expr) : expr, line, size || 'sm');
  };

  // Temps de lecture d'un texte (élève de collège : environ 3 mots par seconde)
  GR.readTime = function (html, min, max) {
    const words = String(html || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    return Math.min(max || 7000, Math.max(min || 1800, words * 330));
  };

  /* ================= LECTEUR ================= */
  GR.Player = function (container, expr, opts) {
    opts = Object.assign({ mode: 'interactive', showResult: true, until: null, speed: 0.7, size: '', hideFlat: false, onEnd: null }, opts || {});
    const node = typeof expr === 'string' ? GR.parse(expr) : expr;
    const ia = opts.mode === 'interactive' || opts.mode === 'guided';
    container.innerHTML = '';
    const root = h('div', 'pl' + (ia ? ' ia' : ''));
    const stage = h('div', 'pl-stage');
    const line = h('div', 'pl-line');
    const field = h('div', 'pl-field');
    const cap = h('div', 'pl-cap');
    const exprEl = h('div', 'pl-expr');
    const ctrl = h('div', 'pl-ctrl');
    stage.append(line, field);
    root.append(stage);
    if (opts.mode !== 'static') root.append(cap);
    root.append(exprEl);
    if (opts.mode === 'auto' || opts.mode === 'interactive') root.append(ctrl);
    container.appendChild(root);

    let dead = false;
    const timers = [];
    const wait = (ms) => new Promise((res, rej) => { const t = setTimeout(() => (dead ? rej(CANCEL) : res()), ms / opts.speed); timers.push(t); });
    // Chaque légende reste affichée le temps de la lire avant d'être remplacée
    let lastRead = { at: 0, ms: 0 };
    const say = (ico, html) => {
      cap.innerHTML = '<span class="pl-ico">' + ico + '</span><span>' + html + '</span>';
      cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
      lastRead = { at: performance.now(), ms: GR.readTime(html) * (opts.light ? 0.5 : 1) };
    };
    let pauseEnd = null; // « Montre-moi » pendant une pause de lecture : on abrège la pause
    const readPause = () => new Promise((res, rej) => {
      const left = lastRead.at + lastRead.ms - performance.now();
      const done = () => { clearTimeout(t); pauseEnd = null; if (dead) rej(CANCEL); else res(); };
      const t = setTimeout(done, Math.max(0, left));
      timers.push(t);
      pauseEnd = done;
    });
    const display = GR.str(node);
    const api = { node, stages: [], done: 0, busy: false, el: root };
    let reg = null, flat = null, b = null, mx = 1, skipFn = null;
    const gens = {};
    const camps = {};

    function bubble(target, text, cls) {
      const sr = stage.getBoundingClientRect(), tr = target.getBoundingClientRect();
      const bb = h('div', 'bubble ' + (cls || ''), text);
      bb.style.left = (tr.left - sr.left + tr.width / 2) + 'px';
      bb.style.top = (tr.top - sr.top - 6) + 'px';
      stage.appendChild(bb);
      const a = bb.animate([
        { opacity: 0, transform: 'translate(-50%,-70%) scale(.6)' },
        { opacity: 1, transform: 'translate(-50%,-100%) scale(1)', offset: 0.12 },
        { opacity: 1, transform: 'translate(-50%,-100%) scale(1)', offset: 0.82 },
        { opacity: 0, transform: 'translate(-50%,-112%) scale(.95)' }], { duration: 1900, fill: 'forwards' });
      a.onfinish = () => bb.remove();
    }
    function boom() {
      const bz = h('div', 'boom', '<svg viewBox="0 0 100 100"><polygon points="50,2 61,33 96,26 70,51 92,86 54,68 22,94 32,58 3,38 39,37"/></svg><span>BAM !</span>');
      field.appendChild(bz);
      bz.animate([{ transform: 'scale(0) rotate(-20deg)', opacity: 1 }, { transform: 'scale(1.25) rotate(5deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(1) rotate(0)', opacity: 0 }], { duration: 800, easing: 'ease-out' }).onfinish = () => bz.remove();
    }
    function countTo(el, from, to, ms) {
      const dec = !Number.isInteger(from) || !Number.isInteger(to);
      const t0 = performance.now();
      return new Promise((res) => {
        const step = (t) => {
          if (dead) return res();
          const k = Math.min(1, (t - t0) / (ms / opts.speed));
          const v = from + (to - from) * (1 - Math.pow(1 - k, 3));
          const r = dec ? Math.round(v * 10) / 10 : Math.round(v);
          setLabel(el, r === 0 ? '0' : (el._s === '-' ? M : '+') + GR.fmtAbs(r));
          if (k < 1) requestAnimationFrame(step); else { el._v = to; setLabel(el, to === 0 ? '0' : null); res(); }
        };
        requestAnimationFrame(step);
      });
    }
    const setHP = (el, v) => { el.querySelector('.sd-hp i').style.width = Math.max(0, (v / mx) * 100) + '%'; };

    // Attend que l'élève touche chaque cible (mode interactif) ; « Montre-moi » les déclenche
    function clicks(targets, act) {
      return new Promise((res, rej) => {
        let left = targets.length;
        if (!left) { res(); return; }
        let chain = Promise.resolve();
        const fired = new Set(); // propre à cette étape (un même soldat peut être touché à plusieurs étapes)
        targets.forEach((t) => {
          t.classList.add('tap');
          t._done = false;
          const fire = () => {
            if (fired.has(t)) return;
            fired.add(t);
            t._done = true;
            t.classList.remove('tap');
            t.removeEventListener('click', fire);
            chain = chain.then(() => act(t)).then(() => { left--; if (left === 0) { skipFn = null; res(); } }).catch(rej);
            if (opts.light && fired.size === 1 && targets.length > 1) setTimeout(() => { if (skipFn) skipFn(); }, 0); // mode allégé : une touche lance toute l'étape
          };
          t._fire = fire;
          t.addEventListener('click', fire);
        });
        skipFn = async () => { for (const t of targets) { if (!fired.has(t)) { t._fire(); await wait(300); } } };
      });
    }
    async function each(targets, act, gap) { for (const t of targets) { await act(t); await wait(gap || 250); } }
    const run = (targets, act, gap) => (ia ? clicks(targets, act) : each(targets, act, gap));

    /* ---------- étapes ---------- */
    function lineup() {
      line.innerHTML = ''; field.innerHTML = ''; field.className = 'pl-field'; line.className = 'pl-line';
      reg = build(node, line, opts.size);
      exprEl.innerHTML = '<span class="e0">' + display + '</span>';
      reg.soldiers.forEach((s, i) => {
        s.animate([{ transform: 'translateY(24px) scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: i * 80, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' });
        if (opts.mode !== 'static') s.addEventListener('click', () => {
          if (s.classList.contains('tap') || s.closest('.camp')) return;
          if (s._s === '+' && !s._explicit) bubble(s, 'Pas de signe écrit → positif : +' + GR.fmtAbs(s._v), 'g');
          else bubble(s, (s._s === '-' ? 'Veste rouge' : 'Veste verte') + ' · force ' + GR.fmtAbs(s._v), s._s === '-' ? 'r' : 'g');
        });
      });
      const implicit = reg.soldiers.find((s) => s._s === '+' && !s._explicit);
      const imp = implicit ? '<span class="implicit">✳️ Le <b>' + GR.fmtAbs(implicit._v) + '</b> n\'a pas de signe écrit : un nombre <b>sans signe est positif</b>. Son « + » est sous-entendu (on le voit en transparent sur sa veste).</span>' : '';
      const tip = opts.mode !== 'static' ? ' <i>Touche un soldat pour voir sa force.</i>' : '';
      if (node.hasProd) say('🧮', 'Attention, c\'est un <b>produit</b> (×) : ce n\'est pas une bataille !' + imp);
      else if (node.hasGroup) say('📣', 'Un signe collé à un nombre est la <b>couleur de sa veste</b>. Les parenthèses <b>sélectionnent</b> des soldats ; le signe juste devant est un <b>ordre</b>.' + tip + imp);
      else say('🪖', 'Chaque nombre est un soldat : son signe est la <b>couleur de sa veste</b>, le nombre sans signe est sa <b>force</b>. Pas de parenthèse, pas d\'ordre.' + tip + imp);
    }

    // Le signe sous-entendu : un nombre sans signe écrit est positif
    async function implicitStage() {
      const t = reg.soldiers.filter((s) => s._s === '+' && !s._explicit);
      if (!t.length) return;
      const v = GR.fmtAbs(t[0]._v);
      say('✳️', ia ? '👆 <b>Touche le ' + v + '</b> : pourquoi n\'a-t-il pas de signe ?' : 'Le ' + v + ' n\'a pas de signe écrit… regardons sa veste.');
      await run(t, async (s) => {
        bubble(s, 'Pas de signe écrit → positif : +' + GR.fmtAbs(s._v), 'g');
        const gp = s.querySelector('.gp');
        if (gp) gp.animate([{ opacity: 0.32, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1.7)', offset: 0.25 }, { opacity: 1, transform: 'scale(1)', offset: 0.7 }, { opacity: 0.32, transform: 'scale(1)' }], { duration: 1700 });
        sparkle(s, 8, 'g');
        await wait(1300);
      }, 300);
      say('✳️', 'Un nombre <b>sans signe écrit est positif</b> : sa veste est verte, son « + » est sous-entendu (on ne l\'écrit pas en début de calcul).' + (reg.soldiers.length > 1 ? ' Chaque signe écrit appartient au soldat qui le suit.' : ''));
      await wait(ia ? 1200 : 1500);
    }

    async function execCmd(c) {
      c.sel.classList.add('hl');
      if (c.badge) {
        c.badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 500 });
        bubble(c.badge, c.order === '-' ? 'Traîtres ! Retournez vos vestes !' : 'Fidèles ! Gardez vos vestes.', c.order === '-' ? 'm' : 'p');
      } else bubble(c.sel, 'Pas d\'ordre : on garde sa veste.', 'p');
      await wait(650);
      if (c.order === '-') { for (const s of c.soldiers) { flipSoldier(s); await wait(180); } await wait(300); }
      else await wait(200);
      c.sel.classList.remove('hl');
      c.sel.classList.add('ok');
    }
    async function orders() {
      const targets = reg.cmds.map((c) => { const t = c.badge || c.sel; t._cmd = c; return t; });
      say('📣', ia ? '👆 <b>Touche chaque ordre</b> (le signe devant une parenthèse) pour l\'exécuter.' : 'On <b>exécute les ordres</b> !');
      await run(targets, (t) => execCmd(t._cmd), 200);
      say('✅', 'Ordres exécutés : la sélection n\'a plus de raison d\'être, elle <b>disparaît</b>.');
      reg.cmds.forEach((c) => c.el.classList.add('gone'));
      await wait(600);
      const sols = reg.soldiers;
      flipLayout(sols, () => { line.innerHTML = ''; sols.forEach((s, i) => { s._explicit = i > 0 || s._s === '-'; setLabel(s); line.appendChild(s); }); }, 550);
      await wait(600);
      if (!opts.hideFlat) exprEl.insertAdjacentHTML('beforeend', ' <span class="e1">= ' + GR.flatStr(flat) + '</span>');
    }

    async function campsStage() {
      say('🏳️', ia ? '👆 <b>Touche chaque soldat</b> pour l\'envoyer dans son camp : les verts d\'un côté, les rouges de l\'autre.' : 'On range les soldats : les <b>verts</b> d\'un côté, les <b>rouges</b> de l\'autre.');
      field.innerHTML = '';
      camps.g = h('div', 'camp g'); camps.r = h('div', 'camp r');
      const wg = h('div', 'campw', FLAG('g')), wr = h('div', 'campw', FLAG('r'));
      wg.appendChild(camps.g); wr.appendChild(camps.r);
      const vs = h('button', 'vs', 'VS'); vs.type = 'button'; vs.disabled = true;
      camps.vs = vs;
      field.append(wg, vs, wr);
      field.classList.add('on');
      const sols = reg.soldiers.slice();
      await run(sols, async (s) => {
        flipLayout([s], () => { (s._s === '+' ? camps.g : camps.r).appendChild(s); }, 640, true);
        await wait(560);
      }, 100);
      line.classList.add('off');
      ['g', 'r'].forEach((k) => { if (!camps[k].children.length) camps[k].appendChild(h('div', 'nobody', 'personne')); });
      await wait(250);
    }

    async function mergeCamp(k) {
      const camp = camps[k];
      const sols = [...camp.querySelectorAll('.sd')];
      if (!sols.length) return;
      const s = k === 'g' ? '+' : '-';
      const tot = GR.round(sols.reduce((a, x) => a + x._v, 0));
      const hideTot = !opts.showResult && !(b.G > 0 && b.R > 0);
      if (sols.length > 1) {
        const f0 = sols[0].getBoundingClientRect();
        sols.slice(1).forEach((x) => { const r = x.getBoundingClientRect(); x.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(' + (f0.left - r.left) + 'px,' + (f0.top - r.top) + 'px) scale(.5)', opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' }); });
        bubble(camp, (k === 'g' ? 'Les verts' : 'Les rouges') + ' s\'allient : ' + sols.map((x) => GR.fmtAbs(x._v)).join(' + ') + ' = ' + (hideTot ? '?' : GR.fmtAbs(tot)), k);
        await wait(650);
      }
      const gen = makeSoldier(s, sols[0]._v, true, 'big');
      camp.classList.remove('tap');
      camp.innerHTML = ''; camp.appendChild(gen);
      gen.classList.add('hp-on');
      gen.animate([{ transform: 'scale(.55)' }, { transform: 'scale(1.12)' }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
      const ring = h('i', 'ring ' + k); camp.appendChild(ring);
      ring.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0.9 }, { transform: 'translate(-50%,-50%) scale(1.6)', opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => ring.remove();
      setTimeout(() => sparkle(gen, 10, 'gold'), 120);
      setHP(gen, tot);
      gens[k] = gen;
      if (hideTot) { gen._hidden = true; gen._v = tot; setLabel(gen); }
      else if (sols.length > 1) await countTo(gen, sols[0]._v, tot, 650);
      else { gen._v = tot; setLabel(gen); }
      await wait(250);
    }
    async function alliance() {
      mx = Math.max(b.G, b.R) || 1;
      const multi = ['g', 'r'].filter((k) => camps[k].querySelectorAll('.sd').length > 1);
      const single = ['g', 'r'].filter((k) => camps[k].querySelectorAll('.sd').length === 1);
      if (multi.length) say('🤝', ia ? '👆 <b>Touche un camp</b> où il y a plusieurs soldats : même couleur, ils <b>s\'allient</b> et leurs forces s\'additionnent.' : '<b>Même couleur : ils s\'allient</b>, leurs forces s\'additionnent.');
      else say('🎖️', 'Chaque camp a un seul soldat : il devient le <b>général</b> de son armée, avec sa barre de force.');
      for (const k of single) await mergeCamp(k);
      await run(multi.map((k) => camps[k]), (camp) => mergeCamp(camp === camps.g ? 'g' : 'r'), 200);
      if (b.G > 0 && b.R > 0) say('🎖️', 'Les deux armées sont prêtes : <b class="tg">verte, force ' + GR.fmtAbs(b.G) + '</b> contre <b class="tr">rouge, force ' + GR.fmtAbs(b.R) + '</b>.');
      else if (!opts.showResult) say('❓', 'Une seule armée sur le terrain, pas de bataille. <b>Quelle est sa force, et sa couleur ?</b>');
      else say('🎖️', 'Une seule armée sur le terrain : <b>pas de bataille</b>, elle garde toute sa force.');
    }

    async function clash() {
      const g = gens.g, r = gens.r, vs = camps.vs;
      const k = Math.min(b.G, b.R);
      if (ia) {
        vs.disabled = false; vs.textContent = '⚔️';
        say('⚔️', '👆 <b>Touche ⚔️</b> pour lancer la bataille entre l\'armée verte (' + GR.fmtAbs(b.G) + ') et l\'armée rouge (' + GR.fmtAbs(b.R) + ').');
        await clicks([vs], async () => {});
        vs.disabled = true;
      }
      say('💥', '<b>Bataille !</b> La force ' + GR.fmtAbs(k) + ' de chaque côté s\'annule.');
      const ga = g.animate([{ transform: 'none' }, { transform: 'translateX(34px)' }], { duration: 360, easing: 'ease-in', fill: 'forwards' });
      const ra = r.animate([{ transform: 'none' }, { transform: 'translateX(-34px)' }], { duration: 360, easing: 'ease-in', fill: 'forwards' });
      await wait(360);
      boom();
      sparkle(camps.vs, 18, 'gold');
      stage.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-6px,3px)' }, { transform: 'translate(5px,-3px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 380 });
      if (GR.sfx) GR.sfx('boom');
      [g, r].forEach((x) => x.querySelector('.sd-in').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 160, iterations: 3 }));
      const gl = GR.round(b.G - k), rl = GR.round(b.R - k);
      setHP(g, gl); setHP(r, rl);
      if (opts.showResult) { countTo(g, b.G, gl, 900); countTo(r, b.R, rl, 900); }
      else {
        [[g, gl], [r, rl]].forEach(([x, v]) => { if (v === 0) countTo(x, x._v, 0, 900); else { x._hidden = true; x._v = v; setLabel(x); } });
      }
      await wait(950);
      [[g, gl], [r, rl]].forEach(([x, v]) => { if (v === 0) x.classList.add('down'); });
      ga.reverse(); ra.reverse();
      if (gl === rl) say('🤝', '<b>Forces égales</b> : les deux armées s\'annulent complètement.');
      else if (opts.showResult) say('🏆', 'L\'armée ' + (gl > rl ? 'verte' : 'rouge') + ' gagne : il lui reste ' + GR.fmtAbs(gl + rl) + ' de force.');
      else say('❓', 'L\'armée ' + (gl > rl ? 'verte' : 'rouge') + ' a gagné… <b>combien de force lui reste-t-il ?</b>');
      await wait(500);
    }

    async function result() {
      const res = GR.val(node);
      if (flat.length === 1) say('🎖️', 'Il ne reste qu\'un soldat : <b>' + GR.fmt(res, true) + '</b>.');
      else say('🏆', GR.phrase(b.G, b.R));
      const rb = h('span', 'res ' + (res > 0 ? 'g' : res < 0 ? 'r' : 'z'), GR.fmt(res));
      exprEl.append(' = ', rb);
      rb.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
      if (GR.sfx) GR.sfx('star');
      await wait(300);
    }

    async function product() {
      const prodNode = node.items[0];
      const absV = GR.round(Math.abs(GR.val(node)));
      const abs = [];
      prodNode.factors.forEach((f) => abs.push(GR.fmtAbs(Math.abs(GR.val({ kind: 'sum', items: [f] })))));
      const negs = reg.soldiers.filter((s) => s._s === '-');
      field.innerHTML = ''; field.className = 'pl-field on prod';
      const gen = makeSoldier('+', 0, true, 'big');
      field.appendChild(gen);
      say('✖️', 'Pas de bataille : on <b>multiplie les forces</b>, ' + abs.join(' × ') + (opts.showResult ? ' = ' + GR.fmtAbs(absV) : '') + '. Le résultat commence avec une veste verte.');
      if (opts.showResult) await countTo(gen, 0, absV, 700); else { gen._hidden = true; gen._v = absV; setLabel(gen); }
      await wait(500);
      let n = 0;
      if (negs.length) say('🔄', ia ? '👆 <b>Touche chaque soldat rouge</b> du produit : chaque facteur négatif fait <b>retourner la veste</b> du résultat.' : 'Chaque facteur négatif fait <b>retourner la veste</b> du résultat.');
      await run(negs, async (s) => {
        n++;
        s.classList.add('glow');
        bubble(s, 'Facteur négatif n° ' + n + ' : on retourne la veste !', 'm');
        await flipSoldier(gen);
        await wait(350);
        s.classList.remove('glow');
      }, 350);
      say('🧮', n + ' facteur' + (n > 1 ? 's' : '') + ' négatif' + (n > 1 ? 's' : '') + ' : ' + (n % 2 === 0 ? 'nombre <b>pair</b> → la veste est verte, résultat <b>positif</b>.' : 'nombre <b>impair</b> → la veste est rouge, résultat <b>négatif</b>.'));
      if (opts.showResult) {
        const res = GR.val(node);
        const rb = h('span', 'res ' + (res > 0 ? 'g' : res < 0 ? 'r' : 'z'), GR.fmt(res));
        exprEl.append(' = ', rb);
        rb.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.35)' }, { transform: 'none' }], { duration: 480, easing: 'ease-out' });
      }
      await wait(300);
    }

    /* ---------- chemin inverse (mission Déguisements) : de l'armée vers l'écriture avec parenthèses ---------- */
    // En haut : l'armée à obtenir. En bas : son déguisement, où un soldat (ou un ordre) est caché.
    let treg = null, hc = null;
    const tline = h('div', 'pl-line');
    const labT = h('div', 'rv-lab', '🎯 Le calcul de départ');
    const labD = h('div', 'rv-lab', '🕵️ Avec des parenthèses');
    const twin = (s) => treg.soldiers[reg.soldiers.indexOf(s)];
    const colorTxt = (s) => (s === '-' ? 'rouge' : 'verte');
    function holeDisplay() {
      const str = GR.str(node), k = str.lastIndexOf('(');
      if (!opts.hideOrder) return str.slice(0, k) + '( … )';
      return str.slice(0, k).trimEnd().slice(0, -1) + '… ' + str.slice(k);
    }
    function revLineup() {
      stage.classList.add('rev');
      stage.insertBefore(labT, line); stage.insertBefore(tline, line); stage.insertBefore(labD, line);
      tline.innerHTML = ''; line.innerHTML = ''; field.innerHTML = '';
      treg = build(GR.parse(GR.flatStr(flat)), tline, opts.size);
      reg = build(node, line, opts.size);
      hc = reg.cmds[reg.cmds.length - 1];
      if (opts.hideOrder) {
        hc.badge.classList.remove('m', 'p'); hc.badge.classList.add('q');
        hc.badge.querySelector('.od-p').textContent = '?';
        hc.badge.querySelector('.od-t').textContent = 'quel ordre ?';
      } else hc.soldiers.forEach((s) => { s._real = s._s; s._hidden = true; s.classList.remove('g', 'r'); s.classList.add('z', 'mys'); setLabel(s); });
      exprEl.innerHTML = '<span class="e0">' + GR.flatStr(flat) + ' = ' + holeDisplay() + '</span>';
      [...treg.soldiers, ...reg.soldiers].forEach((s, i) => s.animate([{ transform: 'translateY(24px) scale(.5)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, delay: i * 70, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' }));
      say('🕵️', 'On connaît le calcul (en haut), on cherche l\'écriture avec parenthèses (en bas). ' +
        (opts.hideOrder ? 'C\'est l\'<b>ordre</b> qui est caché.' : 'Un soldat est caché derrière le <b>?</b>.'));
    }
    // Les soldats déjà visibles correspondent à ceux d'en haut
    async function revMatch() {
      const vis = reg.soldiers.filter((s) => !hc.soldiers.includes(s));
      say('🔗', ia ? '👆 <b>Touche le soldat visible</b> pour le comparer au calcul d\'en haut.' : 'On compare d\'abord le soldat visible avec celui d\'en haut.');
      await run(vis, async (s) => {
        const t = twin(s);
        bubble(s, 'Pas d\'ordre : il garde sa veste → comme en haut ✓', 'p');
        [s, t].forEach((x) => { x.classList.add('glow'); sparkle(x, 8, 'gold'); });
        await wait(1300);
        [s, t].forEach((x) => x.classList.remove('glow'));
        t.classList.add('pair');
      }, 300);
      say('🔗', 'Ce soldat est <b>déjà le même</b> qu\'en haut. Reste à trouver ' + (opts.hideOrder ? 'l\'<b>ordre</b> caché.' : 'le soldat <b>caché</b>.'));
      await wait(900);
    }
    // Soldat caché : on lit l'ordre et la couleur voulue
    async function revOrder() {
      const s = hc.soldiers[0], t = twin(s), o = hc.order;
      say('📣', ia ? '👆 <b>Touche l\'ordre</b> devant la parenthèse : que va faire le soldat caché ?' : 'Regardons l\'<b>ordre</b> devant la parenthèse.');
      await run([hc.badge], async () => {
        hc.badge.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 500 });
        bubble(hc.badge, o === '-' ? 'Ordre ' + M + ' : il va retourner sa veste' : 'Ordre + : il gardera sa veste', o === '-' ? 'm' : 'p');
        hc.sel.classList.add('hl');
        await wait(900);
        t.classList.add('glow');
        bubble(t, 'Après l\'ordre, il doit être ' + GR.fmt(t._s === '-' ? -t._v : t._v, true), t._s === '-' ? 'r' : 'g');
        await wait(1200);
      });
      const want = colorTxt(t._s);
      say(o === '-' ? '🔄' : '🛡️', 'Après l\'ordre, le soldat caché doit porter une veste <b>' + want + '</b>, comme en haut. ' +
        (o === '-' ? 'Ordre <b>' + M + '</b> : il va la retourner, donc <b>avant l\'ordre</b> il porte la veste <b>opposée</b> : ' + colorTxt(t._s === '-' ? '+' : '-') + '.' : 'Ordre <b>+</b> : il garde sa veste, donc il porte <b>déjà</b> la veste ' + want + '.') +
        (opts.showResult && !opts.ask ? '' : ' <b>Quel est ce soldat ?</b>'));
      await wait(800);
    }
    async function revReveal() {
      say('🔍', ia ? '👆 <b>Touche le ?</b> pour démasquer le soldat caché.' : 'On démasque le soldat caché.');
      await run(hc.soldiers, async (s) => {
        s._hidden = false; s.classList.remove('mys');
        await flipSoldier(s, s._real);
        bubble(s, 'Le soldat caché : ' + GR.fmt(s._s === '-' ? -s._v : s._v, true), s._s === '-' ? 'r' : 'g');
        await wait(900);
      }, 300);
      const s = hc.soldiers[0];
      say('🔍', 'Le soldat caché est <b>' + GR.fmt(s._s === '-' ? -s._v : s._v, true) + '</b>.');
      exprEl.innerHTML = '<span class="e0">' + GR.flatStr(flat) + ' = ' + GR.str(node) + '</span>';
      await wait(500);
    }
    // Ordre caché : on compare la veste du soldat avec celle voulue
    async function revCompare() {
      const s = hc.soldiers[0], t = twin(s);
      say('👀', ia ? '👆 <b>Touche le soldat</b> dans la parenthèse : porte-t-il déjà la bonne veste ?' : 'Le soldat dans la parenthèse porte-t-il déjà la bonne veste ?');
      await run([s], async () => {
        [s, t].forEach((x) => x.classList.add('glow'));
        bubble(t, 'Il faut une veste ' + colorTxt(t._s), t._s === '-' ? 'r' : 'g');
        await wait(900);
        bubble(s, 'Il porte une veste ' + colorTxt(s._s), s._s === '-' ? 'r' : 'g');
        await wait(1300);
        [s, t].forEach((x) => x.classList.remove('glow'));
      });
      const same = s._s === t._s;
      say(same ? '🛡️' : '🔄', same ? 'Il porte <b>déjà la bonne veste</b> : il doit la garder → il faut l\'ordre <b>+</b> (fidèle).' : 'Il porte la <b>mauvaise veste</b> : il doit la retourner → il faut l\'ordre <b>' + M + '</b> (traître).');
      await wait(800);
    }
    async function revRevealOrder() {
      const o = hc.order;
      say('📣', ia ? '👆 <b>Touche le ?</b> pour placer l\'ordre.' : 'On place l\'ordre.');
      await run([hc.badge], async () => {
        hc.badge.classList.remove('q'); hc.badge.classList.add(o === '-' ? 'm' : 'p');
        hc.badge.querySelector('.od-p').textContent = o === '-' ? M : '+';
        hc.badge.querySelector('.od-t').textContent = o === '-' ? 'ordre : traîtres' : 'ordre : fidèles';
        hc.badge.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.3)' }, { transform: 'none' }], { duration: 520, easing: 'ease-out' });
        sparkle(hc.badge, 10, 'gold');
        await wait(700);
      });
      exprEl.innerHTML = '<span class="e0">' + GR.flatStr(flat) + ' = ' + GR.str(node) + '</span>';
      await wait(400);
    }
    // Vérification : on exécute l'ordre et on retrouve le calcul de départ
    async function revCheck() {
      const tg = hc.badge || hc.sel;
      say('✅', ia ? '👆 <b>Vérifions : touche l\'ordre</b> pour l\'exécuter.' : 'Vérifions : on exécute l\'ordre.');
      await run([tg], () => execCmd(hc));
      reg.cmds.forEach((c) => { if (c !== hc) c.sel.classList.add('ok'); c.el.classList.add('gone'); });
      await wait(600);
      const sols = reg.soldiers;
      flipLayout(sols, () => { line.innerHTML = ''; sols.forEach((s, i) => { s._explicit = i > 0 || s._s === '-'; setLabel(s); line.appendChild(s); }); }, 550);
      await wait(650);
      sols.forEach((s, i) => { s.classList.add('glow'); twin(s).classList.add('glow'); setTimeout(() => sparkle(s, 8, 'gold'), i * 150); });
      say('🎉', 'L\'ordre exécuté, on retrouve bien <b>' + GR.flatStr(flat) + '</b> : le soldat caché était le bon.');
      exprEl.insertAdjacentHTML('beforeend', ' <span class="e1">= ' + GR.flatStr(flat) + '</span> <span class="res g">✓</span>');
      if (GR.sfx) GR.sfx('star');
      await wait(900);
      sols.forEach((s) => { s.classList.remove('glow'); twin(s).classList.remove('glow'); });
    }

    /* ---------- liste des étapes ---------- */
    if (opts.reverse) {
      flat = GR.flatten(node);
      api.stages.push({ id: 'lineup', label: '🕵️ L\'armée et son déguisement', run: revLineup });
      if (!opts.light) api.stages.push({ id: 'match', label: '🔗 Le soldat visible', run: revMatch });
      if (opts.hideOrder) {
        api.stages.push({ id: 'compare', label: '👀 Bonne veste ou pas ?', run: revCompare });
        if (opts.showResult) api.stages.push({ id: 'reveal', label: '📣 L\'ordre', run: revRevealOrder });
      } else {
        api.stages.push({ id: 'order', label: '📣 L\'ordre', run: revOrder });
        if (opts.showResult) api.stages.push({ id: 'reveal', label: '🔍 Le soldat caché', run: revReveal });
      }
      if (opts.showResult) api.stages.push({ id: 'check', label: '✅ Vérifier', run: revCheck });
    } else {
    api.stages.push({ id: 'lineup', label: '🪖 Les soldats', run: lineup });
    const hasImplicit = (function walk(items) { return items.some((n, i) => (n.kind === 'num' && i === 0 && !n.explicit && n.s === '+') || (n.kind === 'group' && walk(n.items)) || (n.kind === 'prod' && i === 0 && !n.explicit)); })(node.items);
    if (hasImplicit && (opts.mode === 'interactive' || opts.mode === 'auto')) api.stages.push({ id: 'implicit', label: '✳️ Le signe sous-entendu', run: implicitStage });
    if (node.hasProd) {
      if (node.items.length === 1 && node.items[0].kind === 'prod') api.stages.push({ id: 'product', label: '✖️ Le produit', run: product });
    } else {
      flat = GR.flatten(node); b = GR.battle(flat);
      if (node.hasGroup) api.stages.push({ id: 'orders', label: '📣 Exécuter les ordres', run: orders });
      if (flat.length > 1) {
        api.stages.push({ id: 'camps', label: '🏳️ Ranger les camps', run: campsStage });
        api.stages.push({ id: 'alliance', label: '🤝 Les alliances', run: alliance });
        if (b.G > 0 && b.R > 0) api.stages.push({ id: 'clash', label: '⚔️ La bataille', run: clash });
      }
      if (opts.showResult) api.stages.push({ id: 'result', label: '🏆 Le résultat', run: result });
    }
    }
    if (opts.until) { const k = api.stages.findIndex((s) => s.id === opts.until); if (k >= 0) api.stages = api.stages.slice(0, k + 1); }
    if (opts.mode === 'static') api.stages = api.stages.slice(0, 1);

    api.next = async function () {
      if (api.busy || dead || api.done >= api.stages.length) return false;
      api.busy = true;
      try { await api.stages[api.done].run(); }
      catch (e) { if (e === CANCEL) return false; throw e; }
      finally { api.busy = false; }
      api.done++;
      update();
      return true;
    };
    api.remaining = () => api.stages.slice(api.done).map((s) => s.id);
    api.current = () => api.stages[api.done] || null;
    api.play = async function () {
      while (!dead && api.done < api.stages.length) {
        const ok = await api.next();
        if (!ok) return;
        if (api.done < api.stages.length) { try { await readPause(); await wait(ia ? 250 : 500); } catch (e) { return; } }
      }
      if (!dead && opts.onEnd) opts.onEnd();
    };
    api.skip = () => { if (skipFn) skipFn(); else if (pauseEnd) pauseEnd(); };
    api.readPause = () => readPause().catch(() => {});
    api.isDone = () => api.done >= api.stages.length && !api.busy;
    api.destroy = () => { dead = true; timers.forEach(clearTimeout); };
    api.restart = () => { api.destroy(); const p = GR.Player(container, expr, opts); return p; };

    const again = h('button', 'btn ghost sm', '↺ Rejouer');
    const show = h('button', 'btn ghost sm', '👉 Montre-moi');
    again.type = show.type = 'button';
    again.onclick = () => { if (opts.onRestart) opts.onRestart(api.restart()); else api.restart(); };
    show.onclick = () => { if (skipFn) skipFn(); else if (pauseEnd) pauseEnd(); };
    function update() {
      const fin = api.done >= api.stages.length;
      show.disabled = fin;
      root.classList.toggle('fin', fin);
    }
    if (opts.mode === 'interactive') ctrl.append(again, show);
    if (opts.mode === 'auto') ctrl.append(again);

    api.stages[0].run(); // la première étape est jouée tout de suite (synchrone)
    if (opts.reverse && !reg.soldiers.some((s) => !hc.soldiers.includes(s))) api.stages = api.stages.filter((s) => s.id !== 'match');
    api.done = 1;
    update();
    if (opts.mode === 'auto' || opts.mode === 'interactive') setTimeout(() => { if (!dead) api.play(); }, opts.mode === 'auto' ? 700 : 300);
    return api;
  };
})();
