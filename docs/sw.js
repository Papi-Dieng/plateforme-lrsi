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

const VERSION = "965f48a76f7b";
const FICHIERS = ["./","./index.html","./assets/index-CmCE2EUh.js","./assets/AffichageExercice-BnjOYBuq.js","./assets/App-BTkpMi4K.js","./assets/Assistant-dCG-7hN_.js","./assets/Bibliotheque-CdB2u-fH.js","./assets/BoutonFavori-DrL56nGE.js","./assets/CarrouselEquipe-CFmimRSx.js","./assets/CodeSecours-A4ctqaWl.js","./assets/Conditions-CjNFXfsZ.js","./assets/Confidentialite-CELwBiqF.js","./assets/Cours-BkFASjEn.js","./assets/Examens-miRkCq4r.js","./assets/Exercices-DHHp7EcF.js","./assets/Favoris-CT8BNrea.js","./assets/FiletErreur-DT24SuCg.js","./assets/Icon-eqnk1Me0.js","./assets/Installation-DSJX6lE9.js","./assets/Layout-gj93BjWF.js","./assets/LectureTexte-BdJsA8k2.js","./assets/Logo-sASEiyAn.js","./assets/MentionsLegales-CCWc8Un5.js","./assets/PageJuridique-KlxlfO2l.js","./assets/Parametres-C_CidJY8.js","./assets/Planning-DbOonokr.js","./assets/PleinEcran-Po-Uourh.js","./assets/Profil-_XhdsED8.js","./assets/Progression-BvUq_lUX.js","./assets/Projet-CzB53F7s.js","./assets/Qcm-ByuGipg4.js","./assets/RepondreExercice-B5kAEHyT.js","./assets/Videos-C2LPu8Am.js","./assets/analyseMatieres-CdKlxK4k.js","./assets/assistant-671yTUCh.js","./assets/avatars-CUwbr3BM.js","./assets/bibliotheque-C3ES8mHv.js","./assets/chargementIA-CcOvccdt.js","./assets/chunk-OB3PAWPO-CxVVrMvo.js","./assets/classes-Bi0ZEjD9.js","./assets/comptes-C4aO_RZr.js","./assets/comptes-wzUtHu0z.js","./assets/contenu-CZSXx3Zk.js","./assets/conversations-BIlml4mK.js","./assets/couleurs-DXnEHaWZ.js","./assets/couvertures-ssuIjmbz.js","./assets/examens-BnR9VlYO.js","./assets/exercices-Uo2YUD3-.js","./assets/ia-B5U5d58i.js","./assets/installation-DpI_2ROM.js","./assets/matieres-CBUfTZxF.js","./assets/preload-helper-uBIymjUX.js","./assets/profil-C6Kc72Et.js","./assets/programmeIA-By0SBo1J.js","./assets/progression-CopGTcHn.js","./assets/qcm-BycG_RLH.js","./assets/rappels-BZbmPSfP.js","./assets/rappels-DRmAN09m.js","./assets/react-yIOJJ3r4.js","./assets/revisions-eUXBYb0T.js","./assets/sauvegarde-BZBMt32J.js","./assets/semestres-DjiGP65O.js","./assets/session-DbMvttkr.js","./assets/site-yMO3tJLS.js","./assets/stats-BNYG15YN.js","./assets/stockage-Bbntnmsm.js","./assets/styleAdmin-0CXJuWkq.js","./assets/ui-G_bLFK3R.js","./assets/videos-Bsu_0J3u.js","./assets/videos-D3i8WpkQ.js","./assets/index-BeGY1vW8.css","./logo-baobab.svg","./logo-mono.svg","./favicon.ico","./manifest.webmanifest","./icones/baobab-192.png","./icones/baobab-512.png","./icones/baobab-apple-touch.png","./icones/baobab-masquable-512.png"];
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
        icon: "./icones/baobab-192.png",
        badge: "./icones/baobab-192.png",
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
