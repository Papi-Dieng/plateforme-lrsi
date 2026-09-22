/* ==================================================================
   Progression de l'étudiant — VERSION 1

   Tout est conservé dans le navigateur, rien n'est envoyé nulle part.
   Trois informations seulement :

     lrsi-scores    → meilleur score et nombre de tentatives par QCM
     lrsi-exercices → exercices dont la correction a été ouverte
     lrsi-favoris   → matières mises en marque-page

   La version 3 déplacera ces données côté serveur, rattachées à un
   compte. Les fonctions ci-dessous sont le seul point de passage :
   il suffira de les remplacer par des appels à l'API.
   ================================================================== */

export const CLES = {
  scores: "lrsi-scores",
  exercices: "lrsi-exercices",
  favoris: "lrsi-favoris",
  videos: "lrsi-videos",
  videosVues: "lrsi-videos-vues",
};

function lire(cle, defaut) {
  try {
    const brut = JSON.parse(localStorage.getItem(cle) ?? "null");
    return brut ?? defaut;
  } catch {
    return defaut;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    /* stockage indisponible : la progression n'est pas conservée */
  }
}

/* ---------------------------------------------------------------- */
/* QCM                                                               */
/* ---------------------------------------------------------------- */

export function lireScores() {
  const brut = lire(CLES.scores, {});
  return typeof brut === "object" && brut !== null ? brut : {};
}

// `temps` est la durée de la tentative, en secondes. On ne garde celle-ci
// que si la tentative améliore le meilleur score, pour que le temps affiché
// corresponde bien au record.
//
// `detail` liste, question par question, la compétence visée et la réussite.
// Contrairement au score, il est TOUJOURS remplacé par la dernière tentative :
// l'analyse des compétences doit refléter le niveau actuel, pas le meilleur
// jour. Refaire un QCM met donc à jour l'analyse sans la dédoubler.
export function enregistrerScore(id, score, total, temps, detail) {
  const scores = lireScores();
  const precedent = scores[id];
  const record = score > (precedent?.score ?? -1);
  scores[id] = {
    score: record ? score : precedent.score,
    total,
    temps: record ? temps : precedent?.temps,
    detail: detail ?? precedent?.detail,
    tentatives: (precedent?.tentatives ?? 0) + 1,
    date: new Date().toISOString(),
  };
  ecrire(CLES.scores, scores);
  return scores;
}

// Durée en secondes vers un format lisible, « 4 min 12 s ».
export function dureeLisible(secondes) {
  if (typeof secondes !== "number" || Number.isNaN(secondes)) return null;
  const min = Math.floor(secondes / 60);
  const sec = secondes % 60;
  if (min === 0) return `${sec} s`;
  return `${min} min ${String(sec).padStart(2, "0")} s`;
}

/* ---------------------------------------------------------------- */
/* Exercices                                                         */
/* ---------------------------------------------------------------- */

export function lireExercicesTravailles() {
  const brut = lire(CLES.exercices, {});
  return typeof brut === "object" && brut !== null ? brut : {};
}

// Appelé quand l'étudiant ouvre la correction : c'est le signe le plus
// fiable, en version 1, qu'il a réellement travaillé l'exercice.
export function marquerExerciceTravaille(id) {
  const faits = lireExercicesTravailles();
  if (!faits[id]) {
    faits[id] = { date: new Date().toISOString() };
    ecrire(CLES.exercices, faits);
  }
  return faits;
}

/* ---------------------------------------------------------------- */
/* Favoris                                                           */
/*                                                                   */
/* Un favori vaut pour n'importe quel contenu : matière, chapitre,   */
/* exercice, QCM ou vidéo. Il est décrit par un type et une          */
/* référence, ce qui évite de confondre l'exercice « sql-moyennes »  */
/* et une éventuelle vidéo du même nom.                              */
/*                                                                   */
/* Les anciens favoris n'étaient que des identifiants de matière.    */
/* Ils sont convertis à la lecture, sans rien perdre.                */
/* ---------------------------------------------------------------- */

export const TYPES_FAVORIS = ["matiere", "chapitre", "exercice", "qcm", "video"];

// Un chapitre n'a pas d'identifiant propre : on le désigne par sa
// matière et son titre.
export const refChapitre = (matiereId, titre) => `${matiereId}::${titre}`;

export function litRefChapitre(reference) {
  const [matiere, ...reste] = String(reference).split("::");
  return { matiere, titre: reste.join("::") };
}

function normaliserFavori(entree) {
  if (typeof entree === "string") {
    return { type: "matiere", reference: entree, date: null };
  }
  if (!entree || typeof entree !== "object") return null;
  if (!TYPES_FAVORIS.includes(entree.type)) return null;
  if (typeof entree.reference !== "string" || entree.reference === "") return null;
  return { type: entree.type, reference: entree.reference, date: entree.date ?? null };
}

export function lireFavoris() {
  const brut = lire(CLES.favoris, []);
  if (!Array.isArray(brut)) return [];
  return brut.map(normaliserFavori).filter(Boolean);
}

export function estFavori(type, reference) {
  return lireFavoris().some(
    (f) => f.type === type && f.reference === reference
  );
}

// Prévient les autres boutons montés sur la page, pour qu'un même
// contenu reste cohérent d'une carte à l'autre.
function signalerChangement() {
  try {
    window.dispatchEvent(new CustomEvent("lrsi-favoris"));
  } catch {
    /* environnement sans fenêtre : rien à signaler */
  }
}

export function basculerFavori(type, reference) {
  const actuels = lireFavoris();
  const present = actuels.some(
    (f) => f.type === type && f.reference === reference
  );
  const suite = present
    ? actuels.filter((f) => !(f.type === type && f.reference === reference))
    : [{ type, reference, date: new Date().toISOString() }, ...actuels];
  ecrire(CLES.favoris, suite);
  signalerChangement();
  return suite;
}

export function retirerFavori(type, reference) {
  const suite = lireFavoris().filter(
    (f) => !(f.type === type && f.reference === reference)
  );
  ecrire(CLES.favoris, suite);
  signalerChangement();
  return suite;
}

/* ---------------------------------------------------------------- */
/* Vidéos d'explication                                              */
/*                                                                   */
/* L'étudiant colle un lien YouTube, la plateforme en extrait        */
/* l'identifiant. Rien n'est téléversé : seul l'identifiant est      */
/* conservé, et la vidéo reste hébergée par YouTube.                 */
/* ---------------------------------------------------------------- */

// Accepte une URL complète, une URL courte, un lien /embed, un Short,
// ou directement l'identifiant à onze caractères.
export function extraireIdYouTube(lien) {
  if (!lien) return null;
  const texte = String(lien).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(texte)) return texte;
  const motifs = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /[?&]v=([A-Za-z0-9_-]{11})/,
    /\/embed\/([A-Za-z0-9_-]{11})/,
    /\/shorts\/([A-Za-z0-9_-]{11})/,
    /\/live\/([A-Za-z0-9_-]{11})/,
  ];
  for (const motif of motifs) {
    const trouve = texte.match(motif);
    if (trouve) return trouve[1];
  }
  return null;
}

export function lireVideos() {
  const brut = lire(CLES.videos, []);
  return Array.isArray(brut) ? brut : [];
}

export function ajouterVideo({ titre, matiere, duree, lien }) {
  const youtubeId = extraireIdYouTube(lien);
  if (!youtubeId) return { erreur: "lien" };

  const videos = lireVideos();
  if (videos.some((v) => v.youtubeId === youtubeId)) {
    return { erreur: "doublon", videos };
  }

  const suite = [
    {
      id: `perso-${youtubeId}`,
      titre: titre.trim(),
      matiere,
      duree: duree.trim(),
      youtubeId,
      ajoutee: new Date().toISOString(),
    },
    ...videos,
  ];
  ecrire(CLES.videos, suite);
  return { videos: suite };
}

export function supprimerVideo(id) {
  const suite = lireVideos().filter((v) => v.id !== id);
  ecrire(CLES.videos, suite);
  return suite;
}

export function lireVideosVues() {
  const brut = lire(CLES.videosVues, []);
  return Array.isArray(brut) ? brut : [];
}

export function marquerVideoVue(id) {
  const vues = lireVideosVues();
  if (vues.includes(id)) return vues;
  const suite = [...vues, id];
  ecrire(CLES.videosVues, suite);
  return suite;
}

/* ---------------------------------------------------------------- */
/* Remise à zéro                                                     */
/* ---------------------------------------------------------------- */

export function reinitialiserProgression() {
  try {
    Object.values(CLES).forEach((cle) => localStorage.removeItem(cle));
  } catch {
    /* rien à faire : le stockage est déjà inaccessible */
  }
}

/* ---------------------------------------------------------------- */
/* Mise en forme                                                     */
/* ---------------------------------------------------------------- */

const formatDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function dateLisible(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : formatDate.format(d);
}

export const pourcent = (valeur, total) =>
  total > 0 ? Math.round((valeur / total) * 100) : 0;
