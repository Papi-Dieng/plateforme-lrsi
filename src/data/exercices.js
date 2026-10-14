// Les exercices, publiés depuis l'espace admin.
// Énoncés originaux : aucun sujet d'examen ni document universitaire repris.

export const difficultes = ["Facile", "Moyen", "Difficile"];

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const exercices = [];

export const getExercice = (id) => exercices.find((e) => e.id === id);
