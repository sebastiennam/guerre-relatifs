/* La Guerre des relatifs — fiche d'exercices imprimable (séries reproductibles + corrigé). */
(function () {
  'use strict';
  const GR = window.GR;
  const M = GR.MINUS;
  const DEFAULT_URL = 'https://sebastiennam.github.io/guerre-relatifs/';
  const $ = (id) => document.getElementById(id);
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* indisponible */ } },
  };

  const SECTIONS = [
    { id: 'signes', t: 'Ordre ou couleur ?' },
    { id: 'ordres', t: 'Les ordres' },
    { id: 'soldats', t: 'Des soldats au calcul' },
    { id: 'simples', t: 'La bataille' },
    { id: 'traitres', t: 'Les traîtres' },
    { id: 'parentheses', t: 'Exécute les ordres, puis la bataille' },
    { id: 'deguise', t: 'Déguisements' },
    { id: 'manoeuvres', t: 'Grandes manœuvres' },
    { id: 'groupe', t: 'Sélection de groupe (4e)' },
    { id: 'contre', t: 'Contre-espionnage (sommes et produits)' },
  ];

  let corr = false;
  const B = (ans, cls) => '<span class="blank ' + (cls || '') + '">' + (corr ? '<span class="corr">' + ans + '</span>' : '') + '</span>';
  const m = (s) => '<span class="m">' + s + '</span>';
  const ri = GR.ri, rs = GR.rs, pick = GR.pick;
  const A = (v) => String(v).replace('.', ',');
  const sn = (s, v) => (s === '-' ? '-' : '+') + A(v);
  const first = (s, v) => (s === '-' ? '-' : '') + A(v);
  const P = (e) => GR.parse(e);
  const D = (n) => GR.str(n);
  const V = (n) => GR.fmt(GR.val(n));
  const F = (n) => GR.flatStr(GR.flatten(n));
  function uniq(fn, n) {
    const seen = new Set(); const out = []; let k = 0;
    while (out.length < n && k < 800) { k++; const x = fn(); if (seen.has(x)) continue; seen.add(x); out.push(x); }
    return out;
  }
  const dec1 = (max) => { let v; do { v = ri(1, max * 10) / 10; } while (Number.isInteger(v)); return v; };

  /* ---------- exercices ---------- */
  const build = {};

  build.ordres = function () {
    let h = '<p class="note">Un signe devant une parenthèse est un ordre : <b>+</b> fidèle (il garde sa veste), <b>' + M + '</b> traître (il retourne sa veste).</p><div class="g4">';
    const vA = uniq(() => ri(1, 12), 5), vC = uniq(() => ri(1, 20), 5);
    const pat = GR.rand() < 0.5 ? ['-', '+', '-', '-', '+'] : ['+', '-', '-', '+', '-'];
    for (let r = 0; r < 5; r++) {
      const s1 = pat[r], s2 = pat[(r + 2) % 5];
      ['-', '+'].forEach((o) => {
        const n = P(o + '(' + sn(s1, vA[r]) + ')');
        const res = GR.val(n);
        h += '<div>' + m(D(n) + ' = ' + B(res < 0 ? M : '+', 's') + ' ' + A(vA[r])) + '</div>';
      });
      ['-', '+'].forEach((o) => {
        const n = P(o + '(' + sn(s2, vC[r]) + ')');
        h += '<div>' + m(D(n) + ' = ' + B(GR.fmt(GR.val(n), true))) + '</div>';
      });
    }
    return h + '</div>';
  };

  // Écriture d'une expression où les signes « ordres » sont repérables (entourés dans le corrigé)
  const sg = (s) => (s === '-' ? M : '+');
  function itemsH(items) { return items.map((n, i) => termH(n, i === 0)).join(''); }
  function termH(n, isFirst) {
    const isOrder = n.kind === 'group';
    const s = isOrder ? n.order : n.s;
    const body = isOrder ? '(' + itemsH(n.items) + ')' : A(n.v);
    const sign = isOrder ? '<span class="os">' + sg(s) + '</span>' : sg(s);
    if (isFirst) return n.explicit ? sign + body : body;
    return ' ' + sign + ' ' + body;
  }

  build.signes = function () {
    const exprs = uniq(() => pick([
      () => GR.generate('fideles', pick([2, 3])).expr,
      () => GR.generate('manoeuvres', 3).expr,
      () => GR.generate('groupe', pick([1, 2])).expr,
      () => GR.generate('longues', 1).expr,
    ])(), 6);
    let h = '<p class="note">Un signe <b>devant une parenthèse</b> est un ordre. Un signe <b>devant un nombre</b> est la couleur de sa veste. <b>Entoure les ordres</b> (ne calcule pas).</p><div class="g2">';
    exprs.forEach((e, i) => { h += '<div>' + m(String.fromCharCode(97 + i) + ')  ' + itemsH(P(e).items)) + '</div>'; });
    return h + '</div>';
  };

  // Un soldat dessiné (veste colorée + nombre signé, lisible aussi en noir et blanc)
  const so = (s, v) => '<span class="so ' + (s === '-' ? 'r' : 'g') + '"><i class="hd"></i><b>' + sg(s) + A(v) + '</b></span>';
  build.soldats = function () {
    const rows = uniq(() => {
      const n = pick([2, 2, 3, 3, 4]);
      let signs; do { signs = Array.from({ length: n }, rs); } while (new Set(signs).size < 2 && GR.rand() < 0.8);
      return signs.map((s) => s + ri(1, 12)).join(' ');
    }, 8);
    let h = '<p class="note">Écris le calcul sans parenthèses qui correspond à ces soldats, puis calcule.</p><div class="g2">';
    rows.forEach((r) => {
      const list = r.split(' ').map((x) => ({ s: x[0], v: parseInt(x.slice(1), 10) }));
      const flat = GR.flatStr(list);
      h += '<div class="srow"><div class="line">' + list.map((t) => so(t.s, t.v)).join('') + '</div>' + m(B(flat, 'l') + ' = ' + B(GR.fmt(GR.flatVal(list)))) + '</div>';
    });
    return h + '</div>';
  };

  build.deguise = function () {
    const items = uniq(() => first(rs(), ri(1, 12)) + rs() + A(ri(1, 12)), 6);
    let h = '<p class="note">Une même armée, deux écritures. Avec l\'ordre <b>+</b>, le soldat porte déjà la bonne veste ; avec l\'ordre <b>' + M + '</b>, il porte la veste opposée.</p><div class="g2">';
    items.forEach((e) => {
      const n = P(e);
      const fl = GR.flatten(n);
      const a = '(' + sg(fl[0].s) + A(fl[0].v) + ')';
      const keep = sg(fl[1].s) + A(fl[1].v), flip = sg(GR.opp(fl[1].s)) + A(fl[1].v);
      h += '<div>' + m(D(n) + ' = ' + a + ' + (' + B(keep, 's') + ')') + '<div class="ln">' + m('<span style="visibility:hidden">' + D(n) + '</span> = ' + a + ' ' + M + ' (' + B(flip, 's') + ')') + '</div></div>';
    });
    return h + '</div>';
  };

  build.simples = function () {
    const items = uniq(() => {
      const pair = GR.rand() < 0.6 ? pick([['+', '-'], ['-', '+']]) : pick([['+', '+'], ['-', '-']]);
      return first(pair[0], ri(1, 15)) + pair[1] + A(ri(1, 15));
    }, 16).concat(uniq(() => first(rs(), dec1(20)) + rs() + A(GR.rand() < 0.5 ? dec1(20) : ri(1, 30)), 4));
    let h = '<div class="g4f">';
    items.forEach((e, i) => {
      const n = P(e);
      h += '<div>' + m(D(n) + ' = ' + (i === 0 ? '<b>' + V(n) + '</b>' : B(V(n)))) + '</div>';
    });
    return h + '</div><p class="note" style="margin-top:4px">Le premier calcul est un exemple.</p>';
  };

  build.traitres = function () {
    const items = uniq(() => first(rs(), ri(1, 12)) + (GR.rand() < 0.75 ? '-' : '+') + '(' + sn(rs(), ri(1, 12)) + ')', 10);
    let h = '<div class="g2">';
    items.forEach((e, i) => {
      const n = P(e);
      if (i === 0) h += '<div>' + m(D(n) + ' = <b>' + F(n) + '</b> = <b>' + V(n) + '</b>') + ' <small>(exemple)</small></div>';
      else h += '<div>' + m(D(n) + ' = ' + B(F(n), 'l') + ' = ' + B(V(n))) + '</div>';
    });
    return h + '</div>';
  };

  build.parentheses = function () {
    let h = '<div class="g4 boxes">';
    const combos = [['+', '+'], ['-', '-'], ['-', '+'], ['+', '-']];
    // lignes 1 et 2 : squelette « … a … b » (mêmes nombres, ordre + puis ordre −)
    [['+'], ['-']].forEach(([o]) => {
      const a = ri(2, 12); let b; do { b = ri(2, 15); } while (b === a);
      combos.forEach(([s1, s2]) => {
        const n = P('(' + sn(s1, a) + ')' + o + '(' + sn(s2, b) + ')');
        const fl = GR.flatten(n);
        h += '<div>' + m(D(n)) + '<div class="ln">' + m('= ' + B(fl[0].s === '-' ? M : '+', 's') + ' ' + A(a) + ' ' + B(GR.sgn(fl[1].s), 's') + ' ' + A(b)) + '</div><div class="ln">' + m('= ' + B(V(n))) + '</div></div>';
      });
    });
    // lignes 3 et 4 : deux soldats, sans aide
    const two = uniq(() => '(' + sn(rs(), ri(1, 15)) + ')' + rs() + '(' + sn(rs(), ri(1, 15)) + ')', 8);
    // ligne 5 : trois soldats
    const three = uniq(() => '(' + sn(rs(), ri(1, 12)) + ')' + rs() + '(' + sn(rs(), ri(1, 12)) + ')' + rs() + '(' + sn(rs(), ri(1, 12)) + ')', 4);
    two.concat(three).forEach((e) => {
      const n = P(e);
      h += '<div>' + m(D(n)) + '<div class="ln">' + m('= ' + B(F(n), 'l')) + '</div><div class="ln">' + m('= ' + B(V(n))) + '</div></div>';
    });
    return h + '</div>';
  };

  build.manoeuvres = function () {
    const lettres = 'BCDEFGH'.split('');
    const exprs = uniq(() => {
      const lvl = pick([1, 1, 2, 2, 3]);
      return GR.generate('manoeuvres', lvl).expr;
    }, lettres.length);
    const ex = P('(-14)+(+16)+(-3)');
    let h = '<p class="note">Exécute les ordres, écris sans parenthèses, puis fais la bataille.</p><div class="g2">';
    h += '<div class="long">' + m('A = ' + D(ex)) + '<div class="ln">' + m('A = <b>' + F(ex) + '</b>') + '</div><div class="ln">' + m('A = <b>16 ' + M + ' 17</b>') + ' <small>(verts 16, rouges 14 + 3)</small></div><div class="ln">' + m('A = <b>' + V(ex) + '</b>') + '</div></div>';
    exprs.forEach((e, i) => {
      const n = P(e);
      const bt = GR.battle(GR.flatten(n));
      const L = lettres[i];
      const duel = bt.G > 0 && bt.R > 0 ? GR.fmtAbs(bt.G) + ' ' + M + ' ' + GR.fmtAbs(bt.R) : bt.G > 0 ? GR.fmtAbs(bt.G) + ' (que des verts)' : M + GR.fmtAbs(bt.R) + ' (que des rouges)';
      h += '<div class="long">' + m(L + ' = ' + D(n)) +
        '<div class="ln">' + m(L + ' = ' + B(F(n), 'xl')) + '</div>' +
        '<div class="ln">' + m(L + ' = ' + B(duel, 'xl')) + '</div>' +
        '<div class="ln">' + m(L + ' = ' + B(V(n), 'l')) + '</div></div>';
    });
    return h + '</div>';
  };

  build.groupe = function () {
    const exprs = uniq(() => GR.generate('groupe', pick([1, 1, 2, 2, 3])).expr, 8);
    let h = '<p class="note">Un ordre donné à une parenthèse s\'adresse à <b>tous</b> les soldats sélectionnés.</p><div class="g2">';
    exprs.forEach((e, i) => {
      const n = P(e);
      h += '<div class="long">' + m(String.fromCharCode(97 + i) + ')  ' + D(n)) + '<div class="ln">' + m('= ' + B(F(n), 'xl')) + '</div><div class="ln">' + m('= ' + B(V(n), 'l')) + '</div></div>';
    });
    return h + '</div>';
  };

  build.contre = function () {
    const exprs = uniq(() => GR.generate('contre', pick([1, 3])).expr, 12);
    let h = '<p class="note">Attention : « moins par moins donne plus » est la règle des <b>produits</b> (×) seulement.</p><div class="g3">';
    exprs.forEach((e) => { const n = P(e); h += '<div>' + m(D(n) + ' = ' + B(V(n))) + '</div>'; });
    return h + '</div>';
  };

  /* ---------- page ---------- */
  function enabled() {
    try { const v = JSON.parse(ls.get('gr-fiche-secs2', 'null')); if (Array.isArray(v)) return v; } catch (e) { /* défaut */ }
    return SECTIONS.map((s) => s.id);
  }

  function render() {
    const serie = Math.max(1, parseInt($('serie').value, 10) || 1);
    corr = $('corrige').checked;
    const url = $('url').value.trim() || DEFAULT_URL;
    const on = enabled();
    let html = '<header class="fh"><div class="t"><h1>La Guerre des relatifs' + (corr ? ' — CORRIGÉ' : '') + '</h1>' +
      '<div class="who">Nom : ……………………………  Prénom : ……………………  Classe : ………  ·  Série n° ' + serie + '</div></div>' +
      '<div class="qr"><div id="qrcode"></div><div><b>Entraîne-toi en ligne</b></div><div class="u">' + url.replace(/^https?:\/\//, '') + '</div></div></header>';
    html += '<div class="memo">' +
      '<div><h3>1. Les soldats</h3><p>Chaque nombre est un soldat. Son signe est la couleur de sa veste : <b class="g">+ vert</b>, <b class="r">' + M + ' rouge</b>.</p></div>' +
      '<div><h3>2. Les ordres</h3><p>Un signe <b>devant une parenthèse</b> est un ordre aux soldats sélectionnés : <b>+</b> fidèles, <b>' + M + '</b> traîtres (ils retournent leur veste).</p></div>' +
      '<div><h3>3. La bataille</h3><p>Force d\'un soldat = son nombre sans le signe. Même couleur : ils s\'allient (forces ajoutées). Couleurs opposées : le plus fort gagne, il lui reste la différence.</p></div>' +
      '<div class="ex">Exemple : ' + M + '6 ' + M + ' (' + M + '7) = ' + M + '6 + 7 = 1  (le traître ' + M + '7 retourne sa veste ; vert 7 contre rouge 6 : les verts gagnent, il leur reste 1).   Piège : ' + M + '3 ' + M + ' 8 = ' + M + '11 (pas de parenthèse, pas d\'ordre : deux rouges qui s\'allient).</div></div>';
    GR.seed(serie * 7919 + 13);
    let num = 0;
    SECTIONS.forEach((s) => {
      const out = build[s.id]();
      if (!on.includes(s.id)) return;
      num++;
      html += '<section class="exo' + (s.id === 'manoeuvres' ? ' split' : '') + '"><h2><u>Exercice ' + num + '</u> — ' + s.t + '</h2>' + out + '</section>';
    });
    html += '<div class="foot">La Guerre des relatifs · série n° ' + serie + ' · bloqué ? Utilise le mode « Aide-moi » du site.</div>';
    GR.seed(null);
    $('page').innerHTML = html;
    $('page').classList.toggle('corrmode', corr);
    const box = $('qrcode');
    if (window.QRCode) {
      try { new window.QRCode(box, { text: url, width: 256, height: 256, correctLevel: window.QRCode.CorrectLevel.M }); }
      catch (e) { box.textContent = 'QR indisponible'; }
    } else {
      box.innerHTML = '<div style="border:1px dashed #999;height:100%;display:grid;place-items:center;font-size:8pt">QR code : connexion internet nécessaire</div>';
    }
  }

  /* ---------- réglages ---------- */
  $('url').value = ls.get('gr-fiche-url', DEFAULT_URL);
  $('serie').value = ls.get('gr-fiche-serie', '1');
  const qs = new URLSearchParams(location.search);
  if (qs.get('serie')) $('serie').value = qs.get('serie');
  if (qs.get('corrige') === '1') $('corrige').checked = true;
  const secs = $('secs');
  const on = enabled();
  SECTIONS.forEach((s) => {
    const l = document.createElement('label');
    l.innerHTML = '<input type="checkbox" value="' + s.id + '"' + (on.includes(s.id) ? ' checked' : '') + '> ' + s.t;
    secs.appendChild(l);
  });
  secs.addEventListener('change', () => {
    ls.set('gr-fiche-secs2', JSON.stringify([...secs.querySelectorAll('input:checked')].map((i) => i.value)));
    render();
  });
  $('url').addEventListener('change', () => { ls.set('gr-fiche-url', $('url').value.trim()); render(); });
  $('serie').addEventListener('change', () => { ls.set('gr-fiche-serie', $('serie').value); render(); });
  $('corrige').addEventListener('change', render);
  $('new').onclick = () => { $('serie').value = ri(2, 9999); ls.set('gr-fiche-serie', $('serie').value); render(); };
  render();
})();
