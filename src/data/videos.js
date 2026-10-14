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

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const videosSuggerees = [];
