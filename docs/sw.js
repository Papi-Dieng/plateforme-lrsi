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

const VERSION = "c9f8f812c8f4";
const FICHIERS = ["./","./index.html","./assets/index-CMFMsGIN.js","./assets/AffichageExercice-BDlLWz59.js","./assets/App-ByFknXAE.js","./assets/Assistant-BXlc5e93.js","./assets/Avis-CpmYrmz-.js","./assets/Bibliotheque-D986DNz2.js","./assets/BoutonFavori-BBp32j_Z.js","./assets/CarrouselEquipe-CFmimRSx.js","./assets/CodeSecours-hmv-iQYm.js","./assets/Conditions-8mLy3ZDi.js","./assets/Confidentialite-B5DA2xQj.js","./assets/Cours-CVEo70ea.js","./assets/Examens-DWTn6RG0.js","./assets/Exercices-B4jZ9c0G.js","./assets/Favoris-CAkuzWkh.js","./assets/FiletErreur-DT24SuCg.js","./assets/Icon-eqnk1Me0.js","./assets/Installation-BQ1tiJoz.js","./assets/Layout-BBE-Ky_Y.js","./assets/LectureTexte-hvLGJyGv.js","./assets/Logo-sASEiyAn.js","./assets/MentionsLegales-CfXrnAqb.js","./assets/PageJuridique-ClJlOy8O.js","./assets/Parametres-Lu0k3pZD.js","./assets/Planning-dEzCI_4J.js","./assets/PleinEcran-g1yhs2wq.js","./assets/Profil-dALb2d0x.js","./assets/Progression-DihXYCXw.js","./assets/Projet-Bc3L8DE-.js","./assets/Qcm-Bd-elh5c.js","./assets/RepondreExercice-yCF-Kpo2.js","./assets/Videos-DYopFbg8.js","./assets/analyseMatieres-CdKlxK4k.js","./assets/apparence-D920kal5.js","./assets/assistant-emOj0vx6.js","./assets/avatars-CUwbr3BM.js","./assets/bibliotheque-C3ES8mHv.js","./assets/chargementIA-QPS3DRFL.js","./assets/chunk-OB3PAWPO-CxVVrMvo.js","./assets/classes-Bi0ZEjD9.js","./assets/comptes-D5QaRAcE.js","./assets/comptes-wzUtHu0z.js","./assets/contenu-DNigGqfn.js","./assets/conversations-DuxrpZoS.js","./assets/couleurs-DXnEHaWZ.js","./assets/couvertures-Bw0aHUtz.js","./assets/examens-VM71-QiA.js","./assets/exercices-Uo2YUD3-.js","./assets/ia-DsAIi_2V.js","./assets/images-DuDa5lnf.js","./assets/installation-DpI_2ROM.js","./assets/matieres-CBUfTZxF.js","./assets/preload-helper-uBIymjUX.js","./assets/profil-dD8YrgQ9.js","./assets/programmeIA-CAZB0Y39.js","./assets/progression-DSW6qDrm.js","./assets/qcm-BycG_RLH.js","./assets/rappels-Btyb2qDS.js","./assets/rappels-DgZTwGZC.js","./assets/react-yIOJJ3r4.js","./assets/revisions-DAskLdV3.js","./assets/sauvegarde-DB47a-gw.js","./assets/semestres-DjiGP65O.js","./assets/session-DbMvttkr.js","./assets/site-BodWitIe.js","./assets/stats-Cv-hzvwN.js","./assets/styleAdmin-0CXJuWkq.js","./assets/ui-BnEFkhd-.js","./assets/videos-Bsu_0J3u.js","./assets/videos-DvQ-7ZOH.js","./assets/index-C8Uhx701.css","./logo-baobab.svg","./logo-mono.svg","./favicon.ico","./manifest.webmanifest","./icones/baobab-192.png","./icones/baobab-512.png","./icones/baobab-apple-touch.png","./icones/baobab-masquable-512.png"];
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
