/* La Guerre des relatifs — tutoriels animés de chaque mission.
   Chaque diapositive : t (titre), d (texte), expr (calcul animé, repris de la diapo précédente si absent),
   until (dernière étape jouée : lineup, orders, camps, alliance, clash, result, product), html (diapo sans animation). */
(function () {
  'use strict';
  const GR = window.GR;
  const M = GR.MINUS;
  const steps = (arr) => '<ol class="tsteps">' + arr.map((x) => '<li>' + x + '</li>').join('') + '</ol>';

  GR.DEMOS = {
    bataille: '-6+7', ordres: '-(-5)', fideles: '(+7)-(-8)', longues: '-3-8+5-2',
    deguise: '(+7)-(+8)', manoeuvres: '(+2)-(-8)+(-6)', groupe: '5-(3-8)', contre: '(-3)*(-8)',
  };

  GR.TUTOS = {
    bataille: [
      { t: 'Chaque nombre est un soldat', d: 'Le <b>signe</b> du nombre, c\'est la <b>couleur de sa veste</b> : <b class="tg">vert pour +</b>, <b class="tr">rouge pour ' + M + '</b>. Le nombre sans son signe, c\'est sa <b>force</b>.', expr: '-4+6-2', until: 'lineup' },
      { t: 'Et quand il n\'y a pas de signe ?', d: 'Dans 6 + 4, le 6 n\'a <b>pas de signe écrit</b>. Un nombre sans signe est <b>positif</b> : sa veste est verte, c\'est +6. On ne l\'écrit pas en début de calcul, mais il est bien là (en transparent sur sa veste). Et le « + » entre les deux ? Il <b>appartient au 4</b> : c\'est la couleur de sa veste. <i>Touche le 6 pour vérifier.</i>', expr: '6+4', until: 'result' },
      { t: 'Même couleur : ils s\'allient', d: 'Deux soldats rouges ne se battent pas : ils <b>s\'allient</b> et leurs forces s\'additionnent. ' + M + '3 ' + M + ' 8, c\'est une armée rouge de force 11 : <b>' + M + '11</b>.', expr: '-3-8', until: 'result' },
      { t: 'Couleurs opposées : bataille !', d: 'Un vert et un rouge <b>s\'affrontent</b>. Le plus fort gagne, et il lui reste la <b>différence des forces</b>. ' + M + '6 + 7 : le vert (7) bat le rouge (6), il lui reste 1 : <b>+1</b>.', expr: '-6+7', until: 'result' },
      { t: 'Encore une bataille', d: '8 ' + M + ' 15 : le rouge (15) bat le vert (8). Il lui reste 15 ' + M + ' 8 = 7, et le résultat prend sa couleur : <b>' + M + '7</b>.', expr: '8-15', until: 'result' },
      { t: 'À toi de jouer !', d: 'Pour chaque calcul, pose-toi trois questions :', expr: null, html: steps(['De quelle <b>couleur</b> est chaque soldat ?', '<b>Même couleur</b> (alliance) ou <b>bataille</b> ?', '<b>Qui gagne</b>, et combien de force lui reste-t-il ?']) },
    ],
    ordres: [
      { t: 'Une parenthèse sélectionne', d: 'Les parenthèses <b>sélectionnent</b> un soldat. Le signe juste devant n\'est pas une couleur : c\'est un <b>ordre</b> qu\'on lui donne.', expr: '-(-5)', until: 'lineup' },
      { t: 'Ordre + : fidèle', d: 'Avec l\'ordre <b>+</b>, le soldat est <b>fidèle</b> : il garde sa veste. +(' + M + '5) = <b>' + M + '5</b>.', expr: '+(-5)', until: 'result' },
      { t: 'Ordre ' + M + ' : traître !', d: 'Avec l\'ordre <b>' + M + '</b>, le soldat est un <b>traître</b> : il <b>retourne sa veste</b> et change de camp. ' + M + '(' + M + '5) = <b>+5</b>.', expr: '-(-5)', until: 'result' },
      { t: 'Un traître vert', d: 'Ça marche dans les deux sens : ' + M + '(+9), le soldat vert retourne sa veste et devient rouge : <b>' + M + '9</b>.', expr: '-(+9)', until: 'result' },
      { t: 'Pas de parenthèse, pas d\'ordre', d: 'Dans ' + M + '3 ' + M + ' 8, il n\'y a <b>aucune parenthèse</b> : personne ne reçoit d\'ordre. Les deux « ' + M + ' » sont simplement les couleurs des vestes.', expr: '-3-8', until: 'lineup' },
    ],
    fideles: [
      { t: 'Deux étapes', d: 'Quand il y a des parenthèses : <b>1.</b> on exécute les ordres, <b>2.</b> on fait la bataille.', expr: '(+7)-(-8)', until: 'lineup' },
      { t: 'Étape 1 : exécuter les ordres', d: 'Le ' + M + '8 est sélectionné avec l\'ordre ' + M + ' : traître, il retourne sa veste. Le +7 n\'a pas d\'ordre : il garde la sienne. La sélection disparaît, on écrit <b>7 + 8</b>.', until: 'orders' },
      { t: 'Étape 2 : la bataille', d: 'Il ne reste que des verts : ils s\'allient. 7 + 8 = <b>15</b>.', until: 'result' },
      { t: 'Un autre exemple', d: '(+8) + (' + M + '15) : l\'ordre + laisse le ' + M + '15 rouge. On écrit 8 ' + M + ' 15, et le rouge gagne : <b>' + M + '7</b>.', expr: '(+8)+(-15)', until: 'result' },
    ],
    longues: [
      { t: 'Beaucoup de soldats', d: 'Pas de parenthèse : chaque signe est la couleur d\'une veste.', expr: '-3-8+5-2', until: 'lineup' },
      { t: 'On range les camps', d: 'Les verts d\'un côté, les rouges de l\'autre.', until: 'camps' },
      { t: 'Chaque camp s\'allie', d: 'Les rouges : 3 + 8 + 2 = 13. Le vert : 5.', until: 'alliance' },
      { t: 'Une seule bataille', d: 'Le rouge (13) bat le vert (5) : il lui reste 8, donc <b>' + M + '8</b>.', until: 'result' },
    ],
    deguise: [
      { t: 'Une armée…', d: '7 ' + M + ' 8, c\'est un vert de force 7 et un rouge de force 8.', expr: '7-8', until: 'lineup' },
      { t: '…déguisée avec l\'ordre +', d: '(+7) + (' + M + '8) : l\'ordre + laisse le soldat rouge. On retrouve la même armée : <b>7 ' + M + ' 8</b>.', expr: '(+7)+(-8)', until: 'orders' },
      { t: '…déguisée avec l\'ordre ' + M, d: '(+7) ' + M + ' (+8) : le +8 est un traître, il retourne sa veste et devient rouge. Encore la même armée : <b>7 ' + M + ' 8</b> !', expr: '(+7)-(+8)', until: 'orders' },
      { t: 'Trouve le soldat caché', d: 'Pour retrouver le soldat entre parenthèses :', expr: null, html: steps(['Ordre <b>+</b> : il garde sa veste, il porte donc <b>déjà la bonne couleur</b>.', 'Ordre <b>' + M + '</b> : il va retourner sa veste, il porte donc <b>la couleur opposée</b>.']) },
    ],
    manoeuvres: [
      { t: 'Plusieurs ordres', d: 'Chaque parenthèse reçoit <b>son propre ordre</b>.', expr: '(+2)-(-8)+(-6)', until: 'lineup' },
      { t: 'On exécute tous les ordres', d: 'Le ' + M + '8 est un traître : il devient +8. Le ' + M + '6 est fidèle : il reste ' + M + '6. On écrit <b>2 + 8 ' + M + ' 6</b>.', until: 'orders' },
      { t: 'Puis la bataille', d: 'Verts : 2 + 8 = 10. Rouge : 6. Le vert gagne, il lui reste 4 : <b>+4</b>.', until: 'result' },
    ],
    groupe: [
      { t: 'Une sélection de plusieurs soldats', d: 'Dans 5 ' + M + ' (3 ' + M + ' 8), la parenthèse sélectionne <b>deux</b> soldats : le 3 (sans signe écrit, donc positif : +3) et le ' + M + '8.', expr: '5-(3-8)', until: 'lineup' },
      { t: 'L\'ordre vaut pour tous', d: 'L\'ordre ' + M + ' s\'adresse à <b>tous</b> les soldats sélectionnés : chacun retourne sa veste. On écrit <b>5 ' + M + ' 3 + 8</b>.', until: 'orders' },
      { t: 'Puis la bataille', d: 'Verts : 5 + 8 = 13. Rouge : 3. Il reste 10 : <b>+10</b>.', until: 'result' },
    ],
    contre: [
      { t: 'Une somme : la bataille', d: M + '3 ' + M + ' 8 : deux rouges s\'allient, <b>' + M + '11</b>. Ici, deux « ' + M + ' » ne donnent <b>pas</b> « + » !', expr: '-3-8', until: 'result' },
      { t: 'Un produit : pas de bataille', d: '(' + M + '3) × (' + M + '8) est un <b>produit</b>. On multiplie les forces : 3 × 8 = 24. Chaque facteur négatif fait <b>retourner la veste</b> du résultat.', expr: '(-3)*(-8)', until: 'product' },
      { t: 'Un seul facteur négatif', d: M + '3 × 8 : un seul « ' + M + ' », la veste se retourne une fois : <b>' + M + '24</b>.', expr: '-3*8', until: 'product' },
      { t: 'Le réflexe anti-piège', d: 'Avant de calculer :', expr: null, html: steps(['Cherche le signe <b>×</b>.', 'Il y en a un : c\'est un <b>produit</b>, on applique la règle des signes.', 'Il n\'y en a pas : c\'est une <b>bataille</b>.']) },
    ],
  };
})();
