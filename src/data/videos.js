/* ==================================================================
   Vidéos d'explication.

   Aucune vidéo n'est hébergée par la plateforme : on ne conserve que
   l'identifiant YouTube, et la lecture se fait chez YouTube.

   Les entrées ci-dessous sont des EMPLACEMENTS : le titre décrit la
   vidéo recherchée, mais `youtubeId` reste vide tant que le lien n'a
   pas été choisi. Deux façons de le remplir :

     - depuis le site, avec le bouton « Ajouter une vidéo » du tableau
       de bord, qui enregistre le lien dans le navigateur ;
     - ici, en collant l'identifiant à onze caractères dans
       `youtubeId` pour que la vidéo apparaisse pour tout le monde.

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
