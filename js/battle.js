/* La Guerre des relatifs — affichage des soldats et animation « Rejouer la bataille ». */
(function () {
  'use strict';
  const GR = window.GR;
  const h = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  function soldier(sign, v, explicit, small) {
    const s = h('div', 'sold ' + (sign === '-' ? 'r' : 'g') + (small ? ' small' : ''));
    s.appendChild(h('div', 'head'));
    const ve = h('div', 'veste');
    ve.textContent = (sign === '-' ? GR.MINUS : explicit ? '+' : '') + GR.fmtAbs(v);
    s.appendChild(ve);
    return s;
  }
  GR.soldier = soldier;

  // Construit la rangée de soldats d'une expression (avec sélections et ordres)
  function troupes(node, small) {
    const wrap = h('div', 'troupes');
    const reg = { soldiers: [], sels: [], ordres: [] };
    function addItems(items, parent, inner) {
      items.forEach((n, i) => {
        if (n.kind === 'num') {
          const explicit = n.explicit || (i > 0);
          const s = soldier(n.s, n.v, explicit, small);
          reg.soldiers.push(s);
          parent.appendChild(s);
        } else if (n.kind === 'group') {
          const cmd = h('div', 'cmd');
          if (n.explicit) {
            const o = h('div', 'ordre');
            o.appendChild(h('div', 'pastille', n.order === '-' ? GR.MINUS : '+'));
            o.appendChild(h('small', null, n.order === '-' ? 'traîtres !' : 'fidèles'));
            reg.ordres.push(o);
            cmd.appendChild(o);
          }
          const sel = h('div', 'sel');
          sel.appendChild(h('span', 'par', '('));
          addItems(n.items, sel, true);
          sel.appendChild(h('span', 'par', ')'));
          reg.sels.push(sel);
          cmd.appendChild(sel);
          parent.appendChild(cmd);
        } else if (n.kind === 'prod') {
          if (n.s === '-' && n.explicit) {
            const o = h('div', 'ordre');
            o.appendChild(h('div', 'pastille', GR.MINUS));
            o.appendChild(h('small', null, 'signe'));
            parent.appendChild(o);
          }
          n.factors.forEach((f, k) => {
            if (k > 0) parent.appendChild(h('span', 'par', '×'));
            if (f.kind === 'num') parent.appendChild(soldier('+', f.v, false, small));
            else addItems([f], parent, true);
          });
        }
      });
    }
    addItems(node.items, wrap, false);
    return { el: wrap, reg };
  }
  GR.troupes = troupes;

  function flatTroupes(list, small) {
    const wrap = h('div', 'troupes');
    list.forEach((t, i) => wrap.appendChild(soldier(t.s, t.v, i > 0, small)));
    return wrap;
  }

  /* Les deux armées : les soldats de même couleur s'allient en une barre,
     chaque segment = la force d'un soldat (son nombre sans le signe). */
  function armies(flat) {
    const b = GR.battle(flat);
    const mx = Math.max(b.G, b.R) || 1;
    const field = h('div', 'bt-field');
    const bars = {};
    [['+', 'g', 'Armée verte', b.G], ['-', 'r', 'Armée rouge', b.R]].forEach(([s, c, nm, tot]) => {
      const mine = flat.filter((t) => t.s === s);
      const row = h('div', 'bt-row');
      const lbl = mine.length > 1 ? mine.map((t) => GR.fmtAbs(t.v)).join(' + ') + ' = ' + GR.fmtAbs(tot) : GR.fmtAbs(tot);
      row.appendChild(h('div', 'nm ' + c, nm + '<br><span class="frc">force ' + lbl + '</span>'));
      const holder = h('div', 'bar-holder');
      const bar = h('div', 'bar ' + c);
      bar.style.width = (tot / mx) * 100 + '%';
      if (!tot) bar.classList.add('empty');
      mine.forEach((t) => { const sg = h('div', 'seg', GR.fmtAbs(t.v)); sg.style.flex = t.v + ' 0 0'; bar.appendChild(sg); });
      const cut = h('div', 'cut');
      bar.appendChild(cut);
      holder.appendChild(bar);
      row.appendChild(holder);
      field.appendChild(row);
      bars[c] = { bar, cut, tot };
    });
    return { field, bars, b };
  }
  GR.armies = armies;

  /* Monte une bataille animée dans un conteneur.
     opts.showResult (défaut true) : montre le résultat final.
     opts.staticOnly : affiche seulement les soldats (pas d'animation, pas de résultat). */
  GR.mountBattle = function (container, expr, opts) {
    opts = Object.assign({ showResult: true, staticOnly: false }, opts || {});
    container.innerHTML = '';
    const node = typeof expr === 'string' ? GR.parse(expr) : expr;
    const root = h('div', 'bt');
    const ligne = h('div', 'bt-ligne');
    const zone = h('div');
    const cap = h('div', 'bt-cap');
    const field = h('div');
    const res = h('div', 'bt-res');
    const ctrl = h('div', 'bt-ctrl');
    root.append(ligne, zone, cap, field, res);
    if (!opts.staticOnly) root.appendChild(ctrl);
    container.appendChild(root);

    const display = GR.str(node);
    let timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    if (node.hasProd) {
      ligne.innerHTML = '<b>' + display + '</b>';
      zone.appendChild(troupes(node).el);
      cap.innerHTML = 'C\'est un <b>produit</b> (×) : ce n\'est pas une bataille ! On multiplie les nombres, puis la <b>règle des signes</b> : un nombre pair de « ' + GR.MINUS + ' » → positif, impair → négatif.';
      if (opts.showResult && !opts.staticOnly) res.textContent = display + ' = ' + GR.fmt(GR.val(node));
      return { node };
    }

    const flat = GR.flatten(node);
    const b = GR.battle(flat);
    let step = 0;
    const steps = [];

    function s0() {
      ligne.innerHTML = '<b>' + display + '</b>';
      zone.innerHTML = '';
      const t = troupes(node);
      zone.appendChild(t.el);
      zone._reg = t.reg;
      field.innerHTML = ''; res.textContent = '';
      cap.innerHTML = 'Chaque signe est la <b>couleur d\'une veste</b> : <span style="color:var(--g-dark);font-weight:700">vert = positif</span>, <span style="color:var(--r-dark);font-weight:700">rouge = négatif</span>.' +
        (node.hasGroup ? ' Les <b>parenthèses sélectionnent</b> des soldats ; le signe juste devant est l\'<b>ordre</b> qu\'on leur donne.' : ' Pas de parenthèse : personne ne reçoit d\'ordre.');
    }
    steps.push(s0);

    if (node.hasGroup) {
      steps.push(function s1() {
        const reg = zone._reg;
        let anyFlip = false;
        flat.forEach((t, i) => {
          const el = reg.soldiers[i];
          if (!el || !t.flipped) return;
          anyFlip = true;
          later(() => el.classList.add('flip'), 150 + i * 120);
          later(() => {
            el.classList.remove('g', 'r'); el.classList.add(t.s === '-' ? 'r' : 'g');
            el.querySelector('.veste').textContent = (t.s === '-' ? GR.MINUS : '+') + GR.fmtAbs(t.v);
            el.classList.remove('flip');
          }, 450 + i * 120);
        });
        const d = anyFlip ? 900 + flat.length * 120 : 500;
        later(() => { reg.sels.forEach((s) => s.classList.add('gone')); reg.ordres.forEach((o) => o.classList.add('gone')); }, d);
        later(() => {
          zone.innerHTML = '';
          zone.appendChild(flatTroupes(flat));
          ligne.innerHTML = display + ' <b>= ' + GR.flatStr(flat) + '</b>';
        }, d + 700);
        cap.innerHTML = '<b>On exécute les ordres.</b> Ordre « ' + GR.MINUS + ' » : les soldats sélectionnés sont des <b>traîtres</b>, ils retournent leur veste. Ordre « + » ou pas d\'ordre : ils la gardent. Ensuite, la sélection disparaît.';
      });
    }

    let ar = null;
    steps.push(function s2() {
      field.innerHTML = '';
      ar = armies(flat);
      field.appendChild(ar.field);
      const allies = flat.filter((t) => t.s === '+').length > 1 || flat.filter((t) => t.s === '-').length > 1;
      cap.innerHTML = '<b>Les soldats de même couleur s\'allient</b> : on forme l\'armée verte et l\'armée rouge. La force d\'un soldat, c\'est son nombre (sans le signe)' + (allies ? ' ; quand ils s\'allient, leurs forces s\'additionnent.' : '.');
    });

    steps.push(function s3() {
      const k = Math.min(b.G, b.R);
      if (k === 0) {
        cap.innerHTML = 'Une seule armée sur le terrain : <b>pas de bataille</b>. Elle garde toute sa force.';
        return;
      }
      cap.innerHTML = '<b>Bataille !</b> Les deux armées s\'affrontent : la force ' + GR.fmtAbs(k) + ' de chaque côté s\'annule (partie hachurée).';
      Object.values(ar.bars).forEach((x) => { x.cut.style.width = x.tot ? (k / x.tot) * 100 + '%' : '0'; });
    });

    if (opts.showResult) {
      steps.push(function s4() {
        cap.innerHTML = b.G === b.R ? '<b>Forces égales</b> : les deux armées s\'annulent complètement.' : '<b>L\'armée la plus forte gagne.</b> Il lui reste la différence des forces, et le résultat prend sa couleur.';
        res.textContent = GR.phrase(b.G, b.R);
      });
    } else {
      steps.push(function s4b() {
        cap.innerHTML = '<b>À toi de conclure :</b> quelle armée gagne, et combien de force lui reste-t-il ?';
      });
    }

    const nextBtn = h('button', 'btn main', 'Étape suivante ▶');
    const againBtn = h('button', 'btn', '↺ Recommencer');
    ctrl.append(againBtn, nextBtn);
    function go(i) {
      step = i; steps[i]();
      nextBtn.disabled = step >= steps.length - 1;
      nextBtn.textContent = step >= steps.length - 1 ? 'Terminé' : 'Étape suivante ▶';
    }
    nextBtn.onclick = () => { if (step < steps.length - 1) go(step + 1); };
    againBtn.onclick = () => { timers.forEach(clearTimeout); timers = []; go(0); };
    go(0);
    if (opts.staticOnly) cap.remove();
    return { node, destroy: () => timers.forEach(clearTimeout) };
  };
})();
