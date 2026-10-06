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

const VERSION = "277f9d09b2c1";
const FICHIERS = ["./","./index.html","./assets/index-BELvVqyI.js","./assets/Admin-D2NopQ0S.js","./assets/AffichageExercice-B7k1SaYz.js","./assets/App-Drrzfzes.js","./assets/Assistant-DtloD9ZH.js","./assets/Bibliotheque-C_iKBvrs.js","./assets/BoutonFavori-Cv40uf1E.js","./assets/Conditions-rX067EZS.js","./assets/Confidentialite-P7y_BVoj.js","./assets/ConnexionAdmin-D90io-jF.js","./assets/Cours-CdS5Kr1N.js","./assets/EducationIA-DVwz_wM2.js","./assets/Examens-CBR1XNZI.js","./assets/Exercices-D7a4dpg1.js","./assets/Favoris-C8ta1dxJ.js","./assets/FiletErreur-CSPWYPAI.js","./assets/GestionContenu-CYKY9O8g.js","./assets/Icon-B3yy5ZmY.js","./assets/Installation-B3m-bYI0.js","./assets/LecteurPdf-Bhwpv1d3.js","./assets/LectureTexte-BLKlDBNx.js","./assets/MentionsLegales-rxrcENMP.js","./assets/PageJuridique-CRUFTEU2.js","./assets/Parametres-f2nbLwJ4.js","./assets/Planning-nvNzuUAO.js","./assets/Profil-DXLA_Cyx.js","./assets/Progression-DJ9-YXc7.js","./assets/Projet-CNMKA3vA.js","./assets/Qcm-DPz2565d.js","./assets/StatsAdmin-BzKyNJmE.js","./assets/Videos-B1JxL6U_.js","./assets/analyseMatieres-Ckq9dOq8.js","./assets/assistant-kaY51zvi.js","./assets/avatars-BwSZS8H8.js","./assets/bibliotheque-D_0UmUyH.js","./assets/chargementIA-CBzPp_ql.js","./assets/classes-Bi0ZEjD9.js","./assets/comptes-wzUtHu0z.js","./assets/contenu-CvmPHiK5.js","./assets/conversations-BSWDtt03.js","./assets/couleurs-DXnEHaWZ.js","./assets/dist-DvjAMUvs.js","./assets/examens-MGGdniSV.js","./assets/exercices-Bw4Wkqp4.js","./assets/ia-CHTXQvDH.js","./assets/installation-CwCZJ9sN.js","./assets/matieres-wxW8TI2j.js","./assets/profil-59bL3Ce7.js","./assets/programmeIA-BwMPjxRR.js","./assets/progression-BAgkUUSW.js","./assets/qcm-Bc1grxUe.js","./assets/rappels--JnUEmWZ.js","./assets/rappels-Dv3zPDK9.js","./assets/revisions-CWKXMV_p.js","./assets/sauvegarde-YRhH1Rau.js","./assets/semestres-DjiGP65O.js","./assets/session-mviI-pKM.js","./assets/site-nTHQeGUI.js","./assets/stats-C5_r5o-P.js","./assets/ui-BSizyRZ5.js","./assets/videos-DUDjgWOB.js","./assets/videos-D_xgKoqM.js","./assets/index-BgVMHbjf.css","./logo.svg","./manifest.webmanifest","./icones/apple-touch-icon.png","./icones/icone-192.png","./icones/icone-512.png","./icones/icone-masquable-512.png"];
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
