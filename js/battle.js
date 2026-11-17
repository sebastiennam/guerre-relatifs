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

  const SVG = '<svg class="sd-svg" viewBox="0 0 64 86" aria-hidden="true">' +
    '<ellipse class="sd-shadow" cx="32" cy="83" rx="21" ry="3"/>' +
    '<path class="sd-veste" d="M9 50 Q10 36 23 33 L41 33 Q54 36 55 50 L57 80 L7 80 Z"/>' +
    '<path class="sd-col" d="M25 33 L32 43 L39 33 Z"/>' +
    '<path class="sd-arm" d="M9 50 L5 70 L11 71 L14 54 Z"/><path class="sd-arm" d="M55 50 L59 70 L53 71 L50 54 Z"/>' +
    '<circle class="sd-face" cx="32" cy="22" r="11"/>' +
    '<path class="sd-helm" d="M18.5 21 Q18.5 6.5 32 6.5 Q45.5 6.5 45.5 21 L49 22.5 L15 22.5 Z"/>' +
    '<circle class="sd-eye" cx="28" cy="25" r="1.5"/><circle class="sd-eye" cx="36" cy="25" r="1.5"/>' +
    '<path class="sd-mouth" d="M29 29 Q32 31 35 29"/></svg>';

  function makeSoldier(s, v, explicit, size) {
    const el = h('div', 'sd ' + (s === '-' ? 'r' : s === '0' ? 'z' : 'g') + (size ? ' ' + size : ''));
    el.innerHTML = '<div class="sd-in">' + SVG + '<div class="sd-num"></div></div><div class="sd-hp"><i></i></div>';
    el._s = s; el._v = v; el._explicit = !!explicit; el._hidden = false;
    setLabel(el);
    return el;
  }
  function setLabel(el, txt) {
    let t = txt;
    if (t == null) t = el._hidden ? '?' : (el._s === '-' ? M : el._explicit ? '+' : '') + GR.fmtAbs(el._v);
    el.querySelector('.sd-num').textContent = t;
  }
  function setSign(el, s) { el._s = s; el.classList.remove('g', 'r', 'z'); el.classList.add(s === '-' ? 'r' : 'g'); }
  GR.soldier = (s, v, explicit, small) => makeSoldier(s, v, explicit, small ? 'sm' : '');
  GR.mascot = () => { const m = makeSoldier('0', 0, false, 'sm'); setLabel(m, '0'); return m; };

  function flipSoldier(el, s) {
    const inner = el.querySelector('.sd-in');
    if (GR.sfx) GR.sfx('flip');
    return new Promise((res) => {
      const a = inner.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = () => {
        setSign(el, s || (el._s === '-' ? '+' : '-'));
        el._explicit = true; setLabel(el);
        const b = inner.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 210, easing: 'ease-out' });
        a.cancel();
        b.onfinish = res;
      };
    });
  }

  // Déplacement fluide d'éléments d'un endroit de la page à un autre (technique FLIP)
  function flipLayout(els, mutate, ms) {
    const first = els.map((e) => e.getBoundingClientRect());
    mutate();
    els.forEach((e, i) => {
      const l = e.getBoundingClientRect(), f = first[i];
      const dx = f.left - l.left, dy = f.top - l.top;
      if (dx || dy) e.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
  }

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

  /* ================= LECTEUR ================= */
  GR.Player = function (container, expr, opts) {
    opts = Object.assign({ mode: 'interactive', showResult: true, until: null, speed: 1, size: '', hideFlat: false, onEnd: null }, opts || {});
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
    const say = (ico, html) => {
      cap.innerHTML = '<span class="pl-ico">' + ico + '</span><span>' + html + '</span>';
      cap.classList.remove('pop'); void cap.offsetWidth; cap.classList.add('pop');
    };
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
        targets.forEach((t) => {
          t.classList.add('tap');
          const fire = () => {
            if (t._done) return;
            t._done = true;
            t.classList.remove('tap');
            t.removeEventListener('click', fire);
            chain = chain.then(() => act(t)).then(() => { left--; if (left === 0) { skipFn = null; res(); } }).catch(rej);
          };
          t._fire = fire;
          t.addEventListener('click', fire);
        });
        skipFn = async () => { for (const t of targets) { if (!t._done) { t._fire(); await wait(300); } } };
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
          bubble(s, (s._s === '-' ? 'Veste rouge' : 'Veste verte') + ' · force ' + GR.fmtAbs(s._v), s._s === '-' ? 'r' : 'g');
        });
      });
      if (node.hasProd) say('🧮', 'Attention, c\'est un <b>produit</b> (×) : ce n\'est pas une bataille !');
      else if (node.hasGroup) say('📣', 'Un signe collé à un nombre est la <b>couleur de sa veste</b>. Les parenthèses <b>sélectionnent</b> des soldats ; le signe juste devant est un <b>ordre</b>.' + (opts.mode !== 'static' ? ' <i>Touche un soldat pour voir sa force.</i>' : ''));
      else say('🪖', 'Chaque nombre est un soldat : son signe est la <b>couleur de sa veste</b>, le nombre sans signe est sa <b>force</b>. Pas de parenthèse, pas d\'ordre.');
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
      const vs = h('button', 'vs', 'VS'); vs.type = 'button'; vs.disabled = true;
      camps.vs = vs;
      field.append(camps.g, vs, camps.r);
      field.classList.add('on');
      const sols = reg.soldiers.slice();
      await run(sols, async (s) => {
        flipLayout([s], () => { (s._s === '+' ? camps.g : camps.r).appendChild(s); }, 520);
        await wait(420);
      }, 120);
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
      gen.animate([{ transform: 'scale(.55)' }, { transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 450, easing: 'ease-out' });
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

    /* ---------- liste des étapes ---------- */
    api.stages.push({ id: 'lineup', label: '🪖 Les soldats', run: lineup });
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
        if (api.done < api.stages.length) { try { await wait(ia ? 150 : 450); } catch (e) { return; } }
      }
      if (!dead && opts.onEnd) opts.onEnd();
    };
    api.skip = () => { if (skipFn) skipFn(); };
    api.destroy = () => { dead = true; timers.forEach(clearTimeout); };
    api.restart = () => { api.destroy(); const p = GR.Player(container, expr, opts); return p; };

    const again = h('button', 'btn ghost sm', '↺ Rejouer');
    const show = h('button', 'btn ghost sm', '👉 Montre-moi');
    again.type = show.type = 'button';
    again.onclick = () => { if (opts.onRestart) opts.onRestart(api.restart()); else api.restart(); };
    show.onclick = () => { if (skipFn) skipFn(); else if (!api.busy) api.next(); };
    function update() {
      const fin = api.done >= api.stages.length;
      show.disabled = fin;
      root.classList.toggle('fin', fin);
    }
    if (opts.mode === 'interactive') ctrl.append(again, show);
    if (opts.mode === 'auto') ctrl.append(again);

    lineup(); // la première étape est jouée tout de suite (synchrone)
    api.done = 1;
    update();
    if (opts.mode === 'auto' || opts.mode === 'interactive') setTimeout(() => { if (!dead) api.play(); }, opts.mode === 'auto' ? 700 : 300);
    return api;
  };
})();
