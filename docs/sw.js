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

const VERSION = "efd0eb903737";
const FICHIERS = ["./","./index.html","./assets/index-DIkUJQ69.js","./assets/Admin-DZchb2rH.js","./assets/AffichageExercice-CiFnJ9rC.js","./assets/App-BkvdJJ_C.js","./assets/Assistant-D3a3y6er.js","./assets/Bibliotheque-BDExWOP0.js","./assets/BoutonFavori-BPZZapNd.js","./assets/CarrouselEquipe-DmmfPmo2.js","./assets/CodeSecours-BbsNijkd.js","./assets/Conditions-B8xouybw.js","./assets/Confidentialite-Bm4jwXuH.js","./assets/ConnexionAdmin-Cz7Q6ev-.js","./assets/Cours-DsiXOXQ2.js","./assets/EducationIA-B-0w84JD.js","./assets/Examens-GnQz-BWX.js","./assets/Exercices-Cpz28dFG.js","./assets/Favoris-CmvWOPb-.js","./assets/FiletErreur-B1k7RQep.js","./assets/GestionContenu-BT9hXcy3.js","./assets/Icon-Cdk3wTDE.js","./assets/Installation-CbJZuk9P.js","./assets/Layout-D4Jo_ASX.js","./assets/LayoutAdmin-Gj-5BVXE.js","./assets/LayoutAdmin-aPNtzqA5.js","./assets/LecteurPdf-Rxzcsp3u.js","./assets/LectureTexte-CYf7IDO8.js","./assets/MentionsLegales-Cf_nbuGz.js","./assets/PageJuridique-MQ46m2ta.js","./assets/Parametres-CEnstvnf.js","./assets/Planning-NQhrWQdT.js","./assets/Profil-C1Vwd0Tt.js","./assets/Progression-BtJwPST3.js","./assets/Projet-Bkww6BF_.js","./assets/Qcm-BxTHERYC.js","./assets/RepondreExercice-Ta57VPfQ.js","./assets/StatsAdmin-4upVbo4M.js","./assets/Videos-VfCBzwCT.js","./assets/analyseMatieres-Ckq9dOq8.js","./assets/assistant-Dl7oEAZp.js","./assets/avatars-xR7jAsuV.js","./assets/bibliotheque-CdleojWg.js","./assets/chargementIA-BfFM9H3B.js","./assets/chunk-OB3PAWPO-DqXdlYdP.js","./assets/classes-Bi0ZEjD9.js","./assets/comptes-Cd6R5zza.js","./assets/comptes-wzUtHu0z.js","./assets/contenu-DqfhcjCz.js","./assets/conversations-BSWDtt03.js","./assets/couleurs-DXnEHaWZ.js","./assets/dist-DvjAMUvs.js","./assets/examens-MGGdniSV.js","./assets/exercices-Bw4Wkqp4.js","./assets/ia-DCJkZVDd.js","./assets/installation-BhPoXMOQ.js","./assets/matieres-wxW8TI2j.js","./assets/profil-59bL3Ce7.js","./assets/programmeIA-CzLi9Q17.js","./assets/progression-BAgkUUSW.js","./assets/qcm-Bc1grxUe.js","./assets/rappels--JnUEmWZ.js","./assets/rappels-Dv3zPDK9.js","./assets/revisions-CWKXMV_p.js","./assets/sauvegarde-0ZQGLrWb.js","./assets/semestres-DjiGP65O.js","./assets/session-VP8xBvR8.js","./assets/site-CNeA7ogp.js","./assets/stats-BXxI6ILP.js","./assets/styleAdmin-0CXJuWkq.js","./assets/ui-BOJFVbTj.js","./assets/videos-Bu6uHuyk.js","./assets/videos-DNs1W8gf.js","./assets/index-BGjROdIF.css","./logo.svg","./manifest.webmanifest","./icones/apple-touch-icon.png","./icones/icone-192.png","./icones/icone-512.png","./icones/icone-masquable-512.png"];
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
