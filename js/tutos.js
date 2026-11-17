/* La Guerre des relatifs — tutoriels animés de chaque mission (courts : 1 à 3 diapositives).
   Chaque diapositive : t (titre), d (texte), expr (calcul animé), until (dernière étape jouée),
   rev / hideOrder (chemin inverse de la mission Déguisements), html (diapo sans animation). */
(function () {
  'use strict';
  const GR = window.GR;
  const M = GR.MINUS;

  GR.DEMOS = {
    bataille: '-6+7', ordres: '-(-5)', fideles: '(+7)-(-8)', longues: '-3-8+5-2',
    deguise: '(+7)-(+8)', manoeuvres: '(+2)-(-8)+(-6)', groupe: '5-(3-8)', contre: '(-3)*(-8)',
  };

  GR.TUTOS = {
    bataille: [
      { t: 'Chaque nombre est un soldat', d: 'Son signe est la <b>couleur de sa veste</b> : <b class="tg">vert +</b>, <b class="tr">rouge ' + M + '</b>. Sans signe écrit, il est <b>positif</b> : dans 6 ' + M + ' 4, le 6 est un +6.', expr: '6-4', until: 'implicit' },
      { t: 'Même couleur : ils s\'allient', d: M + '3 ' + M + ' 8 : deux rouges, leurs forces s\'additionnent → <b>' + M + '11</b>.', expr: '-3-8', until: 'result' },
      { t: 'Couleurs opposées : bataille', d: M + '6 + 7 : le plus fort gagne, il lui reste la différence → <b>+1</b>.', expr: '-6+7', until: 'result' },
    ],
    ordres: [
      { t: 'Ordre + : fidèle', d: 'La parenthèse <b>sélectionne</b> un soldat, le signe devant est un <b>ordre</b>. Ordre + : il garde sa veste. +(' + M + '5) = <b>' + M + '5</b>.', expr: '+(-5)', until: 'result' },
      { t: 'Ordre ' + M + ' : traître', d: 'Ordre ' + M + ' : il <b>retourne sa veste</b>. ' + M + '(' + M + '5) = <b>+5</b>. Sans parenthèse, pas d\'ordre : le signe est juste une couleur.', expr: '-(-5)', until: 'result' },
    ],
    fideles: [
      { t: 'Les ordres, puis la bataille', d: '<b>1.</b> On exécute les ordres : la sélection disparaît, on écrit 7 + 8. <b>2.</b> On fait la bataille : <b>15</b>.', expr: '(+7)-(-8)', until: 'result' },
    ],
    longues: [
      { t: 'Beaucoup de soldats', d: 'On range les verts et les rouges, chaque camp s\'allie, puis <b>une seule bataille</b> : rouges 13 contre vert 5 → <b>' + M + '8</b>.', expr: '-3-8+5-2', until: 'result' },
    ],
    // Chemin inverse : on part du calcul sans parenthèses et on retrouve l'écriture avec parenthèses
    deguise: [
      { t: 'Ordre + : la même veste', d: 'Cette fois, on part du calcul (en haut) pour retrouver le soldat caché (en bas). Ordre <b>+</b> : il garde sa veste, il porte donc <b>déjà</b> la bonne : <b>' + M + '8</b>.', expr: '(+7)+(-8)', rev: true },
      { t: 'Ordre ' + M + ' : la veste opposée', d: 'Ordre <b>' + M + '</b> : il va retourner sa veste. Pour être rouge <b>après</b>, il est vert <b>avant</b> : <b>+8</b>.', expr: '(+7)-(+8)', rev: true },
      { t: 'Niveau 3 : l\'ordre est caché', d: 'Le soldat porte une veste rouge, il en faut une verte : il doit la retourner → ordre <b>' + M + '</b>.', expr: '(-4)-(-6)', rev: true, hideOrder: true },
    ],
    manoeuvres: [
      { t: 'Plusieurs ordres', d: 'Chaque parenthèse a <b>son propre ordre</b>. On les exécute tous (2 + 8 ' + M + ' 6), puis la bataille : <b>+4</b>.', expr: '(+2)-(-8)+(-6)', until: 'result' },
    ],
    groupe: [
      { t: 'Un ordre pour plusieurs soldats', d: 'La parenthèse sélectionne le 3 (+3) et le ' + M + '8. L\'ordre ' + M + ' vaut pour <b>tous</b> : 5 ' + M + ' 3 + 8 = <b>10</b>.', expr: '5-(3-8)', until: 'result' },
    ],
    contre: [
      { t: 'Une somme : la bataille', d: M + '3 ' + M + ' 8 : deux rouges s\'allient → <b>' + M + '11</b>. Ici, deux « ' + M + ' » ne donnent <b>pas</b> « + » !', expr: '-3-8', until: 'result' },
      { t: 'Un produit : la règle des signes', d: 'Un <b>×</b> ? C\'est un produit : on multiplie les forces, et chaque facteur négatif retourne la veste du résultat → <b>+24</b>.', expr: '(-3)*(-8)', until: 'product' },
    ],
  };
})();
