// Identité de la plateforme.
//
// Le nom, Sunu Cours, est définitif depuis le 4 octobre 2026 : « sunu »
// veut dire « notre » en wolof. Il n'est écrit qu'ici : l'en-tête, le
// pied de page, le titre de l'onglet et toutes les pages le lisent.
export const site = {
  nom: "Sunu Cours",
  // Décoratif : si le nom commence par ce texte, cette partie s'affiche en
  // orange dans l'en-tête. Mettre "" pour un nom d'une seule couleur.
  nomAccent: "Sunu",
  baseline: "Apprendre, réviser, s'entraîner.",
  description:
    "Une plateforme gratuite qui rassemble au même endroit les cours, les exercices corrigés et les QCM de la filière Réseaux et Systèmes Informatiques.",
  filiere: "Licence Réseaux et Systèmes Informatiques (LRSI)",
  annee: new Date().getFullYear(),
  // Adresse de contact, affichée dans les pages juridiques, le pied de
  // page et la page Projet.
  contact: "sunucours@gmail.com",
  // Numéro WhatsApp de l'équipe, pour les contributions (format
  // international, par exemple "221771234567"). Vide : seul Gmail est
  // proposé.
  whatsapp: "",
  // Responsable de la publication : il figure dans les mentions légales
  // et la politique de confidentialité. Tant qu'il est vide, les pages
  // disent « l'équipe étudiante du projet ».
  editeur: "Papa Mathar Dieng",
  // L'équipe : le carrousel de la page Projet et les mentions légales.
  // `photo` : un fichier du dossier public/equipe/ (par exemple
  // "equipe/papa-mathar-dieng.webp", recadrée en 600 × 800) ; vide, la
  // carte affiche les initiales. `bio` : une phrase de présentation, facultative.
  equipe: [
    { id: "papa-mathar-dieng", nom: "Papa Mathar Dieng", role: "Fondateur et directeur technique (CTO)", photo: "equipe/papa-mathar-dieng.webp", bio: "" },
    { id: "pape-fily-massaly", nom: "Pape Fily Massaly", role: "Responsable de la recherche et de la qualité pédagogique", photo: "", bio: "" },
    { id: "balle-ndiaye", nom: "Balle Ndiaye", role: "Responsable des contenus pédagogiques et du marketing", photo: "", bio: "" },
    { id: "jean-emmanuel-patron-mendy", nom: "Jean Emmanuel Patron Mendy", role: "Responsable des contenus et de la communication", photo: "", bio: "" },
  ],
  // Date de la dernière modification des pages juridiques (conditions,
  // confidentialité, mentions légales), à changer à chaque mise à jour.
  pagesJuridiquesMisesAJour: "6 octobre 2026",
  version: "Plateforme en ligne",
  // Adresse du relais IA (dossier `serveur-ia/`), affichée par Cloudflare
  // après `npx wrangler deploy`, par exemple
  // "https://jangrsi-ia.<compte>.workers.dev". Tant qu'elle est vide,
  // l'assistant fonctionne en guide seul, sans modèle de langage.
  urlIA: "https://jangrsi-ia.soniadieng22.workers.dev",
  // D'où vient le nom, sur la page Projet.
  origineNom:
    "« Sunu » veut dire « notre » en wolof : Sunu Cours, ce sont nos cours, ceux de la filière, réunis par et pour ses étudiants.",
};

// Qui publie le site, dans les pages juridiques.
export const nomEditeur = site.editeur
  ? `l'équipe ${site.nom}, sous la responsabilité de ${site.editeur}`
  : "l'équipe étudiante du projet";

export const navigation = [
  { label: "Tableau de bord", to: "/tableau-de-bord" },
  { label: "Cours", to: "/cours" },
  { label: "Exercices", to: "/exercices" },
  { label: "QCM", to: "/qcm" },
  { label: "Devoirs et examens", to: "/examens" },
  { label: "Vidéos", to: "/videos" },
  { label: "Bibliothèque", to: "/bibliotheque" },
  { label: "Mes favoris", to: "/favoris" },
  { label: "Ma progression", to: "/progression" },
  { label: "Mon planning", to: "/planning" },
  { label: "Assistant IA", to: "/assistant" },
  { label: "Le projet", to: "/projet" },
];

// Entrées du menu déroulant, sous l'avatar de la barre du haut.
export const menuProfil = [
  { label: "Mon profil", to: "/profil", icone: "users" },
  { label: "Ma progression", to: "/progression", icone: "layers" },
  { label: "Paramètres", to: "/parametres", icone: "settings" },
  { label: "Conditions d'utilisation", to: "/conditions", icone: "file" },
  { label: "Confidentialité", to: "/confidentialite", icone: "lock" },
  // Page d'auteur, pas de page étudiante : ce qu'elle modifie demande
  // le mot de passe admin.
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

// `fait` : ce qui est déjà en ligne. Une version est « terminée » quand
// tous ses points le sont, « en cours » dès que l'un l'est.
export const feuilleDeRoute = [
  {
    version: "Version 1",
    titre: "Site de présentation",
    points: [
      { texte: "Page d'accueil, design et navigation", fait: true },
      { texte: "Pages cours, exercices et QCM", fait: true },
      { texte: "Thème sombre, version hors ligne, application installable", fait: true },
    ],
  },
  {
    version: "Version 2",
    titre: "Ressources pédagogiques",
    points: [
      { texte: "Cours par matière et chapitre, semestres 1 et 2", fait: true },
      { texte: "Exercices, QCM, devoirs et examens corrigés", fait: true },
      { texte: "Espace admin pour publier le contenu", fait: true },
    ],
  },
  {
    version: "Version 3",
    titre: "Comptes et accès",
    points: [
      { texte: "Comptes étudiants : email, téléphone ou Google", fait: true },
      { texte: "Progression retrouvée sur tous les appareils", fait: true },
      { texte: "Rôle enseignant et ressources réservées", fait: false },
    ],
  },
  {
    version: "Version 4",
    titre: "IA et fonctionnalités avancées",
    points: [
      { texte: "Assistant de révision, avis sur les rédactions", fait: true },
      { texte: "Programme de révision composé par l'IA", fait: true },
      { texte: "QCM proposés par l'IA à l'équipe, qui les relit", fait: true },
    ],
  },
  {
    version: "Version 5",
    titre: "Ouverture à d'autres établissements",
    vision: true,
    points: [
      { texte: "Partenariats avec d'autres formations", fait: false },
      { texte: "Nouvelles filières informatiques", fait: false },
      { texte: "Extension au-delà de la filière LRSI", fait: false },
    ],
  },
];

export const etatVersion = (v) => {
  if (v.vision) return "vision";
  if (v.points.every((p) => p.fait)) return "fait";
  return v.points.some((p) => p.fait) ? "en-cours" : "prevu";
};

// Ce que la plateforme applique déjà, pas ce qu'elle promet.
export const principesSecurite = [
  {
    titre: "Comptes et mots de passe",
    texte:
      "Mots de passe chiffrés par Supabase, jamais visibles par l'équipe. Tentatives de connexion et envois d'emails limités.",
  },
  {
    titre: "Contrôle des accès",
    texte:
      "Règles appliquées par la base elle-même : chaque étudiant ne lit que ses propres données. L'espace admin est vérifié par le serveur, pas seulement masqué.",
  },
  {
    titre: "Validation des fichiers",
    texte:
      "Un PDF déposé est vérifié par le relais (type réel, taille) avant d'être gardé, et n'est jamais servi autrement que comme PDF.",
  },
  {
    titre: "Données personnelles",
    texte:
      "Collecte minimale : un nom, un niveau et un identifiant de connexion. Le mode invité ne demande rien. Chacun peut supprimer son compte.",
  },
  {
    titre: "Secrets et droits d'administration",
    texte:
      "Les clés d'accès (IA, base de données) restent sur le serveur, jamais dans le site. Publier du contenu demande le mot de passe admin.",
  },
  {
    titre: "Contenu et abus",
    texte:
      "Le relais nettoie ce qui est publié (liens en https seulement, formats vérifiés) et limite le nombre de requêtes par visiteur.",
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
    etat: "En place",
    texte:
      "Consulte les cours, fait les exercices et les QCM, suit sa progression. Il s'inscrit lui-même, ou entre en invité ; il n'ajoute ni ne modifie aucun contenu.",
  },
  {
    nom: "Administrateur",
    icone: "shield",
    etat: "En place",
    texte:
      "L'équipe du projet : publie les matières, les exercices, les QCM et les documents autorisés, depuis l'espace admin protégé par mot de passe.",
  },
  {
    nom: "Enseignant",
    icone: "book",
    etat: "Évolution possible",
    texte:
      "Contribuer à la validation ou à la publication de ressources, selon les autorisations accordées.",
  },
];
