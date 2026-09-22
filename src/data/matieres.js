// Contenu de DÉMONSTRATION (Version 1).
//
// `nomCourt` sert aux pastilles de filtre et aux badges, là où le nom
// complet serait trop long. Il n'y a pas de niveau au-dessus de la
// matière : dans cette version, une filière correspond à une matière.
// L'organisation par matière est une proposition, pas le programme officiel.
// Aucun document universitaire n'est publié ici : les chapitres décrivent
// seulement la structure prévue.

export const matieres = [
  {
    id: "reseaux",
    nomCourt: "Réseaux",
    nom: "Réseaux informatiques",
    couleur: "bleu",
    icone: "network",
    semestre: "Semestre 3",
    resume:
      "Des modèles en couches jusqu'au routage : comprendre comment les données circulent d'une machine à une autre.",
    chapitres: [
      {
        titre: "Modèles OSI et TCP/IP",
        resume:
          "Rôle de chaque couche, encapsulation des données et correspondance entre les deux modèles.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Adressage IPv4 et sous-réseaux",
        resume:
          "Classes d'adresses, masques, CIDR et découpage d'un réseau en sous-réseaux (VLSM).",
        duree: "4 h",
        statut: "disponible",
      },
      {
        titre: "Commutation et VLAN",
        resume:
          "Table d'adresses MAC, domaines de collision et de diffusion, segmentation par VLAN.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Routage statique et dynamique",
        resume:
          "Table de routage, route par défaut, principes des protocoles à vecteur de distance et à état de liens.",
        duree: "4 h",
        statut: "bientot",
      },
      {
        titre: "Services réseau : DHCP et DNS",
        resume:
          "Attribution automatique des adresses et résolution de noms, du client jusqu'au serveur racine.",
        duree: "2 h",
        statut: "bientot",
      },
      {
        titre: "Introduction à IPv6",
        resume:
          "Notation, types d'adresses, autoconfiguration et cohabitation avec IPv4.",
        duree: "2 h",
        statut: "bientot",
      },
    ],
  },
  {
    id: "systemes",
    nomCourt: "Systèmes",
    nom: "Systèmes d'exploitation",
    couleur: "emeraude",
    icone: "terminal",
    semestre: "Semestre 3",
    resume:
      "Ce que fait réellement le système entre le matériel et les programmes : processus, mémoire, fichiers.",
    chapitres: [
      {
        titre: "Processus et threads",
        resume:
          "États d'un processus, changement de contexte, différence entre processus et fil d'exécution.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Ordonnancement du processeur",
        resume:
          "Algorithmes FIFO, SJF, tourniquet et par priorité, avec calcul des temps d'attente.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Gestion de la mémoire",
        resume:
          "Pagination, segmentation, mémoire virtuelle et algorithmes de remplacement de pages.",
        duree: "4 h",
        statut: "disponible",
      },
      {
        titre: "Systèmes de fichiers",
        resume:
          "Arborescence, inodes, droits d'accès et organisation physique des données sur le disque.",
        duree: "3 h",
        statut: "bientot",
      },
      {
        titre: "Administration Linux",
        resume:
          "Utilisateurs et groupes, permissions, services, gestion des paquets et journaux système.",
        duree: "5 h",
        statut: "bientot",
      },
      {
        titre: "Scripts shell",
        resume:
          "Variables, tests, boucles et automatisation des tâches d'administration courantes.",
        duree: "3 h",
        statut: "bientot",
      },
    ],
  },
  {
    id: "algorithmique",
    nomCourt: "Programmation",
    nom: "Algorithmique et programmation",
    couleur: "violet",
    icone: "code",
    semestre: "Semestres 1 et 2",
    resume:
      "Construire un raisonnement avant d'écrire du code, puis le traduire en C ou en Python.",
    chapitres: [
      {
        titre: "Variables et structures de contrôle",
        resume:
          "Types de base, conditions, boucles et premiers algorithmes en pseudo-code.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Tableaux et chaînes de caractères",
        resume:
          "Parcours, recherche, insertion et manipulation des chaînes en C et en Python.",
        duree: "4 h",
        statut: "disponible",
      },
      {
        titre: "Fonctions et récursivité",
        resume:
          "Décomposition d'un problème, passage de paramètres, cas de base et pile d'appels.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Complexité algorithmique",
        resume:
          "Notation grand O, comparaison d'algorithmes et coût en temps comme en mémoire.",
        duree: "2 h",
        statut: "disponible",
      },
      {
        titre: "Tris et recherches",
        resume:
          "Tri par sélection, insertion, fusion et rapide. Recherche linéaire et dichotomique.",
        duree: "4 h",
        statut: "bientot",
      },
      {
        titre: "Structures de données",
        resume:
          "Listes chaînées, piles, files et premières notions d'arbres binaires.",
        duree: "4 h",
        statut: "bientot",
      },
    ],
  },
  {
    id: "architecture",
    nomCourt: "Matériel",
    nom: "Architecture des ordinateurs",
    couleur: "ardoise",
    icone: "cpu",
    semestre: "Semestre 2",
    resume:
      "Du bit au processeur : comment une machine représente l'information et exécute des instructions.",
    chapitres: [
      {
        titre: "Codage binaire et hexadécimal",
        resume:
          "Conversions entre bases, complément à deux et représentation des nombres signés.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Algèbre de Boole",
        resume:
          "Opérateurs logiques, tables de vérité, simplification et tableaux de Karnaugh.",
        duree: "3 h",
        statut: "disponible",
      },
      {
        titre: "Circuits combinatoires et séquentiels",
        resume: "Additionneurs, multiplexeurs, bascules et registres.",
        duree: "4 h",
        statut: "bientot",
      },
      {
        titre: "Jeu d'instructions et cycle d'exécution",
        resume:
          "Chargement, décodage, exécution et rôle des registres du processeur.",
        duree: "3 h",
        statut: "bientot",
      },
      {
        titre: "Hiérarchie mémoire et cache",
        resume:
          "Localité, niveaux de cache, correspondance directe et associative.",
        duree: "3 h",
        statut: "bientot",
      },
    ],
  },
  {
    id: "bdd",
    nomCourt: "Données",
    nom: "Bases de données",
    couleur: "orange",
    icone: "database",
    semestre: "Semestre 4",
    resume:
      "Modéliser une information, la stocker proprement et l'interroger en SQL.",
    chapitres: [
      {
        titre: "Modèle conceptuel de données",
        resume:
          "Entités, associations, cardinalités et passage du MCD au modèle relationnel.",
        duree: "4 h",
        statut: "disponible",
      },
      {
        titre: "Langage SQL",
        resume:
          "Sélection, jointures, agrégations, sous-requêtes et mise à jour des données.",
        duree: "5 h",
        statut: "disponible",
      },
      {
        titre: "Normalisation",
        resume:
          "Dépendances fonctionnelles et formes normales jusqu'à la 3FN.",
        duree: "3 h",
        statut: "bientot",
      },
      {
        titre: "Transactions et intégrité",
        resume: "Propriétés ACID, verrous et gestion des accès concurrents.",
        duree: "2 h",
        statut: "bientot",
      },
    ],
  },
  {
    id: "securite",
    nomCourt: "Sécurité",
    nom: "Cybersécurité — introduction",
    couleur: "framboise",
    icone: "shield",
    semestre: "Semestre 5",
    resume: "Les bases défensives : protéger des comptes, des données et un réseau.",
    chapitres: [
      {
        titre: "Principes fondamentaux",
        resume:
          "Disponibilité, intégrité, confidentialité et preuve. Analyse de risque simplifiée.",
        duree: "2 h",
        statut: "disponible",
      },
      {
        titre: "Cryptographie de base",
        resume:
          "Chiffrement symétrique et asymétrique, fonctions de hachage et certificats.",
        duree: "4 h",
        statut: "bientot",
      },
      {
        titre: "Sécurité des réseaux",
        resume: "Pare-feu, segmentation, VPN et supervision du trafic.",
        duree: "4 h",
        statut: "bientot",
      },
      {
        titre: "Hygiène informatique",
        resume:
          "Mots de passe, mises à jour, sauvegardes et bons réflexes au quotidien.",
        duree: "2 h",
        statut: "bientot",
      },
    ],
  },
];

export const getMatiere = (id) => matieres.find((m) => m.id === id);

export const nomMatiere = (id) => getMatiere(id)?.nom ?? id;
