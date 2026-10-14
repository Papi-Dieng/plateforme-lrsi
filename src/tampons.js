import { matieres } from "./data/matieres";
import { lireChapitresLus, lireExercicesTravailles, lireScores, refChapitre } from "./progression";

/* ==================================================================
   Les tampons : ce que l'étudiant a gagné en révisant (maquette
   « 01 · Mon profil », 14 octobre 2026).

   Six tampons, calculés à partir de ce qui est déjà enregistré : aucun
   nouveau stockage, rien à mettre à jour quand la progression change.
   Un tampon est soit gagné (avec la date), soit en cours (avec son
   avancée), ce qui donne un but au lieu d'un refus.

   Ils ne récompensent que le travail régulier, jamais la vitesse : le
   but est de revenir, pas de cliquer.
   ================================================================== */

const jour = (iso) => (typeof iso === "string" ? iso.slice(0, 10) : null);

/* La plus longue série de jours d'affilée avec au moins une activité, et
   le premier jour actif. Mêmes dates que la carte « Régularité » de Ma
   progression (pages/Progression.jsx). */
export function joursActifs({ scores, exercices, chapitres }) {
  const dates = [
    ...Object.values(scores).map((s) => s.date),
    ...Object.values(exercices).map((e) => e.date),
    ...Object.values(chapitres).map((c) => c.date),
  ]
    .map(jour)
    .filter(Boolean);
  const uniques = [...new Set(dates)].sort();
  let record = 0;
  let courant = 0;
  uniques.forEach((j, i) => {
    const veille = i > 0 && (new Date(j) - new Date(uniques[i - 1])) / 86400000 === 1;
    courant = veille ? courant + 1 : 1;
    record = Math.max(record, courant);
  });
  return { jours: uniques, record, premier: uniques[0] ?? null };
}

const dateLisible = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "";

/* [{ cle, titre, texte, gagne, le, avancee: [fait, total] }] */
export function lireTampons({
  scores = lireScores(),
  exercices = lireExercicesTravailles(),
  chapitres = lireChapitresLus(),
} = {}) {
  const { record, premier } = joursActifs({ scores, exercices, chapitres });
  const nbChapitres = Object.keys(chapitres).length;
  const nbExercices = Object.keys(exercices).length;
  const sansFaute = Object.values(scores).find((s) => s.total > 0 && s.score === s.total);

  // Une matière entièrement lue : tous ses chapitres publiés et
  // disponibles (un chapitre annoncé mais pas encore écrit ne compte pas).
  const lusDe = (m) => m.chapitres.filter((c) => chapitres[refChapitre(m.id, c.titre)]).length;
  const disponiblesDe = (m) => m.chapitres.filter((c) => c.statut === "disponible");
  const complete = matieres.find(
    (m) => disponiblesDe(m).length > 0 && disponiblesDe(m).every((c) => chapitres[refChapitre(m.id, c.titre)])
  );
  // Les matières commencées : au moins un chapitre lu.
  const commencees = matieres.filter((m) => lusDe(m) > 0).length;

  return [
    {
      cle: "premiere-feuille",
      titre: "Première feuille",
      texte: premier ? `Ton premier chapitre lu, le ${dateLisible(premier)}.` : "Lis ton premier chapitre.",
      gagne: nbChapitres > 0,
      avancee: [Math.min(nbChapitres, 1), 1],
    },
    {
      cle: "sept-jours",
      titre: "Sept jours de suite",
      texte: "Une semaine de révision sans un seul trou.",
      gagne: record >= 7,
      avancee: [Math.min(record, 7), 7],
    },
    {
      cle: "sans-faute",
      titre: "Sans faute",
      texte: sansFaute ? "Un QCM réussi sans aucune erreur." : "Réussis un QCM sans aucune erreur.",
      gagne: Boolean(sansFaute),
      avancee: [sansFaute ? 1 : 0, 1],
    },
    {
      cle: "matiere-complete",
      titre: "Couche par couche",
      texte: complete ? `Tous les chapitres publiés de ${complete.nomCourt || complete.nom}, lus.` : "Lis tous les chapitres publiés d'une matière.",
      gagne: Boolean(complete),
      avancee: [complete ? 1 : 0, 1],
    },
    {
      cle: "toutes-matieres",
      titre: "Toutes les branches",
      texte: "Commencer chaque matière publiée.",
      gagne: matieres.length > 0 && commencees >= matieres.length,
      avancee: [commencees, Math.max(matieres.length, 1)],
    },
    {
      cle: "dix-corriges",
      titre: "Dix corrigés",
      texte: "Travailler dix exercices jusqu'à la correction.",
      gagne: nbExercices >= 10,
      avancee: [Math.min(nbExercices, 10), 10],
    },
  ];
}
