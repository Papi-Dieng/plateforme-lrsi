/* ==================================================================
   Examens.

   Deux rubriques :
   - les EXAMENS BLANCS, rédigés pour la plateforme : un sujet en
     plusieurs parties, une durée, et le corrigé affiché à la fin ;
   - les ANNALES, sujets d'examens passés de l'établissement. Aucune
     n'est publiée sans autorisation écrite : l'espace admin l'exige,
     et le relais ne montre aux étudiants que les annales marquées
     comme autorisées.

   Ces listes servent de contenu par défaut. Dès qu'un contenu est
   publié depuis l'espace admin, c'est lui qui s'affiche.
   ================================================================== */

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const examens = [];

export const annales = [];

export const getExamen = (id) => examens.find((x) => x.id === id);
// Un examen en PDF se note sur le total indiqué dans l'admin ; un
// examen écrit, sur la somme de ses parties.
export const totalPoints = (examen) =>
  examen.format === "pdf"
    ? examen.pointsTotal ?? 20
    : examen.parties.reduce((n, p) => n + (p.points ?? 0), 0);
