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

const VERSION = "05d72b890c70";
const FICHIERS = ["./","./index.html","./assets/index-JpBNYnVI.js","./assets/Admin-D3ojhb2-.js","./assets/AffichageExercice-bWo4d3ii.js","./assets/App-FNqDfUuc.js","./assets/Assistant-DdphK74V.js","./assets/Bibliotheque-CVXK3dXm.js","./assets/BoutonFavori-Cv40uf1E.js","./assets/Conditions-BcUvEHz2.js","./assets/Confidentialite-D5F-jl_C.js","./assets/ConnexionAdmin-BmZGHjqV.js","./assets/Cours-DUHkL_xf.js","./assets/EducationIA-BmMWz_8G.js","./assets/Examens-B0UMo042.js","./assets/Exercices-BCA_Uh2C.js","./assets/Favoris-yX-CM6Dg.js","./assets/FiletErreur-CSPWYPAI.js","./assets/GestionContenu-CXS4M66M.js","./assets/Icon-B3yy5ZmY.js","./assets/Installation-BdlSBcFq.js","./assets/LecteurPdf-D289CyxX.js","./assets/LectureTexte-8DGzCp0_.js","./assets/MentionsLegales-C2ypFnsM.js","./assets/PageJuridique-Bqco4jNz.js","./assets/Parametres-DHR_w5EH.js","./assets/Planning-UiM2KasH.js","./assets/Profil-DXhnqcua.js","./assets/Progression-CK484jSO.js","./assets/Projet-C67K5u3f.js","./assets/Qcm-DP8e_hE6.js","./assets/StatsAdmin-Cd1gG1Va.js","./assets/Videos-Bzclpu7f.js","./assets/assistant-BOaoaR_0.js","./assets/avatars-BwSZS8H8.js","./assets/bibliotheque-D_0UmUyH.js","./assets/chargementIA-zqe9GlVF.js","./assets/classes-Bi0ZEjD9.js","./assets/competences-8BdxWgPD.js","./assets/competences-Bler218Y.js","./assets/comptes-wzUtHu0z.js","./assets/contenu-Cby8fbrm.js","./assets/couleurs-DXnEHaWZ.js","./assets/dist-DvjAMUvs.js","./assets/examens-MGGdniSV.js","./assets/exercices-CuUd2xK1.js","./assets/ia-dD0HLmqi.js","./assets/installation-CB6yEAux.js","./assets/matieres-C1II5X_O.js","./assets/profil-59bL3Ce7.js","./assets/programmeIA-rYq1kmei.js","./assets/progression-BAgkUUSW.js","./assets/qcm-DGnF5Lz5.js","./assets/rappels-CnvoX9eU.js","./assets/rappels-IwFCWbSu.js","./assets/revisions-BdXengez.js","./assets/sauvegarde-CWVsZKvx.js","./assets/semestres-CCnEWMV_.js","./assets/session-mviI-pKM.js","./assets/site-CGMt__mu.js","./assets/stats-DCTxgvu-.js","./assets/ui-BSizyRZ5.js","./assets/videos-BoV4wX7w.js","./assets/videos-DUDjgWOB.js","./assets/index-DwBfUkpu.css","./logo.svg","./manifest.webmanifest","./icones/apple-touch-icon.png","./icones/icone-192.png","./icones/icone-512.png","./icones/icone-masquable-512.png"];
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
