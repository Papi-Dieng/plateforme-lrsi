import { competences } from "./data/competences";
import { getMatiere, matieres } from "./data/matieres";
import { qcms } from "./data/qcm";

/* ==================================================================
   Analyse des compétences : forces, faiblesses, modules à améliorer.

   Source unique : le détail question par question de la DERNIÈRE
   tentative de chaque QCM. Les exercices n'entrent pas dans le calcul,
   parce qu'ouvrir une correction prouve qu'on a travaillé, pas qu'on a
   réussi. Mélanger les deux fausserait le verdict.

   Garde-fou : en dessous de MINIMUM_REPONSES, aucune étiquette n'est
   posée. Une compétence jugée sur une ou deux questions ne veut rien
   dire, et annoncer une faiblesse à tort décourage pour rien.
   ================================================================== */

// À relever au fur et à mesure que le nombre de questions augmente.
// Avec une vingtaine de QCM par filière, une valeur autour de 8 ou 10
// donnera des verdicts nettement plus fiables.
export const MINIMUM_REPONSES = 3;

export const SEUIL_FORCE = 80;
export const SEUIL_FAIBLESSE = 50;

export const niveaux = {
  force: {
    cle: "force",
    label: "Force",
    ton: "accent",
    barre: "bg-accent-500",
    puce: "bg-accent-50 text-accent-700 ring-accent-300/60 dark:bg-accent-500/15 dark:text-accent-300",
  },
  "a-consolider": {
    cle: "a-consolider",
    label: "À consolider",
    ton: "sun",
    barre: "bg-sun-500",
    puce: "bg-sun-100 text-sun-900 ring-sun-400/50 dark:bg-sun-500/15 dark:text-sun-300",
  },
  faiblesse: {
    cle: "faiblesse",
    label: "Faiblesse",
    ton: "flame",
    barre: "bg-flame-500",
    puce: "bg-flame-100 text-flame-700 ring-flame-300/60 dark:bg-flame-500/15 dark:text-flame-400",
  },
  "non-evaluee": {
    cle: "non-evaluee",
    label: "Pas assez de réponses",
    ton: "neutre",
    barre: "bg-ink-300 dark:bg-ink-700",
    puce: "bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300",
  },
};

/* ---------------------------------------------------------------- */

export function analyserCompetences(scores) {
  const releve = {};

  Object.values(scores ?? {}).forEach((s) => {
    (s.detail ?? []).forEach(({ competence, correct }) => {
      if (!competence) return;
      releve[competence] ??= { justes: 0, total: 0 };
      releve[competence].total += 1;
      if (correct) releve[competence].justes += 1;
    });
  });

  return competences.map((c) => {
    const { justes, total } = releve[c.id] ?? { justes: 0, total: 0 };
    const taux = total > 0 ? Math.round((justes / total) * 100) : null;
    const evaluee = total >= MINIMUM_REPONSES;

    let niveau = "non-evaluee";
    if (evaluee) {
      if (taux >= SEUIL_FORCE) niveau = "force";
      else if (taux >= SEUIL_FAIBLESSE) niveau = "a-consolider";
      else niveau = "faiblesse";
    }

    return {
      ...c,
      justes,
      total,
      taux,
      evaluee,
      niveau,
      manquantes: Math.max(MINIMUM_REPONSES - total, 0),
      nomMatiere: getMatiere(c.matiere)?.nom ?? c.matiere,
    };
  });
}

export const forces = (analyse) =>
  analyse.filter((c) => c.niveau === "force").sort((a, b) => b.taux - a.taux);

export const faiblesses = (analyse) =>
  analyse
    .filter((c) => c.niveau === "faiblesse" || c.niveau === "a-consolider")
    .sort((a, b) => a.taux - b.taux);

export const nonEvaluees = (analyse) =>
  analyse.filter((c) => c.niveau === "non-evaluee");

/* ---------------------------------------------------------------- */
/* Modules à améliorer                                               */
/*                                                                   */
/* Chaque compétence fragile désigne ses chapitres. On déduplique, on */
/* garde la compétence la plus faible comme motif, et on obtient une  */
/* liste de chapitres à relire — pas un jugement sur l'étudiant.      */
/* ---------------------------------------------------------------- */

export function modulesAAmeliorer(analyse) {
  const modules = new Map();

  faiblesses(analyse).forEach((c) => {
    c.chapitres.forEach((chapitre) => {
      const cle = `${c.matiere}|${chapitre}`;
      const existant = modules.get(cle);
      if (existant && existant.taux <= c.taux) return;
      modules.set(cle, {
        cle,
        chapitre,
        matiere: c.matiere,
        nomMatiere: c.nomMatiere,
        motif: c.nom,
        taux: c.taux,
        niveau: c.niveau,
      });
    });
  });

  return [...modules.values()].sort((a, b) => a.taux - b.taux);
}

/* Compte de réponses enregistrées, pour situer la fiabilité globale. */
export const reponsesEnregistrees = (analyse) =>
  analyse.reduce((n, c) => n + c.total, 0);

/* ---------------------------------------------------------------- */
/* Couverture de l'analyse                                           */
/*                                                                   */
/* Ne regarde pas l'étudiant mais le CONTENU publié : combien de     */
/* compétences possèdent au moins une question, et combien en ont    */
/* assez pour qu'un verdict soit possible. C'est la liste de ce qui  */
/* reste à écrire.                                                   */
/* ---------------------------------------------------------------- */

export function couvertureCompetences() {
  const questionsPar = {};
  qcms.forEach((q) =>
    q.questions.forEach((question) => {
      if (!question.competence) return;
      questionsPar[question.competence] =
        (questionsPar[question.competence] ?? 0) + 1;
    })
  );

  const avecQuestion = competences.filter(
    (c) => (questionsPar[c.id] ?? 0) > 0
  ).length;
  const evaluables = competences.filter(
    (c) => (questionsPar[c.id] ?? 0) >= MINIMUM_REPONSES
  ).length;

  const matieresSansQcm = matieres
    .filter((m) => !qcms.some((q) => q.matiere === m.id))
    .map((m) => m.nom);

  return {
    total: competences.length,
    avecQuestion,
    evaluables,
    matieresSansQcm,
    questionsPar,
  };
}
