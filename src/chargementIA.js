/* ==================================================================
   Ce que dit l'animation d'attente de l'IA (components/ChargementIA.jsx),
   pour chaque outil.

   Les étapes décrivent ce qui se passe vraiment, dans l'ordre : la
   plateforme cherche d'abord ses propres contenus, le relais ajoute les
   consignes, puis Google Gemini rédige. Elles défilent au rythme d'une
   ligne toutes les deux secondes, sans suivre la progression réelle de
   la requête, que personne ne connaît : l'animation montre que ça
   travaille, elle ne prétend pas mesurer.
   ================================================================== */

export const ETAPES_ASSISTANT = [
  {
    statut: "Recherche dans la plateforme",
    lignes: [
      "Lecture de ta question…",
      "Recherche des chapitres liés…",
      "Recherche des exercices et des QCM…",
      "Sélection des contenus utiles…",
    ],
  },
  {
    statut: "Préparation de la demande",
    lignes: [
      "Ajout des consignes de la matière…",
      "Ajout des extraits du cours…",
      "Envoi à Gemini par le relais…",
    ],
  },
  {
    statut: "Rédaction de la réponse",
    lignes: [
      "Gemini rédige l'explication…",
      "Réception de la réponse…",
      "Mise en forme…",
    ],
  },
];

export const ETAPES_AVIS = [
  {
    statut: "Comparaison avec le corrigé",
    lignes: [
      "Lecture de ta réponse…",
      "Lecture de l'énoncé et du corrigé…",
      "Envoi à Gemini par le relais…",
    ],
  },
  {
    statut: "Rédaction de l'avis",
    lignes: [
      "Ce qui est juste…",
      "Ce qui manque…",
      "Ce qui est faux…",
      "Un conseil pour la suite…",
    ],
  },
];

export const ETAPES_PROGRAMME = [
  {
    statut: "Préparation",
    lignes: [
      "Lecture de tes créneaux libres…",
      "Tâches classées : tes points faibles d'abord…",
      "Envoi à Gemini par le relais…",
    ],
  },
  {
    statut: "Organisation des séances",
    lignes: [
      "Répartition entre les matières…",
      "Chaque séance avant son examen…",
      "Des QCM la veille de chaque examen…",
      "Pauses entre les longues séances…",
    ],
  },
  {
    statut: "Vérification",
    lignes: [
      "Séances hors de tes créneaux écartées…",
      "Chevauchements écartés…",
      "Préparation de l'emploi du temps…",
    ],
  },
];
