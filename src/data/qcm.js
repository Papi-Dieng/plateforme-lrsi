// QCM de DÉMONSTRATION. Questions rédigées pour la Version 1.
// `bonne` est l'indice (base 0) de la réponse correcte dans `options`.

export const qcms = [
  {
    id: "reseaux-bases",
    titre: "Réseaux : les fondamentaux",
    matiere: "reseaux",
    niveau: "Débutant",
    duree: "7 min",
    description:
      "Modèles en couches, adressage IPv4 et rôle des principaux protocoles.",
    questions: [
      {
        enonce: "Combien de couches compte le modèle OSI ?",
        options: ["4", "5", "7", "8"],
        competence: "res-modeles",
        bonne: 2,
        explication:
          "Le modèle OSI en compte 7 : physique, liaison, réseau, transport, session, présentation et application. Le modèle TCP/IP, lui, n'en regroupe que 4.",
      },
      {
        enonce:
          "À quelle couche du modèle OSI un routeur prend-il sa décision d'acheminement ?",
        options: [
          "Couche 2, liaison de données",
          "Couche 3, réseau",
          "Couche 4, transport",
          "Couche 7, application",
        ],
        competence: "res-modeles",
        bonne: 1,
        explication:
          "Le routeur consulte l'adresse IP de destination, qui appartient à la couche 3. Un commutateur, lui, travaille en couche 2 avec les adresses MAC.",
      },
      {
        enonce: "Quel masque de sous-réseau correspond au préfixe /26 ?",
        options: [
          "255.255.255.0",
          "255.255.255.128",
          "255.255.255.192",
          "255.255.255.224",
        ],
        competence: "res-adressage",
        bonne: 2,
        explication:
          "/26 signifie 26 bits à 1. Le dernier octet vaut 11000000, soit 192. Il reste 6 bits d'hôte, donc 62 adresses utilisables.",
      },
      {
        enonce:
          "Quel protocole de transport garantit la livraison des données dans l'ordre ?",
        options: ["UDP", "TCP", "ICMP", "ARP"],
        competence: "res-transport",
        bonne: 1,
        explication:
          "TCP numérote les segments et les acquitte, ce qui permet la retransmission et la remise dans l'ordre. UDP ne fournit aucune de ces garanties, en échange d'une latence plus faible.",
      },
      {
        enonce: "Combien d'adresses utilisables offre un réseau en /29 ?",
        options: ["4", "6", "8", "14"],
        competence: "res-adressage",
        bonne: 1,
        explication:
          "Un /29 laisse 3 bits d'hôte, donc 2³ = 8 adresses au total. On retire l'adresse de réseau et celle de diffusion : il en reste 6.",
      },
      {
        enonce: "Quel est le rôle du protocole ARP ?",
        options: [
          "Attribuer automatiquement une adresse IP",
          "Traduire un nom de domaine en adresse IP",
          "Associer une adresse IP à une adresse MAC",
          "Chiffrer les échanges entre deux machines",
        ],
        competence: "res-services",
        bonne: 2,
        explication:
          "ARP fait le lien entre la couche 3 et la couche 2 sur un réseau local. L'attribution d'adresses relève de DHCP et la résolution de noms relève de DNS.",
      },
    ],
  },
  {
    id: "systemes-bases",
    titre: "Systèmes d'exploitation : notions clés",
    matiere: "systemes",
    niveau: "Intermédiaire",
    duree: "6 min",
    description:
      "Processus, ordonnancement, mémoire et administration sous Linux.",
    questions: [
      {
        enonce: "En quoi consiste un changement de contexte ?",
        options: [
          "À redémarrer un processus bloqué",
          "À sauvegarder l'état du processus courant puis à charger celui du suivant",
          "À déplacer un processus de la mémoire vers le disque",
          "À modifier la priorité d'un processus",
        ],
        competence: "sys-processus",
        bonne: 1,
        explication:
          "Le système sauvegarde les registres et le compteur ordinal du processus sortant, puis restaure ceux du processus entrant. Cette opération a un coût, ce qui limite l'intérêt d'un quantum trop court.",
      },
      {
        enonce:
          "Quelle est la différence essentielle entre un processus et un thread ?",
        options: [
          "Un thread ne peut pas accéder au disque",
          "Les threads d'un même processus partagent le même espace d'adressage",
          "Un processus est toujours plus rapide qu'un thread",
          "Un thread possède sa propre table de pages",
        ],
        competence: "sys-processus",
        bonne: 1,
        explication:
          "Les threads partagent la mémoire du processus, ce qui rend la communication rapide mais impose de protéger les données partagées. Chaque thread garde en revanche sa propre pile et ses propres registres.",
      },
      {
        enonce: "Que contient un inode sous Linux ?",
        options: [
          "Le nom du fichier et son contenu",
          "Uniquement le contenu du fichier",
          "Les métadonnées du fichier, sans son nom",
          "La liste des processus qui ouvrent le fichier",
        ],
        competence: "sys-fichiers",
        bonne: 2,
        explication:
          "L'inode stocke les droits, le propriétaire, la taille, les dates et les pointeurs vers les blocs de données. Le nom du fichier est conservé dans le répertoire, ce qui permet à plusieurs noms de pointer vers le même inode.",
      },
      {
        enonce: "À quelles permissions correspond la commande chmod 640 ?",
        options: ["rw-r--r--", "rw-r-----", "rwxr-x---", "r--r--r--"],
        competence: "sys-admin",
        bonne: 1,
        explication:
          "6 vaut rw- pour le propriétaire, 4 vaut r-- pour le groupe et 0 ne donne aucun droit aux autres utilisateurs.",
      },
      {
        enonce:
          "Quel algorithme d'ordonnancement peut provoquer la famine d'un processus ?",
        options: [
          "Premier arrivé, premier servi",
          "Tourniquet avec quantum fixe",
          "Priorité fixe sans vieillissement",
          "Aucun des trois",
        ],
        competence: "sys-ordonnancement",
        bonne: 2,
        explication:
          "Avec des priorités fixes, un processus de faible priorité peut ne jamais obtenir le processeur si des processus prioritaires arrivent sans cesse. Le vieillissement augmente progressivement la priorité des processus en attente pour corriger ce défaut.",
      },
    ],
  },
  {
    id: "algo-bases",
    titre: "Algorithmique : complexité et structures",
    matiere: "algorithmique",
    niveau: "Débutant",
    duree: "5 min",
    description:
      "Notation grand O, algorithmes de tri et structures de données classiques.",
    questions: [
      {
        enonce: "Quelle est la complexité d'une recherche dichotomique ?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        competence: "algo-complexite",
        bonne: 1,
        explication:
          "Chaque comparaison élimine la moitié des éléments restants, d'où un nombre d'étapes proportionnel au logarithme de la taille. Le tableau doit être trié au préalable.",
      },
      {
        enonce: "Quelle est la complexité du tri rapide dans le pire des cas ?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        competence: "algo-tris",
        bonne: 2,
        explication:
          "Si le pivot choisi est systématiquement le plus petit ou le plus grand élément, les partitions sont déséquilibrées et le coût devient quadratique. En moyenne, le tri rapide reste en O(n log n).",
      },
      {
        enonce:
          "Quelle structure de données fonctionne selon le principe « dernier entré, premier sorti » ?",
        options: ["La file", "La pile", "La liste chaînée", "L'arbre binaire"],
        competence: "algo-structures",
        bonne: 1,
        explication:
          "La pile suit le principe LIFO. C'est exactement ce qu'utilise le processeur pour gérer les appels de fonctions et les retours.",
      },
      {
        enonce: "Que doit obligatoirement contenir une fonction récursive ?",
        options: [
          "Une boucle",
          "Un tableau global",
          "Au moins un cas de base",
          "Deux appels récursifs",
        ],
        competence: "algo-recursivite",
        bonne: 2,
        explication:
          "Sans cas de base, les appels s'enchaînent indéfiniment jusqu'au débordement de la pile. Le cas de base est la condition d'arrêt qui rend la récursion finie.",
      },
      {
        enonce: "Quelle est la complexité du tri fusion ?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
        competence: "algo-tris",
        bonne: 1,
        explication:
          "Le tri fusion découpe le tableau en log n niveaux et fusionne n éléments à chaque niveau. Il garantit O(n log n) même dans le pire cas, au prix d'une mémoire supplémentaire.",
      },
    ],
  },
  {
    id: "architecture-bases",
    titre: "Architecture : codage et logique",
    matiere: "architecture",
    niveau: "Débutant",
    duree: "5 min",
    description:
      "Conversions de bases, représentation des nombres et portes logiques.",
    questions: [
      {
        enonce: "Quelle est la valeur hexadécimale de 1101 0110 ?",
        options: ["0xC6", "0xD6", "0xB6", "0xE6"],
        competence: "arch-codage",
        bonne: 1,
        explication:
          "On convertit par groupes de quatre bits : 1101 vaut D et 0110 vaut 6, d'où 0xD6, c'est-à-dire 214 en décimal.",
      },
      {
        enonce: "Comment s'écrit −1 sur 8 bits en complément à deux ?",
        options: ["1000 0001", "1111 1110", "1111 1111", "0000 0001"],
        competence: "arch-codage",
        bonne: 2,
        explication:
          "On part de 0000 0001, on inverse pour obtenir 1111 1110, puis on ajoute 1 : 1111 1111. C'est la raison pour laquelle −1 s'affiche souvent comme 255 ou 0xFF dans un contexte non signé.",
      },
      {
        enonce: "Combien de valeurs différentes peut-on coder sur 10 bits ?",
        options: ["100", "512", "1024", "2048"],
        competence: "arch-codage",
        bonne: 2,
        explication:
          "Le nombre de combinaisons vaut 2¹⁰, soit 1024. Chaque bit supplémentaire double le nombre de valeurs représentables.",
      },
      {
        enonce:
          "Quelle porte logique produit un 1 uniquement lorsque ses deux entrées sont différentes ?",
        options: ["ET", "OU", "OU exclusif", "NON-ET"],
        competence: "arch-boole",
        bonne: 2,
        explication:
          "Le OU exclusif, ou XOR, vaut 1 si et seulement si les entrées diffèrent. On l'utilise notamment dans les additionneurs et dans certains calculs de parité.",
      },
      {
        enonce: "À quoi sert principalement la mémoire cache ?",
        options: [
          "À augmenter la capacité totale de stockage",
          "À réduire le temps d'accès moyen à la mémoire",
          "À sauvegarder les données en cas de coupure",
          "À exécuter les instructions à la place du processeur",
        ],
        competence: "arch-memoire",
        bonne: 1,
        explication:
          "Le cache exploite les principes de localité temporelle et spatiale pour garder à portée du processeur les données les plus utilisées. Il est petit et rapide, à l'inverse de la mémoire centrale.",
      },
    ],
  },
  {
    id: "securite-bases",
    titre: "Cybersécurité : premiers réflexes",
    matiere: "securite",
    niveau: "Débutant",
    duree: "5 min",
    description:
      "Principes fondamentaux, cryptographie et failles applicatives courantes.",
    questions: [
      {
        enonce: "Une fonction de hachage appliquée à un mot de passe est…",
        options: [
          "réversible avec la bonne clé",
          "une opération à sens unique",
          "un chiffrement symétrique",
          "un simple encodage",
        ],
        competence: "sec-crypto",
        bonne: 1,
        explication:
          "Un hachage ne se déchiffre pas : on ne peut que comparer des empreintes. Pour les mots de passe, on utilise des fonctions lentes et salées comme bcrypt ou Argon2, jamais MD5 ni SHA-1.",
      },
      {
        enonce: "Que recouvre le sigle DICP en sécurité de l'information ?",
        options: [
          "Données, Internet, Chiffrement, Protection",
          "Disponibilité, Intégrité, Confidentialité, Preuve",
          "Détection, Identification, Contrôle, Prévention",
          "Défense, Isolation, Cloisonnement, Protection",
        ],
        competence: "sec-principes",
        bonne: 1,
        explication:
          "Ces quatre critères servent à qualifier le niveau de sécurité attendu pour une ressource. La preuve, parfois appelée traçabilité, permet d'attribuer une action à son auteur.",
      },
      {
        enonce: "Le chiffrement asymétrique repose sur…",
        options: [
          "une clé unique partagée",
          "une paire de clés publique et privée",
          "un mot de passe à usage unique",
          "une fonction de hachage",
        ],
        competence: "sec-crypto",
        bonne: 1,
        explication:
          "On chiffre avec la clé publique du destinataire et lui seul peut déchiffrer avec sa clé privée. En pratique, on l'utilise surtout pour échanger une clé symétrique, bien plus rapide.",
      },
      {
        enonce:
          "Quelle est la protection la plus fiable contre l'injection SQL ?",
        options: [
          "Masquer les messages d'erreur",
          "Filtrer les apostrophes dans les champs",
          "Utiliser des requêtes préparées avec paramètres",
          "Changer le port du serveur de base de données",
        ],
        competence: "sec-applicatif",
        bonne: 2,
        explication:
          "Les requêtes préparées séparent le code SQL des données, ce qui empêche toute interprétation de la saisie comme instruction. Le filtrage manuel est fragile et se contourne souvent.",
      },
      {
        enonce: "Sur quel protocole repose la sécurité de HTTPS ?",
        options: ["SSH", "TLS", "IPsec", "WPA2"],
        competence: "sec-reseau",
        bonne: 1,
        explication:
          "HTTPS est du HTTP transporté dans un tunnel TLS, qui assure le chiffrement, l'intégrité et l'authentification du serveur grâce à son certificat.",
      },
    ],
  },
];

export const getQcm = (id) => qcms.find((q) => q.id === id);
