import { matieres } from "./data/matieres";
import { qcms } from "./data/qcm";

/* ==================================================================
   Forces et faiblesses, par matière (Réseaux, Systèmes, Algorithmique…).

   Depuis le 6 octobre 2026, le niveau se mesure par matière et non plus
   par compétence : c'est ce que l'équipe a demandé, et ce qui parle à
   l'étudiant (« tu es fort en Réseaux, à consolider en Systèmes »).

   Source unique : le détail question par question de la DERNIÈRE
   tentative de chaque QCM, rangé dans la matière du QCM. Les exercices
   n'entrent pas dans le calcul : ouvrir une correction prouve qu'on a
   travaillé, pas qu'on a réussi.

   Garde-fou : en dessous de MINIMUM_REPONSES réponses dans une matière,
   aucune étiquette n'est posée. Juger sur une ou deux questions ne veut
   rien dire, et annoncer une faiblesse à tort décourage pour rien.
   ================================================================== */

// À relever quand chaque matière aura une vingtaine de questions.
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

/* Le niveau de chaque matière d'après les scores (src/progression.js).
   Les QCM et les matières sont passés en paramètre pour les tests ; par
   défaut, le contenu publié. */
export function analyserMatieres(scores, { listeQcm = qcms, listeMatieres = matieres } = {}) {
  const releve = {};
  for (const [idQcm, s] of Object.entries(scores ?? {})) {
    const matiere = listeQcm.find((q) => q.id === idQcm)?.matiere;
    if (!matiere) continue;
    releve[matiere] ??= { justes: 0, total: 0 };
    for (const { correct } of s.detail ?? []) {
      releve[matiere].total += 1;
      if (correct) releve[matiere].justes += 1;
    }
  }

  return listeMatieres.map((m) => {
    const { justes, total } = releve[m.id] ?? { justes: 0, total: 0 };
    const taux = total > 0 ? Math.round((justes / total) * 100) : null;
    const evaluee = total >= MINIMUM_REPONSES;
    let niveau = "non-evaluee";
    if (evaluee) {
      if (taux >= SEUIL_FORCE) niveau = "force";
      else if (taux >= SEUIL_FAIBLESSE) niveau = "a-consolider";
      else niveau = "faiblesse";
    }
    return {
      id: m.id,
      nom: m.nom,
      nomCourt: m.nomCourt,
      justes,
      total,
      taux,
      evaluee,
      niveau,
      manquantes: Math.max(MINIMUM_REPONSES - total, 0),
    };
  });
}

export const forces = (analyse) =>
  analyse.filter((m) => m.niveau === "force").sort((a, b) => b.taux - a.taux);

export const faiblesses = (analyse) =>
  analyse
    .filter((m) => m.niveau === "faiblesse" || m.niveau === "a-consolider")
    .sort((a, b) => a.taux - b.taux);

export const nonEvaluees = (analyse) => analyse.filter((m) => m.niveau === "non-evaluee");

export const reponsesEnregistrees = (analyse) => analyse.reduce((n, m) => n + m.total, 0);

/* Les chapitres à revoir dans les matières fragiles, de la plus faible à
   la moins faible : d'abord ceux pas encore lus, puis ceux déjà lus, à
   relire. `lus` : les chapitres lus (src/progression.js). */
export function chapitresARevoir(analyse, lus = {}, { listeMatieres = matieres } = {}) {
  const liste = [];
  for (const f of faiblesses(analyse)) {
    const matiere = listeMatieres.find((m) => m.id === f.id);
    const disponibles = (matiere?.chapitres ?? []).filter((c) => c.statut === "disponible");
    const pasLus = disponibles.filter((c) => !lus[`${f.id}::${c.titre}`]);
    for (const c of pasLus.length ? pasLus : disponibles) {
      liste.push({ cle: `${f.id}|${c.titre}`, chapitre: c.titre, matiere: f.id, nomMatiere: f.nom, taux: f.taux, niveau: f.niveau, dejaLu: !pasLus.length });
    }
  }
  return liste;
}

/* Couverture de l'analyse, pour l'espace admin : combien de questions
   chaque matière possède, et lesquelles en ont assez pour un verdict. */
export function couvertureMatieres({ listeQcm = qcms, listeMatieres = matieres } = {}) {
  const questionsPar = Object.fromEntries(listeMatieres.map((m) => [m.id, 0]));
  for (const q of listeQcm) questionsPar[q.matiere] = (questionsPar[q.matiere] ?? 0) + q.questions.length;
  return {
    total: listeMatieres.length,
    evaluables: listeMatieres.filter((m) => questionsPar[m.id] >= MINIMUM_REPONSES).length,
    questionsPar,
  };
}
