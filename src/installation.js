import { useSyncExternalStore } from "react";

/* ==================================================================
   Application installable : service worker et bouton « Installer ».

   `demarrerApplication()` est appelé une fois, au lancement :
   - il enregistre le service worker (docs/sw.js), qui garde le site
     pour l'ouvrir sans réseau — seulement sur le site hébergé, pas en
     développement ni dans le fichier hors ligne ;
   - il retient la proposition d'installation du navigateur
     (`beforeinstallprompt`, Chrome et Edge, Android compris), qui
     arrive tôt et une seule fois.

   `useInstallation()` dit aux pages ce qui est possible :
     "installee"  → déjà ouverte comme application ;
     "proposable" → un clic sur `installer()` ouvre la fenêtre du navigateur ;
     "ios"        → iPhone ou iPad : Partager, puis « Sur l'écran d'accueil » ;
     "manuelle"   → autre navigateur : passer par son menu.
   ================================================================== */

let proposition = null;
const abonnes = new Set();
const prevenir = () => abonnes.forEach((f) => f());

const estInstallee = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

const estIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export function demarrerApplication() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    proposition = e;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    proposition = null;
    prevenir();
  });

  const heberge = location.protocol === "https:" || location.hostname === "localhost";
  const avecManifeste = document.querySelector('link[rel="manifest"]');
  if (import.meta.env.PROD && heberge && avecManifeste && "serviceWorker" in navigator) {
    const enregistrer = () =>
      navigator.serviceWorker.register("./sw.js").catch(() => {
        /* sans service worker, le site marche comme avant, en ligne */
      });
    if (document.readyState === "complete") enregistrer();
    else window.addEventListener("load", enregistrer);
  }
}

function etat() {
  if (estInstallee()) return "installee";
  if (proposition) return "proposable";
  if (estIos()) return "ios";
  return "manuelle";
}

export function useInstallation() {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    etat,
    () => "manuelle"
  );
}

/* Ouvre la fenêtre d'installation du navigateur. Renvoie true si
   l'étudiant a accepté. */
export async function installer() {
  if (!proposition) return false;
  const p = proposition;
  proposition = null;
  prevenir();
  await p.prompt();
  const { outcome } = await p.userChoice;
  return outcome === "accepted";
}
