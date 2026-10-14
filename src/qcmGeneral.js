/* ==================================================================
   Le QCM « toutes les matières » : un questionnaire composé au hasard
   avec des questions prises dans tous les QCM du site, chronométré (une
   minute par question). Il se passe comme un QCM ordinaire
   (pages/Qcm.jsx), mais n'entre ni dans la révision espacée ni dans les
   statistiques : ses questions changent à chaque tirage.

   Il remplace l'examen blanc et ses réglages (14 octobre 2026) : une
   seule adresse, /qcm/toutes-les-matieres, et un seul bouton.
   ================================================================== */

export const ID_TOUTES_MATIERES = "toutes-les-matieres";
export const NOMBRE_QUESTIONS = 20;

/* Toutes les questions du site, chacune avec la matière et le QCM d'où
   elle vient. */
export function questionsDisponibles(qcms) {
  return qcms.flatMap((q) => q.questions.map((question) => ({ ...question, matiere: q.matiere, source: q.id })));
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

/* Compose le questionnaire. `n` est ramené entre 1 et le nombre de
   questions qui existent. Renvoie null s'il n'y en a aucune. */
export function composerQcmGeneral(qcms, n = NOMBRE_QUESTIONS, hasard = Math.random) {
  const disponibles = questionsDisponibles(qcms);
  if (disponibles.length === 0) return null;
  const nombre = Math.min(Math.max(Math.round(n) || 0, 1), disponibles.length);
  const questions = melanger(disponibles, hasard).slice(0, nombre);
  const matieres = [...new Set(questions.map((q) => q.matiere))];
  return {
    id: ID_TOUTES_MATIERES,
    // Tiré au hasard : ni statistiques ni révision espacée.
    tirage: true,
    titre: "QCM toutes matières",
    // Une seule matière tirée : c'est la sienne (lien vers son cours) ; sinon aucune.
    matiere: matieres.length === 1 ? matieres[0] : null,
    matieres,
    duree: `${nombre} min`,
    questions,
  };
}
