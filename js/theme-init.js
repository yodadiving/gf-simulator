/* Appliqué tout de suite, avant l'affichage, pour éviter un éclair de thème clair chez ceux qui ont choisi le sombre. */
try {
  var st = localStorage.getItem('gf-theme');
  if (st === 'dark' || st === 'light') document.documentElement.setAttribute('data-theme', st);
} catch (e) { }
