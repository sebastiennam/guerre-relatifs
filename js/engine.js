/* La Guerre des relatifs — moteur : lecture des calculs, ordres, bataille, diagnostics.
   Modèle :
   - chaque nombre est un soldat ; son signe = la couleur de sa veste (vert +, rouge −) ;
   - un signe devant une parenthèse est un ORDRE donné aux soldats sélectionnés :
     + fidèles (ils gardent leur veste), − traîtres (ils retournent leur veste) ;
   - bataille : la force d'un soldat = son nombre sans le signe ; même couleur = alliance
     (les forces s'additionnent), couleurs opposées = affrontement (il reste la différence). */
(function () {
  'use strict';
  const GR = (window.GR = window.GR || {});
  const MINUS = '−';
  GR.MINUS = MINUS;

  /* ---------- hasard (graine possible pour la fiche) ---------- */
  let _r = Math.random;
  GR.seed = function (s) {
    if (s == null) { _r = Math.random; return; }
    let a = s >>> 0;
    _r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const rand = () => _r();
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const rs = () => (rand() < 0.5 ? '+' : '-');
  const opp = (s) => (s === '+' ? '-' : '+');
  GR.rand = rand; GR.ri = ri; GR.pick = pick; GR.rs = rs; GR.opp = opp;

  /* ---------- nombres ---------- */
  const round = (x) => Math.round(x * 1000) / 1000;
  GR.round = round;
  function fmtAbs(v) { return String(round(Math.abs(v))).replace('.', ','); }
  GR.fmtAbs = fmtAbs;
  GR.fmt = function (v, forceSign) {
    v = round(v);
    if (v === 0) return '0';
    if (v < 0) return MINUS + fmtAbs(v);
    return (forceSign ? '+' : '') + fmtAbs(v);
  };
  GR.sgn = (s) => (s === '-' ? MINUS : '+');

  function GRError(msg) { const e = new Error(msg); e.gr = true; return e; }

  /* ---------- lecture d'un calcul ---------- */
  function tokenize(str) {
    const s = String(str)
      .replace(/[−–—‐‑‒]/g, '-')
      .replace(/[×xX*·•]/g, '*')
      .replace(/÷/g, '/')
      .replace(/[\[{]/g, '(').replace(/[\]}]/g, ')');
    const toks = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.,]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.,]/.test(s[j])) j++;
        const raw = s.slice(i, j);
        const norm = raw.replace(',', '.');
        if ((raw.match(/[.,]/g) || []).length > 1 || /^[.,]$/.test(raw) || !/[0-9]/.test(raw))
          throw GRError('Le nombre « ' + raw + ' » est mal écrit.');
        toks.push({ t: 'n', v: parseFloat(norm) });
        i = j; continue;
      }
      if ('+-()*/='.includes(c)) { toks.push({ t: c }); i++; continue; }
      if (/[a-zA-Z]/.test(c)) throw GRError('Les lettres ne sont pas prises en charge : écris seulement des nombres.');
      throw GRError('Je ne reconnais pas le caractère « ' + c + ' ».');
    }
    return toks;
  }

  GR.parse = function (str) {
    let toks = tokenize(str);
    const eq = toks.findIndex((t) => t.t === '=');
    if (eq >= 0) toks = toks.slice(0, eq);
    if (!toks.length) throw GRError('Écris d\'abord un calcul.');
    let p = 0;
    const peek = () => toks[p];
    const next = () => toks[p++];
    const isSign = (t) => t && (t.t === '+' || t.t === '-');

    function parseAtom() {
      const t = peek();
      if (!t) throw GRError('Le calcul est incomplet : il manque un nombre à la fin.');
      if (t.t === 'n') { next(); return { kind: 'num', s: '+', explicit: false, v: t.v }; }
      if (t.t === '(') {
        next();
        const items = parseSum(true);
        if (!peek() || peek().t !== ')') throw GRError('Il manque une parenthèse fermante « ) ».');
        next();
        return { kind: 'group', order: '+', explicit: false, items };
      }
      if (t.t === ')') throw GRError('Une parenthèse « ) » est mal placée ou en trop.');
      if (t.t === '*') throw GRError('Un signe × est mal placé.');
      if (t.t === '/') throw GRError('Les divisions ne sont pas prises en charge.');
      if (isSign(t)) throw GRError('Deux signes sont collés sans parenthèse : écris par exemple 5 − (−3).');
      throw GRError('Le calcul est incomplet.');
    }

    function parseTerm(sign) {
      const factors = [parseAtom()];
      while (peek() && peek().t === '*') {
        next();
        if (isSign(peek())) throw GRError('Après un ×, mets le nombre négatif entre parenthèses : 3 × (−8).');
        factors.push(parseAtom());
      }
      if (peek() && (peek().t === '(' || peek().t === 'n'))
        throw GRError('Il manque un signe (+, − ou ×) entre deux éléments.');
      if (peek() && peek().t === '/') throw GRError('Les divisions ne sont pas prises en charge.');
      const explicit = sign != null;
      const s = sign || '+';
      if (factors.length > 1) return { kind: 'prod', s, explicit, factors };
      const a = factors[0];
      if (a.kind === 'group') { a.order = s; a.explicit = explicit; return a; }
      a.s = s; a.explicit = explicit;
      return a;
    }

    function parseSum(inside) {
      const items = [];
      while (p < toks.length && peek().t !== ')') {
        let sign = null;
        if (isSign(peek())) {
          sign = next().t;
          if (isSign(peek())) throw GRError('Deux signes sont collés sans parenthèse : écris par exemple 5 − (−3).');
        } else if (items.length > 0) {
          throw GRError('Il manque un signe + ou − entre deux nombres.');
        }
        items.push(parseTerm(sign));
      }
      if (!items.length) throw GRError(inside ? 'Une parenthèse est vide.' : 'Écris d\'abord un calcul.');
      return items;
    }

    const items = parseSum(false);
    if (p < toks.length) throw GRError('Une parenthèse « ) » est en trop.');
    const root = { kind: 'sum', items };
    root.hasGroup = JSON.stringify(root).includes('"group"');
    root.hasProd = JSON.stringify(root).includes('"prod"');
    return root;
  };

  GR.tryParse = function (str) {
    try { return { node: GR.parse(str) }; }
    catch (e) { if (e.gr) return { error: e.message }; throw e; }
  };

  /* ---------- valeur ---------- */
  function val(n) {
    switch (n.kind) {
      case 'num': return n.s === '-' ? -n.v : n.v;
      case 'group': { const x = n.items.reduce((a, b) => a + val(b), 0); return n.order === '-' ? -x : x; }
      case 'prod': { const x = n.factors.reduce((a, f) => a * val(f), 1); return n.s === '-' ? -x : x; }
      case 'sum': return n.items.reduce((a, b) => a + val(b), 0);
    }
    return 0;
  }
  GR.val = (n) => round(val(n));

  /* ---------- écriture ---------- */
  function termStr(n, first) {
    let body;
    if (n.kind === 'num') body = fmtAbs(n.v);
    else if (n.kind === 'group') body = '(' + itemsStr(n.items, true) + ')';
    else body = n.factors.map((f) => (f.kind === 'group' ? '(' + itemsStr(f.items, true) + ')' : fmtAbs(f.v))).join(' × ');
    const s = n.kind === 'group' ? n.order : n.s;
    if (first) return n.explicit ? GR.sgn(s) + body : body;
    return ' ' + GR.sgn(s) + ' ' + body;
  }
  function itemsStr(items, inner) {
    return items.map((n, i) => {
      if (i === 0 && inner && n.explicit && items.length === 1) return termStr(n, true);
      return termStr(n, i === 0);
    }).join('');
  }
  GR.str = function (node) { return node.kind === 'sum' ? itemsStr(node.items, false) : termStr(node, true); };

  /* ---------- exécuter les ordres (supprimer les parenthèses) ---------- */
  // mode : 'ok' (correct), 'ignore' (ordres − ignorés), 'first' (ordre appliqué au 1er soldat seulement)
  function flatten(items, flip, ctx, mode, out) {
    items.forEach((n, i) => {
      if (n.kind === 'num') {
        let f = flip;
        if (mode === 'first' && ctx && ctx.firstOnly && i > 0) f = ctx.outerFlip;
        out.push({ s: f ? opp(n.s) : n.s, v: n.v, orig: n.s, flipped: f, group: ctx ? ctx.node : null, order: ctx ? ctx.node.order : null });
      } else if (n.kind === 'group') {
        let inner = flip;
        if (n.order === '-' && mode !== 'ignore') inner = !flip;
        const c = { node: n, firstOnly: mode === 'first' && n.order === '-' && n.items.length > 1, outerFlip: flip };
        flatten(n.items, inner, c, mode, out);
      } else {
        throw GRError('prod');
      }
    });
    return out;
  }
  GR.flatten = function (node, mode) { return flatten(node.items, false, null, mode || 'ok', []); };
  GR.flatStr = function (list) {
    return list.map((t, i) => (i === 0 ? (t.s === '-' ? MINUS : '') + fmtAbs(t.v) : ' ' + GR.sgn(t.s) + ' ' + fmtAbs(t.v))).join('');
  };
  GR.flatVal = (list) => round(list.reduce((a, t) => a + (t.s === '-' ? -t.v : t.v), 0));

  /* ---------- bataille ---------- */
  GR.battle = function (list) {
    const G = round(list.filter((t) => t.s === '+').reduce((a, t) => a + t.v, 0));
    const R = round(list.filter((t) => t.s === '-').reduce((a, t) => a + t.v, 0));
    return { G, R, res: round(G - R) };
  };
  GR.phrase = function (G, R) {
    if (G === 0 && R === 0) return 'Personne sur le terrain → 0';
    if (R === 0) return 'Une seule armée, verte, de force ' + fmtAbs(G) + ' → ' + GR.fmt(G, true);
    if (G === 0) return 'Une seule armée, rouge, de force ' + fmtAbs(R) + ' → ' + GR.fmt(-R);
    const d = round(Math.abs(G - R));
    const duel = 'Armée verte ' + fmtAbs(G) + ' contre armée rouge ' + fmtAbs(R);
    if (G === R) return duel + ' → forces égales, tout s\'annule → 0';
    return duel + ' → les ' + (G > R ? 'verts' : 'rouges') + ' gagnent, il leur reste ' + fmtAbs(d) + ' → ' + GR.fmt(G - R, true);
  };

  /* ---------- réponses de l'élève ---------- */
  GR.readNumber = function (str) {
    const s = String(str).trim().replace(/[−–—]/g, '-').replace(/\s/g, '').replace(',', '.');
    if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
    return round(parseFloat(s));
  };

  // Vérifie une ligne « sans parenthèses » écrite par l'élève
  GR.checkSimplified = function (node, str) {
    const r = GR.tryParse(str);
    if (r.error) return { ok: false, msg: r.error };
    const st = r.node;
    if (st.hasProd) return { ok: false, msg: 'Il ne doit pas y avoir de × dans cette ligne.' };
    if (st.hasGroup) return { ok: false, msg: 'Il reste des parenthèses : exécute les ordres, puis enlève les parenthèses.' };
    const expected = GR.flatten(node);
    const mine = GR.flatten(st);
    if (mine.length === 1 && expected.length > 1 && round(GR.flatVal(mine)) === GR.val(node))
      return { ok: false, soft: true, msg: 'Bonne valeur ! Mais écris d\'abord la ligne sans parenthèses : chaque soldat avec sa couleur.' };
    const key = (t) => (t.s === '-' ? -1 : 1) * round(t.v);
    const pool = mine.map(key);
    const missing = [];
    expected.forEach((t) => {
      const k = key(t);
      const idx = pool.indexOf(k);
      if (idx >= 0) pool.splice(idx, 1); else missing.push(t);
    });
    if (!missing.length && !pool.length) return { ok: true };
    const t = missing[0];
    if (t) {
      const lbl = GR.fmt(t.orig === '-' ? -t.v : t.v, true);
      if (t.group && t.order === '-' && pool.includes(-key(t)) === false && pool.includes((t.orig === '-' ? -1 : 1) * round(t.v)))
        return { ok: false, msg: 'Le soldat ' + lbl + ' est sélectionné avec l\'ordre « − » : c\'est un traître, il doit retourner sa veste.' };
      if (t.group && t.order === '-' && t.group.items.length > 1)
        return { ok: false, msg: 'L\'ordre « − » s\'adresse à TOUS les soldats de la parenthèse : chacun retourne sa veste.' };
      if (t.group && t.order === '-')
        return { ok: false, msg: 'Regarde le soldat ' + lbl + ' : l\'ordre devant sa parenthèse est « − ». Traître → il retourne sa veste.' };
      if (t.group && t.order === '+')
        return { ok: false, msg: 'Le soldat ' + lbl + ' reçoit l\'ordre « + » : il est fidèle, il garde sa veste.' };
      return { ok: false, msg: 'Le soldat ' + lbl + ' n\'est pas dans une parenthèse : personne ne lui donne d\'ordre, il garde sa veste.' };
    }
    return { ok: false, msg: 'Il y a un soldat en trop dans ta ligne. Recompte les soldats.' };
  };

  // Cherche l'erreur probable derrière une réponse fausse (sans donner la bonne réponse)
  GR.diagnose = function (node, ans) {
    const good = GR.val(node);
    if (ans === good) return null;
    if (node.hasProd) {
      const prods = node.items.filter((n) => n.kind === 'prod');
      if (node.items.length === 1 && prods.length === 1) {
        const p = prods[0];
        const absProd = round(Math.abs(good));
        const sumVal = round(p.factors.reduce((a, f) => a + val(f), 0) * (p.s === '-' ? -1 : 1));
        if (ans === sumVal) return 'C\'est un produit (×), pas une bataille : on ne fait pas s\'affronter les soldats, on multiplie.';
        if (round(Math.abs(ans)) === absProd) return 'La valeur est bonne, mais le signe non. Produit : compte les signes « − ». Nombre pair → +, nombre impair → −.';
        return 'Produit : multiplie les nombres sans les signes, puis décide du signe avec la règle des signes.';
      }
      return 'Il y a des produits : calcule d\'abord chaque produit (priorité), puis fais la bataille.';
    }
    const flat = GR.flatten(node);
    const b = GR.battle(flat);
    if (node.hasGroup) {
      const ig = GR.flatVal(GR.flatten(node, 'ignore'));
      if (ig !== good && ans === ig) return 'As-tu exécuté les ordres ? Un « − » devant une parenthèse est un ordre : les soldats sélectionnés sont des traîtres, ils retournent leur veste.';
      const fo = GR.flatVal(GR.flatten(node, 'first'));
      if (fo !== good && ans === fo) return 'L\'ordre « − » s\'adresse à TOUS les soldats de la parenthèse, pas seulement au premier.';
    }
    if (ans === round(-good)) {
      if (b.G === 0 || b.R === 0) {
        if (b.R > 0) return 'Ils sont tous rouges : ils s\'allient, l\'armée reste rouge. Attention : « deux moins font plus », c\'est seulement pour les produits (×) !';
        return 'Ils sont tous verts : ils s\'allient, l\'armée reste verte.';
      }
      return 'La bonne force restante, mais pas la bonne couleur. Quelle armée est la plus forte ?';
    }
    if (b.G > 0 && b.R > 0 && (ans === round(b.G + b.R) || ans === round(-(b.G + b.R))))
      return 'Les verts et les rouges ne s\'allient pas : ils s\'affrontent et s\'annulent. Cherche ce qu\'il reste à l\'armée la plus forte, n\'ajoute pas les deux forces.';
    const absFirst = flat.length === 2 ? round(flat[0].v + (flat[1].s === '+' ? flat[1].v : -flat[1].v)) : null;
    if (flat.length === 2 && flat[0].s === '-' && ans === absFirst) return 'Regarde bien le premier soldat : il porte une veste rouge (il est négatif).';
    if (flat.length > 2) return 'Range les soldats : additionne tous les verts, additionne tous les rouges, puis fais une seule bataille.';
    return 'Recompte : de quelle couleur est chaque soldat ? Puis : même couleur → alliance, couleurs opposées → ils s\'annulent.';
  };

  /* ---------- indices méthodologiques (ne donnent pas la réponse) ---------- */
  GR.hints = function (node) {
    const H = [];
    if (node.hasProd) {
      const only = node.items.length === 1 && node.items[0].kind === 'prod';
      if (only) {
        H.push({ t: 'C\'est un produit (×)', d: 'Ce n\'est pas une bataille ! Pour un produit, on utilise la règle des signes.' });
        H.push({ t: '1. Les nombres', d: 'Multiplie les nombres sans t\'occuper des signes.' });
        H.push({ t: '2. Le signe', d: 'Compte les signes « − » des facteurs. Nombre pair de « − » → résultat positif. Nombre impair → résultat négatif.' });
      } else {
        H.push({ t: 'Priorité aux produits', d: 'Il y a des × et des + ou − : calcule d\'abord chaque produit avec la règle des signes.' });
        H.push({ t: 'Ensuite, la bataille', d: 'Une fois les produits remplacés par leur résultat, fais la bataille : même couleur → alliance, couleurs opposées → ils s\'annulent.' });
      }
      return H;
    }
    const groups = [];
    (function walk(items) { items.forEach((n) => { if (n.kind === 'group') { groups.push(n); walk(n.items); } }); })(node.items);
    const imp = [];
    (function walk(items) { items.forEach((n, i) => { if (n.kind === 'num' && i === 0 && !n.explicit) imp.push(n); if (n.kind === 'group') walk(n.items); }); })(node.items);
    if (imp.length) {
      const v = imp.map((n) => fmtAbs(n.v));
      H.push({ t: 'Et le nombre sans signe ?', d: (v.length > 1 ? 'Les nombres ' + v.join(' et ') + ' n\'ont' : 'Le ' + v[0] + ' n\'a') + ' pas de signe écrit : un nombre <b>sans signe est positif</b>, sa veste est verte. Le « + » est sous-entendu : ' + v[0] + ' = +' + v[0] + '. Le signe qui suit appartient au soldat suivant.' });
    }
    if (groups.length) {
      H.push({ t: 'Étape 1 — Exécuter les ordres', d: 'Il y a ' + groups.length + ' parenthèse' + (groups.length > 1 ? 's' : '') + '. Une parenthèse sélectionne des soldats ; le signe juste devant est l\'ordre qu\'on leur donne.' });
      groups.forEach((g) => {
        const inside = '(' + itemsStr(g.items, true) + ')';
        const many = g.items.length > 1;
        if (g.order === '-') H.push({ t: GR.sgn('-') + inside, d: 'L\'ordre est « − » : ' + (many ? 'tous ces soldats sont des traîtres. Chacun' : 'ce soldat est un traître. Il') + ' retourne sa veste. De quelle couleur devient-elle ?', order: '-' });
        else if (g.explicit) H.push({ t: '+' + inside, d: 'L\'ordre est « + » : ' + (many ? 'ces soldats sont fidèles, ils gardent' : 'ce soldat est fidèle, il garde') + ' sa veste.', order: '+' });
        else H.push({ t: inside, d: 'Pas d\'ordre devant : ' + (many ? 'ces soldats gardent' : 'ce soldat garde') + ' sa veste.', order: '+' });
      });
      H.push({ t: 'Puis', d: 'L\'ordre exécuté, la sélection disparaît : écris la ligne sans parenthèses, chaque soldat avec la couleur de sa veste.' });
    } else {
      const flat = GR.flatten(node);
      const consecutiveMinus = flat.some((t, i) => i > 0 && t.s === '-' && flat[i - 1].s === '-');
      H.push({ t: 'Pas de parenthèse', d: 'Personne ne reçoit d\'ordre : chaque signe est simplement la couleur de la veste du soldat qui le suit.' });
      if (consecutiveMinus) H.push({ t: 'Attention, piège !', d: 'Deux « − » à la suite ne donnent pas « + » ici : chacun appartient à un soldat différent. « Moins par moins », c\'est seulement pour les produits (×).', warn: true });
    }
    const flat = GR.flatten(node);
    if (flat.length > 2) H.push({ t: (groups.length ? 'Étape 2 — ' : '') + 'La bataille', d: 'Les verts s\'allient : additionne leurs forces. Les rouges s\'allient : additionne leurs forces. Puis fais une seule bataille entre les deux armées.' });
    else H.push({ t: (groups.length ? 'Étape 2 — ' : '') + 'La bataille', d: 'Même couleur → ils s\'allient : leurs forces s\'additionnent. Couleurs opposées → ils s\'affrontent : la plus forte gagne, il lui reste la différence des forces.' });
    H.push({ t: 'Conclure', d: 'Le résultat a la couleur (le signe) de l\'armée qui gagne.' });
    return H;
  };

  /* ---------- générateurs d'exercices ---------- */
  const dec1 = (max) => { let v; do { v = ri(1, max * 10) / 10; } while (Number.isInteger(v)); return v; };
  const A = (v) => String(v).replace('.', ','); // nombre en texte
  const sn = (s, v) => (s === '-' ? '-' : '+') + A(v); // soldat signé explicite
  const first = (s, v) => (s === '-' ? '-' : '') + A(v);
  const mixedPair = () => (rand() < 0.65 ? pick([['+', '-'], ['-', '+']]) : pick([['+', '+'], ['-', '-']]));
  const numPick = (lvlMax, decProb) => (rand() < (decProb || 0) ? dec1(Math.min(lvlMax, 20)) : ri(1, lvlMax));

  function build(expr, extra) {
    const node = GR.parse(expr);
    const q = Object.assign({ expr, node, display: GR.str(node), answer: GR.val(node) }, extra || {});
    if (!node.hasProd) q.flat = GR.flatten(node);
    return q;
  }

  const gen = {};
  // 1. Bataille : écriture simplifiée, 2 soldats
  gen.bataille = function (lvl) {
    const max = [10, 20, 99][lvl - 1];
    const min = lvl === 3 ? 10 : 1;
    const [s1, s2] = mixedPair();
    const a = ri(min, max), b = ri(min, max);
    return build(first(s1, a) + ' ' + s2 + ' ' + A(b), { kind: 'result', showSquares: lvl === 1, label: 'Calcule' });
  };
  // 2. Les ordres : un seul soldat sélectionné
  gen.ordres = function (lvl) {
    if (lvl === 3 && rand() < 0.4) {
      const o1 = rs(), o2 = rs(), s = rs(), v = ri(1, 20);
      return build(o1 + '(' + o2 + '(' + sn(s, v) + '))', { kind: 'result', label: 'Exécute les ordres' });
    }
    const v = lvl === 1 ? ri(1, 10) : lvl === 2 ? ri(1, 50) : (rand() < 0.5 ? dec1(20) : ri(1, 99));
    return build(rs() + '(' + sn(rs(), v) + ')', { kind: 'result', label: 'Exécute l\'ordre : quel soldat sort ?' });
  };
  // 3. Fidèles et traîtres : 2 soldats avec parenthèses
  gen.fideles = function (lvl) {
    const [s1, s2] = mixedPair();
    if (lvl === 1) return build('(' + sn(s1, ri(1, 12)) + ')+(' + sn(s2, ri(1, 12)) + ')', { kind: 'twostep', label: 'Supprime les parenthèses, puis calcule' });
    if (lvl === 2) return build('(' + sn(s1, ri(1, 15)) + ')' + rs() + '(' + sn(s2, ri(1, 15)) + ')', { kind: 'twostep', label: 'Supprime les parenthèses, puis calcule' });
    const a = numPick(30, 0.3), b = numPick(30, 0.3);
    const o = rand() < 0.7 ? '-' : '+';
    const e = rand() < 0.5 ? first(s1, a) + o + '(' + sn(s2, b) + ')' : '(' + sn(s1, a) + ')' + o + '(' + sn(s2, b) + ')';
    return build(e, { kind: 'twostep', label: 'Supprime les parenthèses, puis calcule' });
  };
  // 4. Longues batailles : plusieurs soldats sans parenthèses
  gen.longues = function (lvl) {
    const n = [3, 4, 5][lvl - 1];
    const max = [10, 20, 50][lvl - 1];
    let e = '';
    let signs;
    do { signs = Array.from({ length: n }, rs); } while (new Set(signs).size < 2 && rand() < 0.85);
    for (let i = 0; i < n; i++) {
      const v = numPick(max, lvl === 3 ? 0.35 : 0);
      e += i === 0 ? first(signs[i], v) : signs[i] + A(v);
    }
    return build(e, { kind: 'result', label: 'Calcule' });
  };
  // 5. Déguisements : réécrire une écriture simplifiée avec parenthèses
  gen.deguise = function (lvl) {
    const [s1, s2] = mixedPair();
    const a = ri(1, lvl === 3 ? 20 : 12), b = ri(1, lvl === 3 ? 20 : 12);
    const flat = first(s1, a) + ' ' + s2 + ' ' + A(b);
    const left = GR.str(GR.parse(flat));
    const firstS = '(' + GR.sgn(s1) + A(a) + ')';
    let mode = lvl === 1 ? 'plus' : lvl === 2 ? 'moins' : pick(['plus', 'moins', 'ordre']);
    if (mode === 'plus') {
      const miss = s2 === '-' ? -b : b;
      return { kind: 'deguise', expr: flat, full: '(' + sn(s1, a) + ')+(' + sn(miss < 0 ? '-' : '+', b) + ')', display: left + ' = ' + firstS + ' + ( … )', answer: miss, label: 'Quel soldat est caché ? (avec sa couleur)', expl: 'Ordre « + » : le soldat est fidèle, il porte déjà la bonne veste : ' + GR.fmt(miss, true) + '.' };
    }
    if (mode === 'moins') {
      const miss = s2 === '-' ? b : -b;
      return { kind: 'deguise', expr: flat, full: '(' + sn(s1, a) + ')-(' + sn(miss < 0 ? '-' : '+', b) + ')', display: left + ' = ' + firstS + ' ' + MINUS + ' ( … )', answer: miss, label: 'Quel soldat est caché ? (avec sa couleur)', expl: 'Ordre « − » : le soldat est un traître, il porte la veste de l\'autre couleur : ' + GR.fmt(miss, true) + ' (en retournant sa veste, il redevient ' + GR.fmt(s2 === '-' ? -b : b, true) + ').' };
    }
    const shown = rs();
    const inner = shown === s2 ? '+' : '-';
    const ordreRep = shown === s2 ? '+' : '-';
    return { kind: 'deguise-ordre', expr: flat, full: '(' + sn(s1, a) + ')' + ordreRep + '(' + sn(shown, b) + ')', display: left + ' = ' + firstS + ' … (' + GR.sgn(shown) + A(b) + ')', answer: ordreRep, label: 'Quel ordre faut-il donner ?', expl: (ordreRep === '+' ? 'Le soldat porte déjà la bonne veste : il doit rester fidèle → ordre « + ».' : 'Le soldat porte la mauvaise veste : il doit la retourner → ordre « − ».'), inner };
  };
  // 6. Grandes manœuvres : longues expressions avec parenthèses
  gen.manoeuvres = function (lvl) {
    const n = lvl === 1 ? 3 : lvl === 2 ? 4 : ri(4, 5);
    const max = lvl === 1 ? 12 : lvl === 2 ? 20 : 25;
    let e = '';
    for (let i = 0; i < n; i++) {
      const v = numPick(max, lvl === 3 ? 0.3 : 0);
      const s = rs();
      const bare = lvl === 3 && rand() < 0.3;
      if (i === 0) e += bare ? first(s, v) : '(' + sn(s, v) + ')';
      else e += bare ? s + A(v) : rs() + '(' + sn(s, v) + ')';
    }
    return build(e, { kind: 'twostep', label: 'Supprime les parenthèses, puis calcule' });
  };
  // 7. Sélection de groupe (4e) : plusieurs soldats dans une parenthèse
  gen.groupe = function (lvl) {
    const g2 = (max, signedFirst) => {
      const s1 = signedFirst ? rs() : '+';
      return (signedFirst && s1 === '-' ? '-' : '') + A(ri(1, max)) + rs() + A(ri(1, max));
    };
    let e;
    if (lvl === 1) {
      const o = rand() < 0.75 ? '-' : '+';
      e = rand() < 0.5 ? A(ri(1, 15)) + o + '(' + g2(12) + ')' : o + '(' + g2(12) + ')' + rs() + A(ri(1, 15));
      if (e[0] === '+') e = e.slice(1);
    } else if (lvl === 2) {
      e = '(' + g2(15, true) + ')' + pick(['-', '-', '+']) + '(' + g2(15, true) + ')';
    } else {
      e = pick([
        () => first(rs(), ri(1, 20)) + '-(' + g2(15, true) + rs() + A(ri(1, 15)) + ')',
        () => '-(' + first(rs(), ri(1, 15)) + '-(' + sn(rs(), ri(1, 15)) + '))' + rs() + A(ri(1, 15)),
        () => first(rs(), ri(1, 20)) + '-(' + g2(15, true) + ')+(' + g2(15, true) + ')',
      ])();
    }
    return build(e, { kind: 'twostep', label: 'Supprime les parenthèses, puis calcule' });
  };
  // 8. Contre-espionnage : sommes ou produits ?
  function prodExpr(max) {
    const a = ri(2, max), b = ri(2, max), s1 = rs(), s2 = rs();
    return (s1 === '-' ? pick(['-' + a, '(-' + a + ')']) : pick([String(a), '(+' + a + ')'])) + '*' + (s2 === '-' ? '(-' + b + ')' : pick([String(b), '(+' + b + ')']));
  }
  function sumExpr(max) {
    const [s1, s2] = rand() < 0.5 ? ['-', '-'] : mixedPair();
    return pick([
      () => first(s1, ri(1, max)) + s2 + A(ri(1, max)),
      () => '(' + sn(s1, ri(1, max)) + ')' + rs() + '(' + sn(s2, ri(1, max)) + ')',
    ])();
  }
  gen.contre = function (lvl) {
    if (lvl === 2) return gen.vraifaux();
    const isProd = rand() < 0.5;
    const e = isProd ? prodExpr(lvl === 1 ? 9 : 12) : (lvl === 1 ? first(rs(), ri(1, 12)) + rs() + A(ri(1, 12)) : sumExpr(15));
    return build(e, { kind: 'switch', isProd, label: 'Bataille ou règle des signes ? Puis calcule' });
  };
  gen.vraifaux = function () {
    const type = ri(1, 6);
    let e, shown, why;
    const a = ri(2, 12), b = ri(2, 12);
    if (type === 1) { e = '-' + a + '-' + b; why = 'two-minus'; }
    else if (type === 2) { e = '(-' + a + ')*(-' + b + ')'; why = 'prod-as-sum'; }
    else if (type === 3) { e = '-' + a + '+' + b; why = 'added'; }
    else if (type === 4) { e = '-(-' + a + ')'; why = 'order'; }
    else if (type === 5) { e = a + '-(-' + b + ')'; why = 'order2'; }
    else { e = '-' + a + '*' + b; why = 'prod-sign'; }
    const node = GR.parse(e);
    const good = GR.val(node);
    const truth = rand() < 0.45;
    if (truth) shown = good;
    else {
      if (why === 'two-minus') shown = a + b;
      else if (why === 'prod-as-sum') shown = -(a + b);
      else if (why === 'added') shown = -(a + b);
      else if (why === 'order') shown = -a;
      else if (why === 'order2') shown = a - b === good ? good + 2 : a - b;
      else shown = a * b;
      if (shown === good) shown = -good || good + 1;
    }
    const q = { kind: 'vf', expr: e, node, display: GR.str(node) + ' = ' + GR.fmt(shown), answer: shown === good, shown, good, label: 'Vrai ou faux ?' };
    q.expl = shown === good ? 'C\'est juste : ' + GR.str(node) + ' = ' + GR.fmt(good) + '.' : (GR.diagnose(node, shown) || '') + ' La bonne réponse est ' + GR.fmt(good) + '.';
    return q;
  };

  GR.MISSIONS = [
    { id: 'bataille', n: 1, titre: 'La bataille', ex: GR.MINUS + '6 + 7', desc: 'Deux soldats face à face, sans parenthèses.', lv: ['Jusqu\'à 10, soldats visibles', 'Jusqu\'à 20', 'Grandes armées (jusqu\'à 99)'] },
    { id: 'ordres', n: 2, titre: 'Les ordres', ex: GR.MINUS + '(' + GR.MINUS + '5)', desc: 'Un soldat sélectionné reçoit un ordre : fidèle ou traître ?', lv: ['Jusqu\'à 10', 'Jusqu\'à 50', 'Décimaux et doubles ordres'] },
    { id: 'fideles', n: 3, titre: 'Fidèles et traîtres', ex: '(+7) ' + GR.MINUS + ' (' + GR.MINUS + '8)', desc: 'Exécuter les ordres, enlever les parenthèses, puis la bataille.', lv: ['Seulement des ordres +', 'Ordres + et ' + GR.MINUS, 'Sans 1re parenthèse, décimaux'] },
    { id: 'longues', n: 4, titre: 'Longues batailles', ex: GR.MINUS + '3 ' + GR.MINUS + ' 8 + 5 ' + GR.MINUS + ' 2', desc: 'Beaucoup de soldats : on range les verts et les rouges.', lv: ['3 soldats', '4 soldats', '5 soldats, décimaux'] },
    { id: 'deguise', n: 5, titre: 'Déguisements', ex: '7 ' + GR.MINUS + ' 8 = (+7) ' + GR.MINUS + ' ( … )', desc: 'Chemin inverse : retrouver le soldat caché dans les parenthèses.', lv: ['Ordre +', 'Ordre ' + GR.MINUS, 'Trouver l\'ordre'] },
    { id: 'manoeuvres', n: 6, titre: 'Grandes manœuvres', ex: '(+2) ' + GR.MINUS + ' (' + GR.MINUS + '8) + (' + GR.MINUS + '6)', desc: 'Longues expressions avec plusieurs parenthèses.', lv: ['3 parenthèses', '4 parenthèses', 'Mélangé, décimaux'] },
    { id: 'groupe', n: 7, titre: 'Sélection de groupe', ex: '5 ' + GR.MINUS + ' (3 ' + GR.MINUS + ' 8)', desc: 'Révisions 4e : un ordre pour plusieurs soldats à la fois.', lv: ['Une parenthèse', 'Deux parenthèses', 'Parenthèses imbriquées'] },
    { id: 'contre', n: 8, titre: 'Contre-espionnage', ex: GR.MINUS + '3 ' + GR.MINUS + ' 8  ou  (' + GR.MINUS + '3) × (' + GR.MINUS + '8) ?', desc: 'Sommes et produits mélangés : ne pas se faire piéger.', lv: ['Bataille ou produit ?', 'Vrai ou faux : les pièges', 'Tout mélangé'] },
  ];

  GR.generate = function (mission, lvl) {
    for (let k = 0; k < 30; k++) {
      try {
        const q = gen[mission](lvl);
        q.mission = mission; q.level = lvl;
        if (q.node && !q.node.hasProd && q.flat && q.flat.length >= 2 && mission === 'bataille' && q.flat[0].v === q.flat[1].v && rand() < 0.7) continue;
        return q;
      } catch (e) { if (!e.gr) throw e; }
    }
    return gen.bataille(1);
  };
  GR._gen = gen;
})();
