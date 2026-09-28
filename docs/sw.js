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

const VERSION = "929f7a7a2c40";
const FICHIERS = ["./","./index.html","./assets/index-CHilJeqL.js","./assets/Admin-CjaAkfPY.js","./assets/AffichageExercice-Cfny46_0.js","./assets/App-DrQ5vBeq.js","./assets/Assistant-mFi90Iag.js","./assets/Bibliotheque-ChAyUV5-.js","./assets/BoutonFavori-DhCPjvh6.js","./assets/Conditions-C620tA5c.js","./assets/Confidentialite-BXbF4lDb.js","./assets/ConnexionAdmin-1nG2WXri.js","./assets/Cours-C1SawxjI.js","./assets/EducationIA-Ow8-L_Pc.js","./assets/Examens-DrgQpeZn.js","./assets/Exercices-D8lKhqMt.js","./assets/Favoris-hiX7C042.js","./assets/FiletErreur-D9A2n2bH.js","./assets/GestionContenu-BnF2JcD8.js","./assets/Icon-CgUVL2xA.js","./assets/Installation-CxVaiTMf.js","./assets/LecteurPdf-pzqzuKfk.js","./assets/LectureTexte-Bk0TICNJ.js","./assets/MentionsLegales-ejF8grlc.js","./assets/PageJuridique-DYIghcsv.js","./assets/Parametres-DJ7zxxLc.js","./assets/Planning-BzunrCzF.js","./assets/Profil-DnscS4I6.js","./assets/Progression-BGKyykbw.js","./assets/Projet-BEZuBevL.js","./assets/Qcm-CoXM8IwP.js","./assets/StatsAdmin-DIfnFPSk.js","./assets/Videos-BMG5nchy.js","./assets/assistant-9WTa83sk.js","./assets/avatars-x1SbvTb8.js","./assets/bibliotheque-D_0UmUyH.js","./assets/chargementIA-ChAMXMAH.js","./assets/competences-Bler218Y.js","./assets/competences-DNF-epE_.js","./assets/contenu-DrYeYP6W.js","./assets/couleurs-DXnEHaWZ.js","./assets/examens-MGGdniSV.js","./assets/exercices-CuUd2xK1.js","./assets/ia-C6VnRN2W.js","./assets/installation-ar_ZYrPC.js","./assets/matieres-BF2zX983.js","./assets/profil-59bL3Ce7.js","./assets/programmeIA-DSC96VAl.js","./assets/progression-D5_FJQ3T.js","./assets/qcm-DGnF5Lz5.js","./assets/rappels-BqpsMRRc.js","./assets/rappels-CaYLedf7.js","./assets/revisions-BdXengez.js","./assets/site-CwrICsoR.js","./assets/stats-C-dffzBo.js","./assets/ui-BHJDQkJa.js","./assets/videos-DUDjgWOB.js","./assets/videos-DrppsCaT.js","./assets/index-BP8wJV0P.css","./logo.svg","./manifest.webmanifest","./icones/apple-touch-icon.png","./icones/icone-192.png","./icones/icone-512.png","./icones/icone-masquable-512.png"];
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
