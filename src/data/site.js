// Identité de la plateforme.
//
// ============================================================
//  NOM PROVISOIRE — À REMPLACER
//  Le nom définitif n'est pas encore choisi. Il n'est écrit
//  qu'ici : modifier la ligne `nom` ci-dessous suffit à mettre
//  à jour l'en-tête, le pied de page, le titre de l'onglet et
//  toutes les pages. Rien d'autre dans le code n'en dépend.
//
//  Quelques pistes, à garder ou à jeter :
//    JàngRSI   — « jàng » veut dire apprendre en wolof
//    RSI Campus
//    NetSkool
//    Sunu Cours — « sunu » veut dire notre en wolof
// ============================================================
export const site = {
  nom: "JàngRSI",
  // Décoratif : si le nom commence par ce texte, cette partie s'affiche en
  // orange dans l'en-tête. Mettre "" pour un nom d'une seule couleur.
  nomAccent: "Jàng",
  baseline: "Apprendre, réviser, s'entraîner.",
  description:
    "Une plateforme gratuite qui rassemble au même endroit les cours, les exercices corrigés et les QCM de la filière Réseaux et Systèmes Informatiques.",
  filiere: "Licence Réseaux et Systèmes Informatiques (LRSI)",
  annee: new Date().getFullYear(),
  // Adresse de contact provisoire, à remplacer elle aussi.
  contact: "contact@exemple.sn",
  version: "Version 1 — site de présentation",
  // Adresse du relais IA (dossier `serveur-ia/`), affichée par Cloudflare
  // après `npx wrangler deploy`, par exemple
  // "https://jangrsi-ia.<compte>.workers.dev". Tant qu'elle est vide,
  // l'assistant fonctionne en guide seul, sans modèle de langage.
  urlIA: "https://jangrsi-ia.soniadieng22.workers.dev",
  // Texte volontairement neutre : il reste juste quel que soit le nom choisi.
  origineNom:
    "Celui affiché ici est provisoire, le choix se fera plus tard. Il est défini à un seul endroit dans le code et se change en une ligne, sans rien casser ailleurs.",
};

export const navigation = [
  { label: "Tableau de bord", to: "/tableau-de-bord" },
  { label: "Cours", to: "/cours" },
  { label: "Exercices", to: "/exercices" },
  { label: "QCM", to: "/qcm" },
  { label: "Examens", to: "/examens" },
  { label: "Vidéos", to: "/videos" },
  { label: "Bibliothèque", to: "/bibliotheque" },
  { label: "Mes favoris", to: "/favoris" },
  { label: "Ma progression", to: "/progression" },
  { label: "Assistant IA", to: "/assistant" },
  { label: "Le projet", to: "/projet" },
];

// Entrées du menu déroulant, sous l'avatar de la barre du haut.
export const menuProfil = [
  { label: "Mon profil", to: "/profil", icone: "users" },
  { label: "Ma progression", to: "/progression", icone: "layers" },
  { label: "Paramètres", to: "/parametres", icone: "settings" },
  { label: "Conditions d'utilisation", to: "/conditions", icone: "file" },
  // Page d'auteur, pas de page étudiante. Elle rejoindra un espace
  // réservé quand les rôles existeront, en version 3.
  { label: "Administration", to: "/admin", icone: "shield", auteur: true },
];

export const objectifs = [
  {
    icone: "book",
    titre: "Faciliter les révisions",
    texte:
      "Retrouver ses ressources au même endroit, au lieu de les chercher dans plusieurs groupes et plateformes.",
  },
  {
    icone: "target",
    titre: "Améliorer l'apprentissage",
    texte:
      "Des exercices corrigés et des QCM pour tester ses connaissances et comprendre la méthode, pas seulement la réponse.",
  },
  {
    icone: "code",
    titre: "Développer ses compétences",
    texte:
      "Le projet sert aussi de terrain d'entraînement en développement web, réseaux et cybersécurité.",
  },
  {
    icone: "users",
    titre: "Créer une communauté",
    texte:
      "Encourager l'entraide entre étudiants, puis ouvrir la plateforme à d'autres établissements.",
  },
];

export const feuilleDeRoute = [
  {
    version: "Version 1",
    titre: "Site de présentation",
    etat: "en-cours",
    points: [
      "Page d'accueil, design et navigation",
      "Pages cours, exercices et QCM",
      "Contenu de démonstration",
    ],
  },
  {
    version: "Version 2",
    titre: "Ressources pédagogiques",
    etat: "prevu",
    points: [
      "Organisation des cours par matière et chapitre",
      "Exercices corrigés et corrections détaillées",
      "Gestion de contenu adaptée",
    ],
  },
  {
    version: "Version 3",
    titre: "Comptes et accès",
    etat: "prevu",
    points: [
      "Authentification des étudiants",
      "Rôles étudiant, administrateur, enseignant",
      "Autorisations d'accès aux ressources réservées",
    ],
  },
  {
    version: "Version 4",
    titre: "IA et fonctionnalités avancées",
    etat: "prevu",
    points: [
      "Assistant de révision",
      "Génération d'exercices par niveau",
      "Explication des erreurs après un QCM",
    ],
  },
  {
    version: "Version 5",
    titre: "Ouverture à d'autres établissements",
    etat: "vision",
    points: [
      "Partenariats avec d'autres formations",
      "Nouvelles filières informatiques",
      "Extension au-delà de la filière LRSI",
    ],
  },
];

export const principesSecurite = [
  {
    titre: "Comptes et mots de passe",
    texte:
      "Hachage des mots de passe, politique de complexité et limitation des tentatives de connexion.",
  },
  {
    titre: "Contrôle des accès",
    texte:
      "Chaque ressource réservée est vérifiée côté serveur, jamais seulement masquée dans l'interface.",
  },
  {
    titre: "Validation des fichiers",
    texte:
      "Type, taille et provenance vérifiés avant publication. Aucun fichier exécuté sur le serveur.",
  },
  {
    titre: "Données personnelles",
    texte:
      "Collecte minimale : uniquement ce qui est nécessaire pour identifier un étudiant et suivre sa progression.",
  },
  {
    titre: "Droits d'administration",
    texte:
      "Séparation nette des rôles et journalisation des actions d'administration.",
  },
  {
    titre: "Failles courantes",
    texte:
      "Protection contre l'injection SQL, le XSS et le CSRF dès la conception, pas après coup.",
  },
];

export const engagements = [
  "Aucun cours ou document universitaire publié sans autorisation.",
  "Respect des droits d'auteur sur les livres et les autres ressources.",
  "Contenus personnels, libres de droits ou autorisés pour la première version.",
  "Projet gratuit, sans aucun bénéfice financier.",
  "Retrait immédiat de toute ressource à la demande de son auteur.",
];

export const roles = [
  {
    nom: "Étudiant",
    icone: "users",
    texte:
      "Consulter les cours, faire les exercices, participer aux QCM et suivre sa progression.",
  },
  {
    nom: "Administrateur",
    icone: "shield",
    texte:
      "Gérer les utilisateurs, les matières, les documents et les contenus autorisés.",
  },
  {
    nom: "Enseignant",
    icone: "book",
    texte:
      "Évolution possible : contribuer à la validation ou à la publication de ressources, selon les autorisations accordées.",
  },
];
