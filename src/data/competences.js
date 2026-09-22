/* ==================================================================
   Compétences.

   C'est le pivot de l'analyse : une question de QCM et un exercice
   portent chacun un identifiant de compétence, et chaque compétence
   renvoie vers les chapitres qui la travaillent.

   La chaîne complète est donc :

     question ratée → compétence faible → chapitres à revoir

   Pour ajouter une compétence, copier un bloc. `chapitres` reprend les
   titres exacts écrits dans matieres.js : c'est ce qui permet de
   proposer « relis ce chapitre » sans rien inventer.
   ================================================================== */

export const competences = [
  /* ---------------- Réseaux informatiques ---------------- */
  {
    id: "res-modeles",
    nom: "Modèles en couches",
    matiere: "reseaux",
    chapitres: ["Modèles OSI et TCP/IP"],
  },
  {
    id: "res-adressage",
    nom: "Adressage et sous-réseaux",
    matiere: "reseaux",
    chapitres: ["Adressage IPv4 et sous-réseaux", "Introduction à IPv6"],
  },
  {
    id: "res-transport",
    nom: "Protocoles de transport",
    matiere: "reseaux",
    chapitres: ["Modèles OSI et TCP/IP"],
  },
  {
    id: "res-commutation",
    nom: "Commutation et VLAN",
    matiere: "reseaux",
    chapitres: ["Commutation et VLAN"],
  },
  {
    id: "res-routage",
    nom: "Routage",
    matiere: "reseaux",
    chapitres: ["Routage statique et dynamique"],
  },
  {
    id: "res-services",
    nom: "Services réseau",
    matiere: "reseaux",
    chapitres: ["Services réseau : DHCP et DNS", "Commutation et VLAN"],
  },

  /* ---------------- Systèmes d'exploitation ---------------- */
  {
    id: "sys-processus",
    nom: "Processus et threads",
    matiere: "systemes",
    chapitres: ["Processus et threads"],
  },
  {
    id: "sys-ordonnancement",
    nom: "Ordonnancement",
    matiere: "systemes",
    chapitres: ["Ordonnancement du processeur"],
  },
  {
    id: "sys-memoire",
    nom: "Gestion de la mémoire",
    matiere: "systemes",
    chapitres: ["Gestion de la mémoire"],
  },
  {
    id: "sys-fichiers",
    nom: "Systèmes de fichiers",
    matiere: "systemes",
    chapitres: ["Systèmes de fichiers"],
  },
  {
    id: "sys-admin",
    nom: "Administration Linux",
    matiere: "systemes",
    chapitres: ["Administration Linux", "Scripts shell"],
  },

  /* ---------------- Algorithmique et programmation ---------------- */
  {
    id: "algo-base",
    nom: "Bases du pseudo-code",
    matiere: "algorithmique",
    chapitres: ["Variables et structures de contrôle"],
  },
  {
    id: "algo-tableaux",
    nom: "Tableaux et chaînes",
    matiere: "algorithmique",
    chapitres: ["Tableaux et chaînes de caractères"],
  },
  {
    id: "algo-recursivite",
    nom: "Récursivité",
    matiere: "algorithmique",
    chapitres: ["Fonctions et récursivité"],
  },
  {
    id: "algo-complexite",
    nom: "Complexité",
    matiere: "algorithmique",
    chapitres: ["Complexité algorithmique"],
  },
  {
    id: "algo-tris",
    nom: "Tris et recherches",
    matiere: "algorithmique",
    chapitres: ["Tris et recherches"],
  },
  {
    id: "algo-structures",
    nom: "Structures de données",
    matiere: "algorithmique",
    chapitres: ["Structures de données"],
  },

  /* ---------------- Architecture des ordinateurs ---------------- */
  {
    id: "arch-codage",
    nom: "Codage de l'information",
    matiere: "architecture",
    chapitres: ["Codage binaire et hexadécimal"],
  },
  {
    id: "arch-boole",
    nom: "Algèbre de Boole",
    matiere: "architecture",
    chapitres: ["Algèbre de Boole"],
  },
  {
    id: "arch-circuits",
    nom: "Circuits logiques",
    matiere: "architecture",
    chapitres: ["Circuits combinatoires et séquentiels"],
  },
  {
    id: "arch-processeur",
    nom: "Processeur et instructions",
    matiere: "architecture",
    chapitres: ["Jeu d'instructions et cycle d'exécution"],
  },
  {
    id: "arch-memoire",
    nom: "Hiérarchie mémoire",
    matiere: "architecture",
    chapitres: ["Hiérarchie mémoire et cache"],
  },

  /* ---------------- Bases de données ---------------- */
  {
    id: "bdd-modelisation",
    nom: "Modélisation",
    matiere: "bdd",
    chapitres: ["Modèle conceptuel de données"],
  },
  {
    id: "bdd-sql",
    nom: "Requêtes SQL",
    matiere: "bdd",
    chapitres: ["Langage SQL"],
  },
  {
    id: "bdd-normalisation",
    nom: "Normalisation",
    matiere: "bdd",
    chapitres: ["Normalisation"],
  },
  {
    id: "bdd-transactions",
    nom: "Transactions",
    matiere: "bdd",
    chapitres: ["Transactions et intégrité"],
  },

  /* ---------------- Cybersécurité ---------------- */
  {
    id: "sec-principes",
    nom: "Principes de sécurité",
    matiere: "securite",
    chapitres: ["Principes fondamentaux"],
  },
  {
    id: "sec-crypto",
    nom: "Cryptographie",
    matiere: "securite",
    chapitres: ["Cryptographie de base"],
  },
  {
    id: "sec-reseau",
    nom: "Sécurité des réseaux",
    matiere: "securite",
    chapitres: ["Sécurité des réseaux"],
  },
  {
    id: "sec-applicatif",
    nom: "Failles applicatives",
    matiere: "securite",
    chapitres: ["Principes fondamentaux", "Hygiène informatique"],
  },
];

export const getCompetence = (id) => competences.find((c) => c.id === id);

export const competencesDeMatiere = (matiereId) =>
  competences.filter((c) => c.matiere === matiereId);
