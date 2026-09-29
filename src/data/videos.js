/* ==================================================================
   Vidéos d'explication.

   Aucune vidéo n'est hébergée par la plateforme : on ne conserve que
   l'identifiant YouTube, et la lecture se fait chez YouTube.

   Seul l'admin ajoute des vidéos, depuis « Gérer le contenu » (onglet
   Vidéos) ; les entrées ci-dessous sont le contenu par défaut. Une
   entrée dont `youtubeId` est vide est un emplacement réservé : elle
   n'est PAS montrée aux étudiants tant que le lien n'est pas renseigné.

   Dans l'adresse https://www.youtube.com/watch?v=AbCdEf12345,
   l'identifiant est « AbCdEf12345 ».
   ================================================================== */

export const videosSuggerees = [
  {
    id: "sugg-osi",
    titre: "Le modèle OSI expliqué couche par couche",
    resume: "Pour visualiser l'encapsulation avant le TD.",
    matiere: "reseaux",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-sous-reseaux",
    titre: "Découper un réseau en sous-réseaux",
    resume: "La méthode de calcul, pas à pas.",
    matiere: "reseaux",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-ordonnancement",
    titre: "Ordonnancement : FIFO, SJF et tourniquet",
    resume: "Les diagrammes d'exécution en images.",
    matiere: "systemes",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-complexite",
    titre: "La complexité en grand O, sans mathématiques",
    resume: "Comparer deux algorithmes en une minute.",
    matiere: "algorithmique",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-sql",
    titre: "Les jointures SQL illustrées",
    resume: "INNER, LEFT et RIGHT, enfin clairs.",
    matiere: "bdd",
    duree: "—",
    youtubeId: null,
  },
];
