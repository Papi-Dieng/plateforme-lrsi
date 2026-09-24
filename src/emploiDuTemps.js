import { ajouterJours, versJour } from "./planning";

/* ==================================================================
   Emploi du temps de l'étudiant : la logique, sans affichage.

   Un événement (cours, TD, séance de révision, rendez-vous…) :
     { id, titre, description, jour: "AAAA-MM-JJ", debut: "HH:MM",
       fin: "HH:MM", categorie, couleur, matiere, hebdo, jusqua }
   `hebdo` : il revient chaque semaine, le même jour, jusqu'à `jusqua`
   (inclus). Un cours se saisit donc une seule fois.

   Tout est rangé dans le planning (`lrsi-planning`, champ
   `evenements`), donc dans la sauvegarde de l'étudiant.
   ================================================================== */

export const CATEGORIES = ["Cours", "TD / TP", "Révision", "Examen", "Personnel"];

// Classes écrites en entier : Tailwind ne voit que ce qui est écrit.
export const COULEURS = [
  { valeur: "bleu", nom: "Bleu", fond: "bg-brand-600", clair: "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200", pastille: "bg-brand-600" },
  { valeur: "vert", nom: "Vert", fond: "bg-accent-600", clair: "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300", pastille: "bg-accent-600" },
  { valeur: "violet", nom: "Violet", fond: "bg-violet-600", clair: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200", pastille: "bg-violet-600" },
  { valeur: "orange", nom: "Orange", fond: "bg-flame-500", clair: "bg-flame-50 text-flame-800 dark:bg-flame-500/15 dark:text-flame-300", pastille: "bg-flame-500" },
  { valeur: "rose", nom: "Rose", fond: "bg-pink-600", clair: "bg-pink-50 text-pink-800 dark:bg-pink-500/15 dark:text-pink-200", pastille: "bg-pink-600" },
  { valeur: "jaune", nom: "Jaune", fond: "bg-sun-500", clair: "bg-sun-100 text-sun-900 dark:bg-sun-500/15 dark:text-sun-300", pastille: "bg-sun-500" },
  { valeur: "gris", nom: "Gris", fond: "bg-ink-600", clair: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200", pastille: "bg-ink-600" },
];
export const couleur = (valeur) => COULEURS.find((c) => c.valeur === valeur) ?? COULEURS[0];

// Couleur proposée pour chaque catégorie, modifiable dans la fenêtre.
export const COULEUR_PAR_CATEGORIE = { Cours: "bleu", "TD / TP": "violet", Révision: "vert", Examen: "orange", Personnel: "rose" };

/* Les heures affichées dans les vues Semaine et Jour. */
export const HEURE_DEBUT = 7;
export const HEURE_FIN = 22;

/* ---- Heures ---- */

export const enMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
};
export const enHeure = (minutes) => {
  const m = Math.min(Math.max(Math.round(minutes), 0), 24 * 60 - 1);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/* ---- Dates ---- */

export const jourDe = (date) => versJour(date);
export const versDate = (jour) => {
  const [a, m, j] = jour.split("-").map(Number);
  return new Date(a, m - 1, j);
};

/* Le lundi de la semaine du jour donné. */
export function lundiDe(jour) {
  const d = versDate(jour);
  const decalage = (d.getDay() + 6) % 7; // lundi = 0
  return ajouterJours(jour, -decalage);
}

export const joursDeLaSemaine = (jour) => {
  const lundi = lundiDe(jour);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
};

/* Les 42 jours (6 semaines) affichés pour le mois du jour donné. */
export function joursDuMois(jour) {
  const d = versDate(jour);
  const premier = versJour(new Date(d.getFullYear(), d.getMonth(), 1));
  const lundi = lundiDe(premier);
  return Array.from({ length: 42 }, (_, i) => ajouterJours(lundi, i));
}

/* ---- Occurrences ---- */

/* Les événements (répétitions comprises) qui tombent un jour donné. */
export function evenementsDuJour(evenements, jour) {
  const dow = versDate(jour).getDay();
  return evenements
    .filter((e) => {
      if (e.jour === jour) return true;
      if (!e.hebdo || jour < e.jour || (e.jusqua && jour > e.jusqua)) return false;
      return versDate(e.jour).getDay() === dow;
    })
    .map((e) => ({ ...e, occurrence: jour }))
    .sort((a, b) => a.debut.localeCompare(b.debut));
}

/* Place les événements d'une journée côte à côte quand ils se
   chevauchent : chacun reçoit `colonne` et `colonnes`. */
export function disposer(evenementsJour) {
  const tries = [...evenementsJour].sort((a, b) => enMinutes(a.debut) - enMinutes(b.debut) || enMinutes(b.fin) - enMinutes(a.fin));
  const resultat = [];
  let groupe = [];
  let finGroupe = -1;
  const fermer = () => {
    const colonnesFin = [];
    for (const e of groupe) {
      let c = colonnesFin.findIndex((fin) => fin <= enMinutes(e.debut));
      if (c === -1) c = colonnesFin.length;
      colonnesFin[c] = enMinutes(e.fin);
      e.colonne = c;
    }
    for (const e of groupe) resultat.push({ ...e, colonnes: colonnesFin.length });
    groupe = [];
  };
  for (const e of tries) {
    const copie = { ...e };
    if (groupe.length && enMinutes(copie.debut) >= finGroupe) fermer();
    groupe.push(copie);
    finGroupe = Math.max(finGroupe, enMinutes(copie.fin));
  }
  if (groupe.length) fermer();
  return resultat;
}

/* Recherche et filtres. */
const normaliser = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function filtrer(evenements, { recherche = "", categories = [], matieres = [] }) {
  const q = normaliser(recherche.trim());
  return evenements.filter((e) => {
    if (q && !normaliser(`${e.titre} ${e.description} ${e.categorie}`).includes(q)) return false;
    if (categories.length && !categories.includes(e.categorie)) return false;
    if (matieres.length && !matieres.includes(e.matiere)) return false;
    return true;
  });
}

/* Un événement neuf, prérempli. */
export function nouvelEvenement(jour, debut = "08:00", duree = 60) {
  return {
    id: `evt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    titre: "",
    description: "",
    jour,
    debut,
    fin: enHeure(Math.min(enMinutes(debut) + duree, 23 * 60 + 59)),
    categorie: "Cours",
    couleur: COULEUR_PAR_CATEGORIE.Cours,
    matiere: "",
    hebdo: false,
    jusqua: ajouterJours(jour, 7 * 16), // un semestre, environ
  };
}
