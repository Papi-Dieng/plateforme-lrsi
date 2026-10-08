/* ==================================================================
   L'examen blanc : un QCM composé au hasard, avec des questions prises
   dans les QCM d'une ou plusieurs matières, et chronométré (une minute
   par question). Il se passe comme un QCM ordinaire (pages/Qcm.jsx),
   mais n'entre ni dans la révision espacée ni dans les statistiques :
   ses questions changent à chaque tirage.

   L'adresse le décrit entièrement : /qcm/examen-blanc?m=reseaux,bdd&n=20.
   ================================================================== */

export const ID_EXAMEN_BLANC = "examen-blanc";
export const MIN_QUESTIONS = 5;
export const MAX_QUESTIONS = 40;

/* Les questions disponibles pour ces matières (toutes si vide), chacune
   avec la matière de son QCM. */
export function questionsDisponibles(qcms, matieres = []) {
  return qcms
    .filter((q) => matieres.length === 0 || matieres.includes(q.matiere))
    .flatMap((q) => q.questions.map((question) => ({ ...question, matiere: q.matiere, source: q.id })));
}

// Mélange de Fisher-Yates ; `hasard` remplaçable pour les tests.
export function melanger(liste, hasard = Math.random) {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i -= 1) {
    const j = Math.floor(hasard() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/* Compose l'examen. `n` est ramené entre 1 et le nombre de questions
   disponibles. Renvoie null s'il n'y a aucune question. */
export function composerExamenBlanc(qcms, { matieres = [], n = 20 } = {}, hasard = Math.random) {
  const disponibles = questionsDisponibles(qcms, matieres);
  if (disponibles.length === 0) return null;
  const nombre = Math.min(Math.max(Math.round(n) || 0, 1), disponibles.length);
  const questions = melanger(disponibles, hasard).slice(0, nombre);
  const choisies = [...new Set(questions.map((q) => q.matiere))];
  return {
    id: ID_EXAMEN_BLANC,
    blanc: true,
    titre: "Examen blanc",
    // Une seule matière : c'est la sienne (lien vers son cours) ; sinon aucune.
    matiere: choisies.length === 1 ? choisies[0] : null,
    matieres: choisies,
    duree: `${nombre} min`,
    questions,
  };
}

/* Les réglages lus dans l'adresse (?m=a,b&n=20). */
export function lireReglages(params, matieresConnues) {
  const m = (params.get("m") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => matieresConnues.some((x) => x.id === s));
  const n = Number(params.get("n"));
  return { matieres: [...new Set(m)], n: Number.isFinite(n) && n > 0 ? n : 20 };
}
