/* ==================================================================
   Service worker de l'application installable.

   Modèle : `vite.config.js` (extension « pwa ») y écrit la version et
   la liste des fichiers à chaque compilation, dans docs/sw.js.
   Ne pas le modifier dans docs/ : il y serait écrasé.

   - À l'installation : toutes les pièces du site (HTML, JavaScript,
     CSS, icônes) sont mises de côté. Le site s'ouvre alors sans réseau.
   - Page : le réseau d'abord, pour voir tout de suite une nouvelle
     version ; sans réseau, la copie gardée.
   - Fichiers du site : la copie gardée d'abord (leurs noms changent à
     chaque version, une copie n'est donc jamais périmée).
   - Le contenu publié (relais) n'est pas géré ici : le site le garde
     déjà dans le navigateur (`src/contenu.js`). Les PDF et les vidéos
     demandent une connexion.
   - Une nouvelle version remplace l'ancienne dès qu'elle est prête, et
     les anciennes copies sont effacées.
   ================================================================== */

const VERSION = "7b36af1524c0";
const FICHIERS = ["./","./index.html","./assets/index-C8ZfQU2h.js","./assets/Admin-caWhkgIE.js","./assets/AffichageExercice-DcLpMNUI.js","./assets/App-BwoCtgn2.js","./assets/Assistant-BIs9uALk.js","./assets/Bibliotheque-7U8ngC7h.js","./assets/BoutonFavori-DeftKYi-.js","./assets/Conditions-DTN6nlkm.js","./assets/Confidentialite-Bt17Ijzy.js","./assets/ConnexionAdmin-BqrKj1Ao.js","./assets/Cours-C5tQdq0e.js","./assets/EducationIA-BLoDzacs.js","./assets/Examens-C1-du6AE.js","./assets/Exercices-k_rbDYxy.js","./assets/Favoris-C2tJmUv2.js","./assets/FiletErreur-D9A2n2bH.js","./assets/GestionContenu-BdmNBkGf.js","./assets/Icon-CgUVL2xA.js","./assets/Installation-Dnqdy32r.js","./assets/LecteurPdf-Dixbmg21.js","./assets/LectureTexte-BH1w4904.js","./assets/MentionsLegales-De5d8KGP.js","./assets/PageJuridique-DzQPF3fI.js","./assets/Parametres-B3xuyeKg.js","./assets/Planning-xOcA1QMr.js","./assets/Profil-CFkuSkcL.js","./assets/Progression-DMYf7GP4.js","./assets/Projet-efKRObPQ.js","./assets/Qcm-DpZ2o-U5.js","./assets/StatsAdmin-C14ZqjNm.js","./assets/Videos-MyQFyIA3.js","./assets/assistant-Biy5nBy9.js","./assets/avatars-x1SbvTb8.js","./assets/bibliotheque-D_0UmUyH.js","./assets/chargementIA-ChAMXMAH.js","./assets/classes-Bi0ZEjD9.js","./assets/competences-Bler218Y.js","./assets/competences-DNF-epE_.js","./assets/contenu-DrYeYP6W.js","./assets/couleurs-DXnEHaWZ.js","./assets/examens-MGGdniSV.js","./assets/exercices-CuUd2xK1.js","./assets/ia-C6VnRN2W.js","./assets/installation-ar_ZYrPC.js","./assets/matieres-BF2zX983.js","./assets/profil-59bL3Ce7.js","./assets/programmeIA-DSC96VAl.js","./assets/progression-BAgkUUSW.js","./assets/qcm-DGnF5Lz5.js","./assets/rappels-Ebr9liEI.js","./assets/rappels-IwepwMKW.js","./assets/revisions-BdXengez.js","./assets/site-CwrICsoR.js","./assets/stats-C-dffzBo.js","./assets/ui-DDXeerpQ.js","./assets/videos-C7tQROUa.js","./assets/videos-DUDjgWOB.js","./assets/index-B8pgU_Da.css","./logo.svg","./manifest.webmanifest","./icones/apple-touch-icon.png","./icones/icone-192.png","./icones/icone-512.png","./icones/icone-masquable-512.png"];
const CACHE = `sunu-cours-${VERSION}`;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FICHIERS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c.startsWith("sunu-cours-") && c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const requete = e.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  // Seulement les fichiers du site : le relais, YouTube et le reste
  // passent sans intermédiaire.
  if (url.origin !== self.location.origin || !url.pathname.startsWith(new URL("./", self.location).pathname)) return;

  if (requete.mode === "navigate") {
    e.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          if (reponse.ok) caches.open(CACHE).then((cache) => cache.put("./index.html", copie));
          return reponse;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  e.respondWith(
    caches.match(requete).then(
      (garde) =>
        garde ??
        fetch(requete).then((reponse) => {
          if (reponse.ok && reponse.type === "basic") {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        })
    )
  );
});

/* Rappel en arrière-plan : là où le navigateur le permet (Chrome,
   application installée), il réveille le service worker environ une
   fois par jour. Le programme a été rangé par la page (src/rappels.js)
   dans le cache « rappels-sunu-cours » ; un rappel par jour au plus. */
const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

self.addEventListener("periodicsync", (e) => {
  if (e.tag !== "rappels") return;
  e.waitUntil(
    (async () => {
      const cache = await caches.open("rappels-sunu-cours");
      const reponse = await cache.match("./rappels.json");
      if (!reponse) return;
      const { programme = [], dernier = null } = await reponse.json();
      const jour = jourLocal();
      const duJour = programme.find((p) => p.jour === jour);
      if (dernier === jour || !duJour) return;
      await self.registration.showNotification(duJour.titre, {
        body: duJour.corps,
        icon: "./icones/icone-192.png",
        badge: "./icones/icone-192.png",
        tag: "rappel-du-jour",
        data: { lien: "./#/planning" },
      });
      await cache.put("./rappels.json", new Response(JSON.stringify({ programme, dernier: jour })));
    })()
  );
});

/* Les rappels de révision (planning) : un clic sur la notification
   ouvre le planning, dans l'onglet déjà ouvert s'il y en a un. */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const cible = new URL(e.notification.data?.lien ?? "./#/planning", self.location).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      const ouverte = fenetres.find((f) => f.url.startsWith(new URL("./", self.location).href));
      if (ouverte) return ouverte.navigate(cible).then((f) => (f ?? ouverte).focus());
      return self.clients.openWindow(cible);
    })
  );
});
