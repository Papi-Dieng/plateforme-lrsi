/* ==================================================================
   Les semestres de la plateforme : le semestre 1 et le semestre 2,
   toujours séparés.

   Une matière n'a pas « un » semestre : chacun de ses chapitres
   appartient au semestre 1 OU au semestre 2 (`chapitre.semestre`). La
   page d'une matière montre donc sa partie semestre 1 et sa partie
   semestre 2 à part, et le filtre de la page Cours garde les matières
   qui ont des chapitres dans le semestre choisi.

   Un chapitre sans semestre (contenu publié avant cette règle) en
   reçoit un ici : celui de sa matière si elle n'en indiquait qu'un,
   sinon la première moitié des chapitres va au semestre 1 et le reste
   au semestre 2. L'espace admin permet de corriger chapitre par
   chapitre. Le relais garde la même règle (serveur-ia/contenu.js).
   ================================================================== */

export const SEMESTRES = [1, 2];

// « Semestre 2 » → [2] ; « Semestres 1 et 2 » → [1, 2] ; 2 → [2].
export const numerosSemestre = (texte) => (String(texte ?? "").match(/\d+/g) ?? []).map(Number);

// Le semestre écrit (1 ou 2), ou null s'il n'y en a pas de valable.
function semestreEcrit(valeur) {
  const n = [...new Set(numerosSemestre(valeur))];
  return n.length === 1 && SEMESTRES.includes(n[0]) ? n[0] : null;
}

/* Le semestre d'un chapitre, à sa place `index` parmi `total`. */
export function semestreChapitre(chapitre, index, total, semestreMatiere) {
  return (
    semestreEcrit(chapitre?.semestre) ??
    semestreEcrit(semestreMatiere) ??
    (index < Math.ceil(total / 2) ? 1 : 2)
  );
}

/* Donne un semestre à chaque chapitre de la matière (en place). Le
   semestre de la matière, qui n'a plus de sens, est retiré. */
export function normaliserChapitres(matiere) {
  const chapitres = Array.isArray(matiere?.chapitres) ? matiere.chapitres : [];
  chapitres.forEach((c, i) => {
    c.semestre = semestreChapitre(c, i, chapitres.length, matiere.semestre);
  });
  delete matiere.semestre;
  return matiere;
}

/* Les semestres où la matière a au moins un chapitre, dans l'ordre. */
export const semestresMatiere = (matiere) =>
  SEMESTRES.filter((n) => (matiere?.chapitres ?? []).some((c) => c.semestre === n));

/* Les chapitres d'un semestre. */
export const chapitresDuSemestre = (matiere, numero) =>
  (matiere?.chapitres ?? []).filter((c) => c.semestre === numero);
