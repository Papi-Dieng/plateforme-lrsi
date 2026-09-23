/* ==================================================================
   Planning de révision.

   L'étudiant note une évaluation (matière, date) ; le site en tire un
   programme jour par jour jusqu'à la veille, à partir de SES résultats :
   d'abord ses compétences les plus faibles, avec leurs chapitres à
   relire, leurs exercices et leurs QCM, puis le reste de la matière.
   L'avant-veille, un devoir en conditions réelles s'il en existe un ;
   la veille, refaire les QCM de la matière.

   Tout reste dans le navigateur (clé `lrsi-planning`) et part dans la
   sauvegarde. Rien n'est inventé : chaque tâche renvoie vers un
   contenu qui existe sur la plateforme.

   `construirePlan` est pur : il reçoit le contenu et la progression en
   paramètres, ce qui permet de le tester sans navigateur.
   ================================================================== */

export const CLE_PLANNING = "lrsi-planning";

const ORDRE_NIVEAUX = { faiblesse: 0, "a-consolider": 1, "non-evaluee": 2, force: 3 };

/* ---- Dates, en jours locaux « AAAA-MM-JJ » ---- */

export const aujourdhui = () => versJour(new Date());

export function versJour(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ajouterJours(jour, n) {
  const [a, m, j] = jour.split("-").map(Number);
  return versJour(new Date(a, m - 1, j + n));
}

export function joursEntre(debut, fin) {
  const [a1, m1, j1] = debut.split("-").map(Number);
  const [a2, m2, j2] = fin.split("-").map(Number);
  return Math.round((new Date(a2, m2 - 1, j2) - new Date(a1, m1 - 1, j1)) / 86_400_000);
}

/* ---- Stockage ---- */

const vide = () => ({ evaluations: [], faites: {} });

export function lirePlanning() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_PLANNING) ?? "null");
    if (!brut || !Array.isArray(brut.evaluations)) return vide();
    return { evaluations: brut.evaluations, faites: brut.faites && typeof brut.faites === "object" ? brut.faites : {} };
  } catch {
    return vide();
  }
}

export function ecrirePlanning(planning) {
  try {
    localStorage.setItem(CLE_PLANNING, JSON.stringify(planning));
  } catch {
    /* stockage indisponible : le planning ne sera pas gardé */
  }
}

/* ---- Construire le programme ---- */

/* Les tâches candidates, dans l'ordre où il vaut mieux les faire. */
function taches(evaluation, { matieres, competences, exercices, qcms, analyse, exercicesTravailles, chapitresLus = {} }) {
  const matiere = matieres.find((m) => m.id === evaluation.matiere);
  if (!matiere) return [];
  const niveauDe = new Map(analyse.map((c) => [c.id, c]));
  const liste = [];
  const vues = new Set();
  const ajouter = (t) => {
    if (vues.has(t.cle)) return;
    vues.add(t.cle);
    liste.push(t);
  };
  const disponible = (titre) => matiere.chapitres.some((c) => c.titre === titre && c.statut === "disponible");

  const tacheChapitre = (titre, motif) => ({
    cle: `chapitre:${matiere.id}:${titre}`,
    type: "chapitre",
    titre: `Relire le chapitre « ${titre} »`,
    detail: motif,
    to: `/cours/${matiere.id}`,
  });
  const tacheExercice = (e, motif) => ({
    cle: `exercice:${e.id}`,
    type: "exercice",
    titre: `Faire l'exercice « ${e.titre} »`,
    detail: motif,
    to: `/exercices/${e.id}`,
  });
  const tacheQcm = (q, motif) => ({
    cle: `qcm:${q.id}`,
    type: "qcm",
    titre: `Faire le QCM « ${q.titre} »`,
    detail: motif,
    to: `/qcm/${q.id}`,
  });

  // 1. Compétences de la matière, de la plus faible à la plus solide.
  const aTravailler = competences
    .filter((c) => c.matiere === matiere.id)
    .map((c) => niveauDe.get(c.id) ?? { ...c, niveau: "non-evaluee", taux: null })
    .sort(
      (a, b) =>
        ORDRE_NIVEAUX[a.niveau] - ORDRE_NIVEAUX[b.niveau] || (a.taux ?? 101) - (b.taux ?? 101)
    );

  for (const c of aTravailler) {
    if (c.niveau === "force") continue;
    const motif =
      c.niveau === "non-evaluee"
        ? `Compétence « ${c.nom} » : pas encore assez de réponses pour la juger.`
        : `Compétence « ${c.nom} » à ${c.taux} % : ${c.niveau === "faiblesse" ? "ton point le plus faible" : "à consolider"}.`;
    for (const titre of c.chapitres ?? []) if (disponible(titre)) ajouter(tacheChapitre(titre, motif));
    for (const e of exercices) {
      if (e.competence === c.id && !exercicesTravailles[e.id]) ajouter(tacheExercice(e, motif));
    }
    for (const q of qcms) {
      if (q.questions.some((x) => x.competence === c.id)) ajouter(tacheQcm(q, motif));
    }
  }

  // 2. Le reste de la matière : chapitres pas encore lus, puis exercices
  // pas encore faits. (Un chapitre lu revient quand même au point 1 si sa
  // compétence est faible : il faut alors le relire.)
  for (const ch of matiere.chapitres) {
    if (ch.statut === "disponible" && !chapitresLus[`${matiere.id}::${ch.titre}`]) {
      ajouter(tacheChapitre(ch.titre, "Pour couvrir tout le programme."));
    }
  }
  for (const e of exercices) {
    if (e.matiere === matiere.id && !exercicesTravailles[e.id]) ajouter(tacheExercice(e, "Pour t'entraîner sur toute la matière."));
  }
  return liste;
}

/* Le programme d'une évaluation : [{ jour, taches }], plus les tâches
   « en plus » qui n'ont pas trouvé de place, et un message quand il n'y
   a plus de jour de révision. */
export function construirePlan(evaluation, contexte) {
  const debut = contexte.aujourdhui ?? aujourdhui();
  const nbJours = joursEntre(debut, evaluation.date); // jours avant l'évaluation
  if (nbJours <= 0) {
    return { jours: [], enPlus: [], message: nbJours === 0 ? "C'est aujourd'hui : bonne chance !" : "Cette évaluation est passée." };
  }

  const parJour = Math.min(Math.max(Number(evaluation.parJour) || 2, 1), 4);
  const jours = Array.from({ length: nbJours }, (_, i) => ({ jour: ajouterJours(debut, i), taches: [] }));

  // Réservé : la veille, refaire les QCM de la matière ; l'avant-veille,
  // un devoir en conditions réelles, s'il en existe un.
  const qcmsMatiere = contexte.qcms.filter((q) => q.matiere === evaluation.matiere);
  const devoir = (contexte.devoirs ?? []).find((d) => d.matiere === evaluation.matiere);
  const veille = jours.at(-1);
  if (qcmsMatiere.length) {
    veille.taches.push({
      cle: `veille:${evaluation.id}`,
      type: "qcm",
      titre: qcmsMatiere.length > 1 ? "Refaire les QCM de la matière" : `Refaire le QCM « ${qcmsMatiere[0].titre} »`,
      detail: "Dernière révision : vérifier que tout est acquis, sans rien apprendre de nouveau.",
      to: qcmsMatiere.length > 1 ? "/qcm" : `/qcm/${qcmsMatiere[0].id}`,
    });
  }
  if (devoir) {
    const jourDevoir = jours.length >= 2 ? jours.at(-2) : veille;
    jourDevoir.taches.push({
      cle: `devoir:${devoir.id}`,
      type: "devoir",
      titre: `Faire le devoir « ${devoir.titre} » en conditions réelles`,
      detail: "Minuteur lancé, sans le cours : comme le jour de l'évaluation.",
      to: `/examens/${devoir.id}`,
    });
  }

  // Le reste, jour après jour, dans l'ordre de priorité.
  const enPlus = [];
  for (const t of taches(evaluation, contexte)) {
    const jour = jours.find((j) => j.taches.length < parJour);
    if (jour) jour.taches.push(t);
    else enPlus.push(t);
  }
  return { jours, enPlus, message: "" };
}
