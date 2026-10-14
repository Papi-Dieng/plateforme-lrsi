// Les QCM, publiés depuis l'espace admin.
// `bonne` est l'indice (base 0) de la réponse correcte dans `options`.

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const qcms = [];

export const getQcm = (id) => qcms.find((q) => q.id === id);
