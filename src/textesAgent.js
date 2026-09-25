/* ==================================================================
   Ce que l'espace admin montre à l'agent IA d'un exercice ou d'une
   question de QCM : un texte court, borné pour ménager le quota.
   Utilisé par les suggestions de compétence (components/AssistantAdmin.jsx)
   et par la page « Gérer le contenu ».
   ================================================================== */

export const couper = (t, max) => String(t ?? "").slice(0, max);

/* Le texte qu'on montre à l'agent pour un exercice ou une question. */
export const texteExercice = (e) =>
  couper(`Exercice : ${e.titre}\n${e.enonce || e.texteEnonce || ""}`, 1100);

export const texteQuestion = (x) =>
  couper(
    `Question de QCM : ${x.enonce}\nRéponses proposées : ${x.options.filter(Boolean).join(" | ")}\nBonne réponse : ${x.options[x.bonne] ?? ""}`,
    1100
  );
