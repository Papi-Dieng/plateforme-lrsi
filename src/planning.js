/* ==================================================================
   Planning de révision.

   L'étudiant note une évaluation (matière, date) ; le site en tire un
   programme jour par jour jusqu'à la veille, à partir de SES résultats :
   d'abord, si la matière est fragile (src/analyseMatieres.js), tout son
   cours à relire et ses exercices, puis ce qui n'est pas encore fait.
   L'avant-veille, un devoir en conditions réelles s'il en existe un ;
   la veille, refaire les QCM de la matière.

   Tout reste dans le navigateur (clé `lrsi-planning`) et part dans la
   sauvegarde. Rien n'est inventé : chaque tâche renvoie vers un
   contenu qui existe sur la plateforme.

   `construirePlan` est pur : il reçoit le contenu et la progression en
   paramètres, ce qui permet de le tester sans navigateur.
   ================================================================== */

export const CLE_PLANNING = "lrsi-planning";

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

// `evenements` : l'emploi du temps de l'étudiant (cours, TD, séances de
// révision…), voir src/emploiDuTemps.js.
const vide = () => ({ evaluations: [], faites: {}, evenements: [] });

export function lirePlanning() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_PLANNING) ?? "null");
    if (!brut || !Array.isArray(brut.evaluations)) return vide();
    return {
      evaluations: brut.evaluations,
      faites: brut.faites && typeof brut.faites === "object" ? brut.faites : {},
      evenements: Array.isArray(brut.evenements) ? brut.evenements : [],
    };
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

/* Les tâches candidates, dans l'ordre où il vaut mieux les faire.
   `analyse` : le niveau de chaque matière (src/analyseMatieres.js). */
function taches(evaluation, { matieres, exercices, analyse = [], exercicesTravailles, chapitresLus = {} }) {
  const matiere = matieres.find((m) => m.id === evaluation.matiere);
  if (!matiere) return [];
  const liste = [];
  const vues = new Set();
  const ajouter = (t) => {
    if (vues.has(t.cle)) return;
    vues.add(t.cle);
    liste.push(t);
  };

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

  const disponibles = matiere.chapitres.filter((c) => c.statut === "disponible");
  const pasLu = (c) => !chapitresLus[`${matiere.id}::${c.titre}`];
  const pasFait = (e) => e.matiere === matiere.id && !exercicesTravailles[e.id];

  // 1. Matière fragile : tout le cours à relire (même les chapitres déjà
  // lus) et les exercices pas encore faits, en tête du programme.
  const niveau = analyse.find((a) => a.id === matiere.id);
  if (niveau?.niveau === "faiblesse" || niveau?.niveau === "a-consolider") {
    const motif = `${matiere.nom} à ${niveau.taux} % aux QCM : ${
      niveau.niveau === "faiblesse" ? "une matière fragile, à reprendre" : "à consolider"
    }.`;
    for (const c of disponibles) ajouter(tacheChapitre(c.titre, motif));
    for (const e of exercices) if (pasFait(e)) ajouter(tacheExercice(e, motif));
  }

  // 2. Sinon, ou en plus : les chapitres pas encore lus, puis les
  // exercices pas encore faits.
  for (const c of disponibles) if (pasLu(c)) ajouter(tacheChapitre(c.titre, "Pour couvrir tout le programme."));
  for (const e of exercices) if (pasFait(e)) ajouter(tacheExercice(e, "Pour t'entraîner sur toute la matière."));
  return liste;
}

/* Toutes les tâches utiles pour une évaluation, par ordre de priorité,
   plus le devoir blanc et les QCM de la veille : ce que l'IA organise
   dans l'emploi du temps (src/programmeIA.js). */
export function tachesPourEvaluation(evaluation, contexte) {
  const liste = taches(evaluation, contexte);
  const devoir = (contexte.devoirs ?? []).find((d) => d.matiere === evaluation.matiere);
  if (devoir) {
    liste.push({
      cle: `devoir:${devoir.id}`,
      type: "devoir",
      titre: `Faire le devoir « ${devoir.titre} » en conditions réelles`,
      detail: "À faire deux ou trois jours avant l'examen, minuteur lancé, sans le cours.",
      to: `/examens/${devoir.id}`,
    });
  }
  for (const q of contexte.qcms.filter((x) => x.matiere === evaluation.matiere)) {
    if (liste.some((t) => t.cle === `qcm:${q.id}`)) continue;
    liste.push({ cle: `qcm:${q.id}`, type: "qcm", titre: `Refaire le QCM « ${q.titre} »`, detail: "Pour vérifier que tout est acquis, la veille de préférence.", to: `/qcm/${q.id}` });
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
