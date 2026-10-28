/* ==================================================================
   Examens.

   Deux rubriques :
   - les DEVOIRS (`examens` dans le code), rédigés pour la plateforme :
     un sujet en plusieurs parties ou en PDF, une durée, et le corrigé
     affiché à la fin ;
   - les EXAMENS (`annales` dans le code), sujets d'examens passés de
     l'établissement. Depuis le 28 octobre 2026, ils se passent comme
     un devoir (mêmes champs, même page) et gardent en plus leur année,
     leur session et l'autorisation écrite. Aucun n'est publié sans
     elle : l'espace admin l'exige, et le relais ne montre aux
     étudiants que les examens autorisés qui ont un sujet.

   Ces listes servent de contenu par défaut. Dès qu'un contenu est
   publié depuis l'espace admin, c'est lui qui s'affiche.
   ================================================================== */

/* Vide : tout le contenu vient de l'espace admin (voir src/contenu.js).
   Le contenu de démonstration d'avant le 14 octobre 2026 est gardé dans
   src/data/demonstration.js, pour les tests et comme modèle de forme. */
export const examens = [];

export const annales = [];

// Un examen a un sujet : des parties, un PDF, ou un lien de l'ancienne
// forme (sujet hébergé ailleurs, avant le 28 octobre 2026).
export const aUnSujet = (a) => (a.parties?.length ?? 0) > 0 || Boolean(a.pdfEnonce) || Boolean(a.lienSujet);

// Un examen qui se passe sur le site, et pas seulement un lien.
export const sePasseSurLeSite = (a) => (a.parties?.length ?? 0) > 0 || Boolean(a.pdfEnonce);

/* La même règle que le relais (serveur-ia/contenu.js) : jamais sans
   autorisation, jamais sans sujet. Le relais retire déjà les autres ;
   le site les écarte aussi, au cas où. */
export const examenVisible = (a) => a.autorisation?.obtenue === true && aUnSujet(a);

export const estExamenPasse = (id) => annales.some((a) => a.id === id);

// Les devoirs comme les examens passés s'ouvrent sur la même page.
export const getExamen = (id) =>
  examens.find((x) => x.id === id) ?? annales.find((a) => a.id === id && examenVisible(a) && sePasseSurLeSite(a));

// Un examen en PDF se note sur le total indiqué dans l'admin ; un
// examen écrit, sur la somme de ses parties.
export const totalPoints = (examen) =>
  examen.format === "pdf"
    ? examen.pointsTotal ?? 20
    : examen.parties.reduce((n, p) => n + (p.points ?? 0), 0);
