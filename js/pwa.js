/* PWA : enregistrement du service worker et bouton « Installer l'application ». */
import { $ } from './ui.js';

export function initPwa() {
  const inst = $('install'), iosHint = $('ios-hint');
  let deferred = null;
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const web = /^https?:$/.test(location.protocol);

  /* le service worker garde la page hors ligne et la met à jour à chaque lancement */
  if ('serviceWorker' in navigator && web) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { }); });
  }

  if (!standalone) {
    /* Chrome, Edge, Android : le navigateur propose l'installation */
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; inst.hidden = false; });
    window.addEventListener('appinstalled', function () { deferred = null; inst.hidden = true; iosHint.hidden = true; });
    /* iPhone, iPad : pas d'invite programmable, on explique « Partager > Sur l'écran d'accueil » */
    if (isIOS && web) { inst.hidden = false; }
    inst.addEventListener('click', function () {
      if (deferred) { deferred.prompt(); deferred.userChoice.then(function () { deferred = null; inst.hidden = true; }); }
      else { iosHint.hidden = !iosHint.hidden; }
    });
  }
}
