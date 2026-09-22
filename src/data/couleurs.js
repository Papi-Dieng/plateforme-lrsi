/* ==================================================================
   Une couleur par matière.

   Chaque matière de src/data/matieres.js porte une clé `couleur` qui
   renvoie vers l'un des thèmes ci-dessous. La même couleur sert alors
   partout : carte du tableau de bord, pastille d'icône, barre de
   progression du profil, encart de la page matière.

   Les classes sont écrites en toutes lettres, jamais construites par
   concaténation : Tailwind lit le code source pour savoir quelles
   classes générer, et une classe assemblée à la volée serait absente
   de la feuille de style finale.

   Pour ajouter une matière, choisir un thème existant ou en ajouter un
   ici en copiant un bloc complet.
   ================================================================== */

export const themesMatiere = {
  bleu: {
    nom: "Bleu",
    carte: "bg-brand-600",
    badgeCarte: "bg-black/25 text-white",
    pastille: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    barre: "bg-brand-600 dark:bg-brand-500",
    texte: "text-brand-700 dark:text-brand-300",
    bordure: "border-brand-200 dark:border-brand-500/30",
    fondDoux: "bg-brand-50 dark:bg-brand-500/10",
    point: "bg-brand-600",
  },
  emeraude: {
    nom: "Émeraude",
    carte: "bg-emerald-600",
    badgeCarte: "bg-black/25 text-white",
    pastille:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    barre: "bg-emerald-600 dark:bg-emerald-500",
    texte: "text-emerald-700 dark:text-emerald-300",
    bordure: "border-emerald-200 dark:border-emerald-500/30",
    fondDoux: "bg-emerald-50 dark:bg-emerald-500/10",
    point: "bg-emerald-600",
  },
  violet: {
    nom: "Violet",
    carte: "bg-violet-600",
    badgeCarte: "bg-black/25 text-white",
    pastille:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    barre: "bg-violet-600 dark:bg-violet-500",
    texte: "text-violet-700 dark:text-violet-300",
    bordure: "border-violet-200 dark:border-violet-500/30",
    fondDoux: "bg-violet-50 dark:bg-violet-500/10",
    point: "bg-violet-600",
  },
  ardoise: {
    nom: "Ardoise",
    // L'anneau clair détache la carte sombre du fond, en thème sombre.
    carte: "bg-ink-950 dark:ring-1 dark:ring-white/12",
    badgeCarte: "bg-white/12 text-white",
    pastille: "bg-ink-200 text-ink-800 dark:bg-ink-800 dark:text-ink-200",
    barre: "bg-ink-800 dark:bg-ink-300",
    texte: "text-ink-800 dark:text-ink-200",
    bordure: "border-ink-300 dark:border-ink-700",
    fondDoux: "bg-ink-100 dark:bg-ink-800/60",
    point: "bg-ink-800",
  },
  orange: {
    nom: "Orange",
    carte: "bg-flame-500",
    badgeCarte: "bg-black/75 text-white",
    pastille:
      "bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400",
    barre: "bg-flame-500",
    texte: "text-flame-700 dark:text-flame-400",
    bordure: "border-flame-200 dark:border-flame-500/30",
    fondDoux: "bg-flame-50 dark:bg-flame-500/10",
    point: "bg-flame-500",
  },
  framboise: {
    nom: "Framboise",
    carte: "bg-rose-600",
    badgeCarte: "bg-black/25 text-white",
    pastille: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    barre: "bg-rose-600 dark:bg-rose-500",
    texte: "text-rose-700 dark:text-rose-300",
    bordure: "border-rose-200 dark:border-rose-500/30",
    fondDoux: "bg-rose-50 dark:bg-rose-500/10",
    point: "bg-rose-600",
  },
};

// Partie commune à toutes les cartes du tableau de bord : le texte y est
// blanc, donc les nuances se font à l'opacité, quelle que soit la couleur.
export const surCarte = {
  piste: "bg-white/25",
  barre: "bg-white",
  attenue: "text-white/75",
  puce: "bg-white/15 text-white",
};

export const themeMatiere = (matiere) =>
  themesMatiere[matiere?.couleur] ?? themesMatiere.bleu;
