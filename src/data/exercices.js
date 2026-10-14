// Les exercices, publiés depuis l'espace admin.
// Énoncés originaux : aucun sujet d'examen ni document universitaire repris.

export const difficultes = ["Facile", "Moyen", "Difficile"];

/* Le niveau à afficher pour un exercice, ou "" s'il n'en a pas.

   Deux choix, demandés le 14 octobre 2026 :
     - l'exercice lui-même peut n'avoir aucun niveau (`difficulte` vide,
       « Aucun » dans l'espace admin) ;
     - une matière peut ne pas en vouloir du tout (`difficultes: false`
       sur la matière) : ses exercices n'en montrent jamais, même si
       l'un d'eux en porte un.

   Par défaut une matière en affiche : le contenu déjà publié ne change
   pas. Partout où un niveau s'affiche ou sert de filtre, on passe par
   cette fonction. */
export function niveauExercice(exercice, matiere) {
  if (!exercice?.difficulte) return "";
  if (matiere && matiere.difficultes === false) return "";
  return difficultes.includes(exercice.difficulte) ? exercice.difficulte : "";
}

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const exercices = [];

export const getExercice = (id) => exercices.find((e) => e.id === id);
