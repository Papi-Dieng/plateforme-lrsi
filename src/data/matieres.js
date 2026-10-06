// Contenu de DÉMONSTRATION (Version 1).
//
// `nomCourt` sert aux pastilles de filtre et aux badges, là où le nom
// complet serait trop long. Il n'y a pas de niveau au-dessus de la
// matière : dans cette version, une filière correspond à une matière.
// L'organisation par matière est une proposition, pas le programme officiel.
// Chaque chapitre appartient au semestre 1 ou au semestre 2 (voir
// src/semestres.js) : la page d'une matière les montre à part.
// Aucun document universitaire n'est publié ici : les chapitres décrivent
// seulement la structure prévue.

export const matieres = [
  {
    id: "reseaux",
    nomCourt: "Réseaux",
    nom: "Réseaux informatiques",
    couleur: "bleu",
    icone: "network",
    resume:
      "Des modèles en couches jusqu'au routage : comprendre comment les données circulent d'une machine à une autre.",
    chapitres: [
      {
        titre: "Modèles OSI et TCP/IP",
        resume:
          "Rôle de chaque couche, encapsulation des données et correspondance entre les deux modèles.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Adressage IPv4 et sous-réseaux",
        resume:
          "Classes d'adresses, masques, CIDR et découpage d'un réseau en sous-réseaux (VLSM).",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Commutation et VLAN",
        resume:
          "Table d'adresses MAC, domaines de collision et de diffusion, segmentation par VLAN.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Routage statique et dynamique",
        resume:
          "Table de routage, route par défaut, principes des protocoles à vecteur de distance et à état de liens.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Services réseau : DHCP et DNS",
        resume:
          "Attribution automatique des adresses et résolution de noms, du client jusqu'au serveur racine.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Introduction à IPv6",
        resume:
          "Notation, types d'adresses, autoconfiguration et cohabitation avec IPv4.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
  {
    id: "systemes",
    nomCourt: "Systèmes",
    nom: "Systèmes d'exploitation",
    couleur: "emeraude",
    icone: "terminal",
    resume:
      "Ce que fait réellement le système entre le matériel et les programmes : processus, mémoire, fichiers.",
    chapitres: [
      {
        titre: "Processus et threads",
        resume:
          "États d'un processus, changement de contexte, différence entre processus et fil d'exécution.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Ordonnancement du processeur",
        resume:
          "Algorithmes FIFO, SJF, tourniquet et par priorité, avec calcul des temps d'attente.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Gestion de la mémoire",
        resume:
          "Pagination, segmentation, mémoire virtuelle et algorithmes de remplacement de pages.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Systèmes de fichiers",
        resume:
          "Arborescence, inodes, droits d'accès et organisation physique des données sur le disque.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Administration Linux",
        resume:
          "Utilisateurs et groupes, permissions, services, gestion des paquets et journaux système.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Scripts shell",
        resume:
          "Variables, tests, boucles et automatisation des tâches d'administration courantes.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
  {
    id: "algorithmique",
    nomCourt: "Programmation",
    nom: "Algorithmique et programmation",
    couleur: "violet",
    icone: "code",
    resume:
      "Construire un raisonnement avant d'écrire du code, puis le traduire en C ou en Python.",
    chapitres: [
      {
        titre: "Variables et structures de contrôle",
        resume:
          "Types de base, conditions, boucles et premiers algorithmes en pseudo-code.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Tableaux et chaînes de caractères",
        resume:
          "Parcours, recherche, insertion et manipulation des chaînes en C et en Python.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Fonctions et récursivité",
        resume:
          "Décomposition d'un problème, passage de paramètres, cas de base et pile d'appels.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Complexité algorithmique",
        resume:
          "Notation grand O, comparaison d'algorithmes et coût en temps comme en mémoire.",
        statut: "disponible",
        semestre: 2,
      },
      {
        titre: "Tris et recherches",
        resume:
          "Tri par sélection, insertion, fusion et rapide. Recherche linéaire et dichotomique.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Structures de données",
        resume:
          "Listes chaînées, piles, files et premières notions d'arbres binaires.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
  {
    id: "architecture",
    nomCourt: "Matériel",
    nom: "Architecture des ordinateurs",
    couleur: "ardoise",
    icone: "cpu",
    resume:
      "Du bit au processeur : comment une machine représente l'information et exécute des instructions.",
    chapitres: [
      {
        titre: "Codage binaire et hexadécimal",
        resume:
          "Conversions entre bases, complément à deux et représentation des nombres signés.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Algèbre de Boole",
        resume:
          "Opérateurs logiques, tables de vérité, simplification et tableaux de Karnaugh.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Circuits combinatoires et séquentiels",
        resume: "Additionneurs, multiplexeurs, bascules et registres.",
        statut: "bientot",
        semestre: 1,
      },
      {
        titre: "Jeu d'instructions et cycle d'exécution",
        resume:
          "Chargement, décodage, exécution et rôle des registres du processeur.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Hiérarchie mémoire et cache",
        resume:
          "Localité, niveaux de cache, correspondance directe et associative.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
  {
    id: "bdd",
    nomCourt: "Données",
    nom: "Bases de données",
    couleur: "orange",
    icone: "database",
    resume:
      "Modéliser une information, la stocker proprement et l'interroger en SQL.",
    chapitres: [
      {
        titre: "Modèle conceptuel de données",
        resume:
          "Entités, associations, cardinalités et passage du MCD au modèle relationnel.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Langage SQL",
        resume:
          "Sélection, jointures, agrégations, sous-requêtes et mise à jour des données.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Normalisation",
        resume:
          "Dépendances fonctionnelles et formes normales jusqu'à la 3FN.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Transactions et intégrité",
        resume: "Propriétés ACID, verrous et gestion des accès concurrents.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
  {
    id: "securite",
    nomCourt: "Sécurité",
    nom: "Cybersécurité — introduction",
    couleur: "framboise",
    icone: "shield",
    resume: "Les bases défensives : protéger des comptes, des données et un réseau.",
    chapitres: [
      {
        titre: "Principes fondamentaux",
        resume:
          "Disponibilité, intégrité, confidentialité et preuve. Analyse de risque simplifiée.",
        statut: "disponible",
        semestre: 1,
      },
      {
        titre: "Cryptographie de base",
        resume:
          "Chiffrement symétrique et asymétrique, fonctions de hachage et certificats.",
        statut: "bientot",
        semestre: 1,
      },
      {
        titre: "Sécurité des réseaux",
        resume: "Pare-feu, segmentation, VPN et supervision du trafic.",
        statut: "bientot",
        semestre: 2,
      },
      {
        titre: "Hygiène informatique",
        resume:
          "Mots de passe, mises à jour, sauvegardes et bons réflexes au quotidien.",
        statut: "bientot",
        semestre: 2,
      },
    ],
  },
];

export const getMatiere = (id) => matieres.find((m) => m.id === id);

export const nomMatiere = (id) => getMatiere(id)?.nom ?? id;
