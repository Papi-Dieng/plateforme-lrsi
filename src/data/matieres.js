// Les matières, publiées depuis l'espace admin.
//
// `nomCourt` sert aux pastilles de filtre et aux badges, là où le nom
// complet serait trop long. Il n'y a pas de niveau au-dessus de la
// matière : dans cette version, une filière correspond à une matière.
// L'organisation par matière est une proposition, pas le programme officiel.
// Chaque chapitre appartient au semestre 1 ou au semestre 2 (voir
// src/semestres.js) : la page d'une matière les montre à part.
// Aucun document universitaire n'est publié ici : les chapitres décrivent
// seulement la structure prévue.

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const matieres = [];

export const getMatiere = (id) => matieres.find((m) => m.id === id);

export const nomMatiere = (id) => getMatiere(id)?.nom ?? id;
