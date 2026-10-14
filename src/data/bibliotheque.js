// Bibliothèque : uniquement des ressources dont la diffusion est autorisée.
//
// statut = "libre"   → ressource publiée par son auteur en accès libre, lien externe
// couverture  → l'image de la vraie couverture : un fichier de public/
//               (« couvertures/x.jpg », servi par le site lui-même, rien
//               n'est demandé ailleurs) ou une adresse complète. Sans elle,
//               la page compose une couverture à partir du titre.
// statut = "attente" → ressource identifiée mais NON publiée tant que
//                      l'autorisation n'est pas obtenue. Aucun fichier n'est hébergé.

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const ressources = [];

export const typesRessource = [
  "Livre",
  "Spécification",
  "Guide",
  "Documentation",
  "Cours",
  "Annales",
  "TP",
];
