import { matieres as vraiesMatieres } from "./matieres";
import { exercices as vraisExercices } from "./exercices";
import { qcms as vraisQcms } from "./qcm";
import { videosSuggerees } from "./videos";
import { annales as vraiesAnnales, examens as vraisExamens } from "./examens";
import { ressources as vraiesRessources } from "./bibliotheque";

/* ==================================================================
   Contenu de DÉMONSTRATION.

   Il ne s'affiche plus sur le site : depuis le 14 octobre 2026, les
   fichiers de `src/data/` sont vides et la plateforme ne montre que ce
   qui est publié depuis l'espace admin. Tant que rien n'est publié,
   chaque page affiche son message « rien pour l'instant ».

   Ce fichier ne sert plus qu'aux tests : les tests du navigateur le
   publient par le faux relais (`e2e/outils.js`), et les tests de la
   logique s'en servent comme d'un jeu d'essai. Aucune page ne
   l'importe, il ne part donc pas dans le site compilé.

   Il garde aussi la forme attendue de chaque contenu : c'est le modèle
   à recopier pour écrire une matière, un exercice ou un QCM à la main.
   ================================================================== */

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

export const exercices = [
  {
    id: "decoupage-sous-reseaux",
    titre: "Découper un réseau en quatre sous-réseaux",
    matiere: "reseaux",
    difficulte: "Moyen",
    duree: "20 min",
    tags: ["IPv4", "CIDR", "Masque"],
    enonce:
      "On dispose du réseau 192.168.10.0/24. L'administrateur souhaite le découper en quatre sous-réseaux de taille égale. Déterminez le nouveau masque, l'adresse de chaque sous-réseau, son adresse de diffusion et le nombre d'hôtes utilisables.",
    indice:
      "Pour obtenir 4 sous-réseaux, combien de bits faut-il emprunter à la partie hôte ? Rappel : 2^n sous-réseaux avec n bits empruntés.",
    etapes: [
      "4 sous-réseaux demandent 2 bits empruntés, car 2² = 4. Le préfixe passe donc de /24 à /26.",
      "Le masque /26 s'écrit 255.255.255.192. Il reste 32 − 26 = 6 bits d'hôte.",
      "Le pas entre deux sous-réseaux vaut 2⁶ = 64 dans le dernier octet.",
      "Nombre d'hôtes utilisables par sous-réseau : 2⁶ − 2 = 62 (on retire l'adresse de réseau et celle de diffusion).",
    ],
    reponse: `192.168.10.0/26    → hôtes 192.168.10.1 à .62      diffusion .63
192.168.10.64/26   → hôtes 192.168.10.65 à .126    diffusion .127
192.168.10.128/26  → hôtes 192.168.10.129 à .190   diffusion .191
192.168.10.192/26  → hôtes 192.168.10.193 à .254   diffusion .255

Masque : 255.255.255.192   •   62 hôtes utilisables par sous-réseau`,
    explication:
      "L'erreur la plus fréquente est d'oublier de retirer deux adresses par sous-réseau. On passe ainsi de 254 hôtes sur le /24 à 4 × 62 = 248 hôtes au total : le découpage a un coût.",
    // Ce que l'étudiant peut vérifier avant d'ouvrir la correction.
  },
  {
    id: "adresse-reseau-diffusion",
    titre: "Trouver l'adresse de réseau et de diffusion",
    matiere: "reseaux",
    difficulte: "Moyen",
    duree: "15 min",
    tags: ["IPv4", "Masque"],
    enonce:
      "Une machine possède l'adresse 172.16.35.180 avec un préfixe /20. Donnez le masque en notation décimale, l'adresse du réseau, l'adresse de diffusion, la plage d'adresses utilisables et le nombre d'hôtes possibles.",
    indice:
      "Le /20 coupe à l'intérieur du troisième octet. Calculez le pas : 256 − 240.",
    etapes: [
      "/20 = 11111111.11111111.11110000.00000000, soit le masque 255.255.240.0.",
      "Le pas dans le troisième octet vaut 256 − 240 = 16.",
      "Les frontières de réseau sont donc 172.16.0.0, 172.16.16.0, 172.16.32.0, 172.16.48.0… Comme 35 se situe entre 32 et 47, le réseau est 172.16.32.0.",
      "La diffusion est l'adresse juste avant le réseau suivant : 172.16.47.255.",
    ],
    reponse: `Masque        : 255.255.240.0
Réseau        : 172.16.32.0
Diffusion     : 172.16.47.255
Plage utile   : 172.16.32.1 → 172.16.47.254
Hôtes         : 2¹² − 2 = 4094`,
    explication:
      "Quand le masque coupe au milieu d'un octet, le réflexe est de calculer le pas puis de chercher le multiple immédiatement inférieur à la valeur de l'octet concerné.",
  },
  {
    id: "encapsulation-osi",
    titre: "Suivre l'encapsulation d'un message",
    matiere: "reseaux",
    difficulte: "Facile",
    duree: "10 min",
    tags: ["OSI", "Encapsulation"],
    enonce:
      "Un navigateur envoie une requête HTTP vers un serveur web. Indiquez, couche par couche, le nom de l'unité de données manipulée et l'information principale ajoutée à chaque descente dans la pile.",
    indice:
      "Chaque couche ajoute son en-tête devant les données reçues de la couche supérieure.",
    etapes: [
      "Couche application : le message HTTP est produit, sans en-tête réseau.",
      "Couche transport : TCP ajoute les ports source et destination, les numéros de séquence et d'acquittement. L'unité devient un segment.",
      "Couche réseau : IP ajoute les adresses IP source et destination, ainsi que le TTL. L'unité devient un paquet.",
      "Couche liaison : Ethernet ajoute les adresses MAC source et destination et une somme de contrôle en fin de trame. L'unité devient une trame.",
    ],
    reponse: `Application  → message HTTP
Transport    → segment  : ports source/destination, séquence, acquittement
Réseau       → paquet   : adresses IP source/destination, TTL
Liaison      → trame    : adresses MAC, FCS
Physique     → suite de bits sur le support`,
    explication:
      "Les adresses IP restent identiques de bout en bout, alors que les adresses MAC changent à chaque traversée de routeur. C'est le point qui distingue le mieux la couche 2 de la couche 3.",
  },
  {
    id: "ordonnancement-tourniquet",
    titre: "Ordonnancement en tourniquet",
    matiere: "systemes",
    difficulte: "Moyen",
    duree: "25 min",
    tags: ["Ordonnancement", "Round Robin"],
    enonce:
      "Trois processus arrivent en même temps à l'instant 0 : P1 a besoin de 5 ms de processeur, P2 de 3 ms et P3 de 4 ms. L'ordonnanceur utilise un tourniquet avec un quantum de 2 ms et la file initiale est P1, P2, P3. Donnez le diagramme d'exécution, puis le temps d'attente moyen.",
    indice:
      "Un processus qui n'a pas terminé son temps de calcul repart en fin de file après son quantum.",
    etapes: [
      "0 → 2 : P1 s'exécute, il lui reste 3 ms. File : P2, P3, P1.",
      "2 → 4 : P2 s'exécute, il lui reste 1 ms. File : P3, P1, P2.",
      "4 → 6 : P3 s'exécute, il lui reste 2 ms. File : P1, P2, P3.",
      "6 → 8 : P1 s'exécute, il lui reste 1 ms. File : P2, P3, P1.",
      "8 → 9 : P2 termine à 9 ms. 9 → 11 : P3 termine à 11 ms. 11 → 12 : P1 termine à 12 ms.",
      "Temps d'attente = temps de restitution − temps de calcul, puisque tous arrivent à 0.",
    ],
    reponse: `Diagramme : P1 P1 | P2 P2 | P3 P3 | P1 P1 | P2 | P3 P3 | P1
            0    2      4      6      8    9      11   12

Restitution : P1 = 12 ms, P2 = 9 ms, P3 = 11 ms
Attente     : P1 = 7 ms,  P2 = 6 ms, P3 = 7 ms
Attente moyenne = (7 + 6 + 7) / 3 ≈ 6,67 ms`,
    explication:
      "Le tourniquet est équitable mais rallonge le temps de restitution des processus courts par rapport au « plus court d'abord ». Un quantum trop petit multiplie les changements de contexte, un quantum trop grand fait tendre l'algorithme vers du premier arrivé, premier servi.",
  },
  {
    id: "permissions-linux",
    titre: "Lire et écrire des permissions Unix",
    matiere: "systemes",
    difficulte: "Facile",
    duree: "10 min",
    tags: ["Linux", "Permissions"],
    enonce:
      "Un script d'administration doit être exécutable par son propriétaire, lisible et exécutable par les membres du groupe, et seulement lisible par les autres utilisateurs. Donnez la notation symbolique, la notation octale et la commande correspondante.",
    indice: "r vaut 4, w vaut 2 et x vaut 1. On additionne par catégorie.",
    etapes: [
      "Propriétaire : lecture + écriture + exécution = 4 + 2 + 1 = 7, soit rwx.",
      "Groupe : lecture + exécution = 4 + 1 = 5, soit r-x.",
      "Autres : lecture seule = 4, soit r--.",
      "On concatène les trois chiffres dans l'ordre propriétaire, groupe, autres.",
    ],
    reponse: `Symbolique : rwxr-xr--
Octal      : 754
Commande   : chmod 754 script.sh`,
    explication:
      "En pratique, un script d'administration contenant des informations sensibles mérite plutôt 750, voire 700. Donner le droit de lecture à tous expose le contenu du script, donc parfois des chemins ou des identifiants.",
  },
  {
    id: "complexite-boucles",
    titre: "Déterminer la complexité de deux boucles imbriquées",
    matiere: "algorithmique",
    difficulte: "Moyen",
    duree: "15 min",
    tags: ["Complexité", "Grand O"],
    enonce: `Donnez le nombre exact d'itérations puis la complexité en notation grand O de l'algorithme suivant.

somme = 0
pour i de 0 à n-1 faire
    pour j de i à n-1 faire
        somme = somme + t[i] * t[j]
    fin pour
fin pour`,
    indice:
      "La boucle interne ne repart pas de zéro : elle démarre à i. Comptez ses tours pour i = 0, puis i = 1, etc.",
    etapes: [
      "Pour i = 0, la boucle interne fait n tours. Pour i = 1, elle en fait n − 1.",
      "De manière générale, pour un i donné, la boucle interne effectue n − i tours.",
      "Le total vaut n + (n − 1) + … + 2 + 1, c'est-à-dire la somme des n premiers entiers.",
      "Cette somme vaut n(n + 1) / 2 = n²/2 + n/2.",
    ],
    reponse: `Nombre d'itérations : n(n + 1) / 2
Complexité          : O(n²)`,
    explication:
      "En grand O, on ne garde que le terme dominant et on ignore les constantes : n²/2 + n/2 devient O(n²). L'algorithme reste deux fois plus rapide qu'une double boucle complète, mais cela ne change pas sa classe de complexité.",
  },
  {
    id: "recherche-dichotomique",
    titre: "Écrire une recherche dichotomique en C",
    matiere: "algorithmique",
    difficulte: "Moyen",
    duree: "25 min",
    tags: ["C", "Recherche", "Tableaux"],
    enonce:
      "Écrivez une fonction C qui recherche une valeur dans un tableau d'entiers déjà trié par ordre croissant. La fonction renvoie l'indice de la valeur si elle est présente, et −1 sinon. Précisez la complexité obtenue.",
    indice:
      "Comparez la valeur cherchée à l'élément du milieu, puis éliminez la moitié du tableau à chaque tour.",
    etapes: [
      "On maintient deux bornes, gauche et droite, qui délimitent la zone encore à explorer.",
      "On calcule le milieu sans risque de dépassement : gauche + (droite − gauche) / 2.",
      "Si l'élément du milieu vaut la cible, on a trouvé. S'il est plus petit, on cherche à droite, sinon à gauche.",
      "La boucle s'arrête quand gauche dépasse droite, ce qui signifie que la valeur est absente.",
    ],
    reponse: `int recherche_dichotomique(const int t[], int n, int cible)
{
    int gauche = 0;
    int droite = n - 1;

    while (gauche <= droite) {
        int milieu = gauche + (droite - gauche) / 2;

        if (t[milieu] == cible)
            return milieu;
        else if (t[milieu] < cible)
            gauche = milieu + 1;
        else
            droite = milieu - 1;
    }
    return -1;
}

Complexité : O(log n)`,
    explication:
      "Écrire (gauche + droite) / 2 fonctionne sur de petits tableaux mais peut déborder la capacité d'un int sur de très grands indices. La forme gauche + (droite − gauche) / 2 évite ce défaut. Le tableau doit impérativement être trié : sinon le résultat est faux sans erreur visible.",
  },
  {
    id: "complement-a-deux",
    titre: "Représenter un nombre négatif en complément à deux",
    matiere: "architecture",
    difficulte: "Facile",
    duree: "10 min",
    tags: ["Binaire", "Codage"],
    enonce:
      "Représentez −37 sur 8 bits en complément à deux, puis donnez sa valeur hexadécimale. Vérifiez enfin votre résultat.",
    indice:
      "Écrivez d'abord +37 en binaire, inversez tous les bits puis ajoutez 1.",
    etapes: [
      "37 en binaire sur 8 bits : 0010 0101 (32 + 4 + 1).",
      "Inversion de tous les bits : 1101 1010.",
      "Ajout de 1 : 1101 1011.",
      "Conversion en hexadécimal par groupes de 4 bits : 1101 = D et 1011 = B.",
    ],
    reponse: `−37 sur 8 bits : 1101 1011
Hexadécimal    : 0xDB

Vérification : 1101 1011 lu en non signé vaut 219, et 219 − 256 = −37.`,
    explication:
      "Le bit de poids fort à 1 signale un nombre négatif. Sur 8 bits, le complément à deux couvre la plage −128 à +127 : il y a une valeur négative de plus que de valeurs positives, ce qui explique qu'on ne puisse pas représenter +128.",
  },
  {
    id: "simplification-boole",
    titre: "Simplifier une expression booléenne",
    matiere: "architecture",
    difficulte: "Facile",
    duree: "10 min",
    tags: ["Boole", "Logique"],
    enonce:
      "Simplifiez l'expression F = A·B + A·B̄ + Ā·B, puis vérifiez le résultat à l'aide d'une table de vérité.",
    indice: "Regroupez les deux premiers termes : ils ne diffèrent que par B.",
    etapes: [
      "A·B + A·B̄ = A·(B + B̄) grâce à la mise en facteur.",
      "Or B + B̄ = 1, donc ces deux termes se réduisent à A.",
      "Il reste F = A + Ā·B.",
      "La règle d'absorption donne A + Ā·B = A + B.",
    ],
    reponse: `F = A + B

Table de vérité :
A  B  |  F
0  0  |  0
0  1  |  1
1  0  |  1
1  1  |  1

L'expression de départ et A + B donnent bien la même colonne de sortie.`,
    explication:
      "L'identité A + Ā·B = A + B se retient facilement : si A vaut 1 le résultat est 1 quoi qu'il arrive, et si A vaut 0 alors Ā·B se réduit à B. Un tableau de Karnaugh à deux variables mène au même résultat plus vite.",
  },
  {
    id: "sql-moyennes",
    titre: "Calculer des moyennes avec une jointure SQL",
    matiere: "bdd",
    difficulte: "Moyen",
    duree: "20 min",
    tags: ["SQL", "Jointure", "Agrégation"],
    enonce: `On dispose de deux tables :

etudiant(id, nom, prenom, niveau)
note(id, id_etudiant, matiere, valeur)

Écrivez une requête qui affiche le nom, le prénom et la moyenne arrondie à deux décimales de chaque étudiant possédant au moins deux notes, classés de la meilleure à la moins bonne moyenne.`,
    indice:
      "Un filtre portant sur un résultat d'agrégation ne peut pas s'écrire dans WHERE.",
    etapes: [
      "On joint les deux tables sur la clé étrangère id_etudiant.",
      "On regroupe par étudiant pour que AVG s'applique à chaque étudiant séparément.",
      "Le filtre « au moins deux notes » porte sur un agrégat, il s'écrit donc dans HAVING et non dans WHERE.",
      "On trie enfin sur la moyenne calculée, en ordre décroissant.",
    ],
    reponse: `SELECT e.nom,
       e.prenom,
       ROUND(AVG(n.valeur), 2) AS moyenne
FROM etudiant e
JOIN note n ON n.id_etudiant = e.id
GROUP BY e.id, e.nom, e.prenom
HAVING COUNT(n.valeur) >= 2
ORDER BY moyenne DESC;`,
    explication:
      "WHERE filtre les lignes avant le regroupement, HAVING filtre les groupes après. Une jointure interne écarte automatiquement les étudiants sans aucune note ; il faudrait un LEFT JOIN pour les conserver.",
  },
];

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
        bonne: 2,
        explication:
          "/26 signifie 26 bits à 1. Le dernier octet vaut 11000000, soit 192. Il reste 6 bits d'hôte, donc 62 adresses utilisables.",
      },
      {
        enonce:
          "Quel protocole de transport garantit la livraison des données dans l'ordre ?",
        options: ["UDP", "TCP", "ICMP", "ARP"],
        bonne: 1,
        explication:
          "TCP numérote les segments et les acquitte, ce qui permet la retransmission et la remise dans l'ordre. UDP ne fournit aucune de ces garanties, en échange d'une latence plus faible.",
      },
      {
        enonce: "Combien d'adresses utilisables offre un réseau en /29 ?",
        options: ["4", "6", "8", "14"],
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
        bonne: 2,
        explication:
          "L'inode stocke les droits, le propriétaire, la taille, les dates et les pointeurs vers les blocs de données. Le nom du fichier est conservé dans le répertoire, ce qui permet à plusieurs noms de pointer vers le même inode.",
      },
      {
        enonce: "À quelles permissions correspond la commande chmod 640 ?",
        options: ["rw-r--r--", "rw-r-----", "rwxr-x---", "r--r--r--"],
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
        bonne: 1,
        explication:
          "Chaque comparaison élimine la moitié des éléments restants, d'où un nombre d'étapes proportionnel au logarithme de la taille. Le tableau doit être trié au préalable.",
      },
      {
        enonce: "Quelle est la complexité du tri rapide dans le pire des cas ?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)"],
        bonne: 2,
        explication:
          "Si le pivot choisi est systématiquement le plus petit ou le plus grand élément, les partitions sont déséquilibrées et le coût devient quadratique. En moyenne, le tri rapide reste en O(n log n).",
      },
      {
        enonce:
          "Quelle structure de données fonctionne selon le principe « dernier entré, premier sorti » ?",
        options: ["La file", "La pile", "La liste chaînée", "L'arbre binaire"],
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
        bonne: 2,
        explication:
          "Sans cas de base, les appels s'enchaînent indéfiniment jusqu'au débordement de la pile. Le cas de base est la condition d'arrêt qui rend la récursion finie.",
      },
      {
        enonce: "Quelle est la complexité du tri fusion ?",
        options: ["O(n)", "O(n log n)", "O(n²)", "O(log n)"],
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
        bonne: 1,
        explication:
          "On convertit par groupes de quatre bits : 1101 vaut D et 0110 vaut 6, d'où 0xD6, c'est-à-dire 214 en décimal.",
      },
      {
        enonce: "Comment s'écrit −1 sur 8 bits en complément à deux ?",
        options: ["1000 0001", "1111 1110", "1111 1111", "0000 0001"],
        bonne: 2,
        explication:
          "On part de 0000 0001, on inverse pour obtenir 1111 1110, puis on ajoute 1 : 1111 1111. C'est la raison pour laquelle −1 s'affiche souvent comme 255 ou 0xFF dans un contexte non signé.",
      },
      {
        enonce: "Combien de valeurs différentes peut-on coder sur 10 bits ?",
        options: ["100", "512", "1024", "2048"],
        bonne: 2,
        explication:
          "Le nombre de combinaisons vaut 2¹⁰, soit 1024. Chaque bit supplémentaire double le nombre de valeurs représentables.",
      },
      {
        enonce:
          "Quelle porte logique produit un 1 uniquement lorsque ses deux entrées sont différentes ?",
        options: ["ET", "OU", "OU exclusif", "NON-ET"],
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
        bonne: 2,
        explication:
          "Les requêtes préparées séparent le code SQL des données, ce qui empêche toute interprétation de la saisie comme instruction. Le filtrage manuel est fragile et se contourne souvent.",
      },
      {
        enonce: "Sur quel protocole repose la sécurité de HTTPS ?",
        options: ["SSH", "TLS", "IPsec", "WPA2"],
        bonne: 1,
        explication:
          "HTTPS est du HTTP transporté dans un tunnel TLS, qui assure le chiffrement, l'intégrité et l'authentification du serveur grâce à son certificat.",
      },
    ],
  },
];

export const videos = [
  {
    id: "sugg-osi",
    accroche: "OSI",
    titre: "Le modèle OSI expliqué couche par couche",
    resume: "Pour visualiser l'encapsulation avant le TD.",
    matiere: "reseaux",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-sous-reseaux",
    accroche: "/26",
    titre: "Découper un réseau en sous-réseaux",
    resume: "La méthode de calcul, pas à pas.",
    matiere: "reseaux",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-ordonnancement",
    accroche: "FIFO·SJF·RR",
    titre: "Ordonnancement : FIFO, SJF et tourniquet",
    resume: "Les diagrammes d'exécution en images.",
    matiere: "systemes",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-complexite",
    accroche: "O(n²)",
    titre: "La complexité en grand O, sans mathématiques",
    resume: "Comparer deux algorithmes en une minute.",
    matiere: "algorithmique",
    duree: "—",
    youtubeId: null,
  },
  {
    id: "sugg-sql",
    accroche: "JOIN",
    titre: "Les jointures SQL illustrées",
    resume: "INNER, LEFT et RIGHT, enfin clairs.",
    matiere: "bdd",
    duree: "—",
    youtubeId: null,
  },
];

export const examens = [
  {
    id: "blanc-reseaux-1",
    titre: "Devoir : réseaux, les fondamentaux",
    matiere: "reseaux",
    dureeMinutes: 60,
    consignes:
      "Sans document ni calculatrice. Justifie chaque calcul : la démarche compte autant que le résultat.",
    parties: [
      {
        titre: "Modèles en couches",
        points: 4,
        enonce:
          "1. Citez les sept couches du modèle OSI, de la plus basse à la plus haute.\n2. À quelle couche travaillent un commutateur et un routeur ? Justifiez en nommant l'adresse que chacun utilise.",
        corrige:
          "1. Physique, liaison de données, réseau, transport, session, présentation, application. (2 points)\n2. Le commutateur travaille en couche 2 : il achemine les trames d'après l'adresse MAC. Le routeur travaille en couche 3 : il achemine les paquets d'après l'adresse IP de destination. (2 points)",
      },
      {
        titre: "Adressage et sous-réseaux",
        points: 8,
        enonce:
          "On dispose du réseau 10.20.0.0/22, à découper en 8 sous-réseaux de même taille.\n1. Combien de bits faut-il emprunter ? Quel est le nouveau préfixe et le masque en décimal ?\n2. Combien d'hôtes utilisables par sous-réseau ?\n3. Donnez l'adresse de réseau et l'adresse de diffusion du premier et du dernier sous-réseau.",
        corrige:
          "1. 8 sous-réseaux = 2^3, donc 3 bits empruntés : le préfixe passe de /22 à /25, masque 255.255.255.128. (3 points)\n2. Il reste 32 - 25 = 7 bits d'hôte : 2^7 - 2 = 126 hôtes utilisables. (2 points)\n3. Le /22 couvre 10.20.0.0 à 10.20.3.255, par pas de 128. Premier sous-réseau : 10.20.0.0/25, diffusion 10.20.0.127. Dernier sous-réseau : 10.20.3.128/25, diffusion 10.20.3.255. (3 points)",
      },
      {
        titre: "Protocoles de transport",
        points: 4,
        enonce:
          "1. Donnez deux différences entre TCP et UDP.\n2. Indiquez le port et le protocole de transport habituels de : HTTPS, SSH, DNS (requête simple).",
        corrige:
          "1. TCP établit une connexion et garantit la livraison dans l'ordre (accusés de réception, retransmission). UDP n'établit pas de connexion et ne garantit ni la livraison ni l'ordre, mais il est plus léger. (2 points)\n2. HTTPS : 443/TCP. SSH : 22/TCP. DNS : 53/UDP (TCP pour les grosses réponses et les transferts de zone). (2 points)",
      },
      {
        titre: "Commutation et VLAN",
        points: 4,
        enonce:
          "Un commutateur porte deux VLAN : le VLAN 10 (secrétariat) et le VLAN 20 (étudiants). Un poste du VLAN 10 essaie de joindre un poste du VLAN 20.\n1. La communication fonctionne-t-elle avec ce seul commutateur ? Pourquoi ?\n2. Proposez une solution.",
        corrige:
          "1. Non : chaque VLAN est un domaine de diffusion distinct, et un commutateur de niveau 2 ne fait pas passer le trafic d'un VLAN à l'autre. (2 points)\n2. Il faut un routage entre VLAN : un routeur relié par un lien trunk avec une sous-interface par VLAN (« router on a stick »), ou un commutateur de niveau 3. (2 points)",
      },
    ],
  },
];

export const ressources = [
  {
    titre: "Computer Networks: A Systems Approach",
    couverture: "couvertures/cn.jpg",
    auteurs: "Larry Peterson et Bruce Davie",
    type: "Livre",
    langue: "Anglais",
    matiere: "reseaux",
    licence: "CC BY 4.0",
    statut: "libre",
    url: "https://book.systemsapproach.org/",
    note: "Ouvrage universitaire de référence, republié par ses auteurs sous licence libre.",
  },
  {
    titre: "Operating Systems: Three Easy Pieces",
    couverture: "couvertures/ostep.jpg",
    auteurs: "Remzi et Andrea Arpaci-Dusseau",
    type: "Livre",
    langue: "Anglais",
    matiere: "systemes",
    licence: "Gratuit en ligne",
    statut: "libre",
    url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    note: "Processus, mémoire et systèmes de fichiers expliqués très progressivement.",
  },
  {
    titre: "The Linux Command Line",
    couverture: "couvertures/tlcl.jpg",
    auteurs: "William Shotts",
    type: "Livre",
    langue: "Anglais",
    matiere: "systemes",
    licence: "CC BY-NC-ND",
    statut: "libre",
    url: "https://linuxcommand.org/tlcl.php",
    note: "Pour prendre le terminal en main, des premières commandes aux scripts shell.",
  },
  {
    titre: "Open Data Structures",
    couverture: "couvertures/ods.jpg",
    auteurs: "Pat Morin",
    type: "Livre",
    langue: "Anglais",
    matiere: "algorithmique",
    licence: "CC BY",
    statut: "libre",
    url: "https://opendatastructures.org/",
    note: "Structures de données avec versions en pseudo-code, Java, C++ et Python.",
  },
  {
    titre: "Think Python",
    couverture: "couvertures/tp.jpg",
    auteurs: "Allen B. Downey",
    type: "Livre",
    langue: "Anglais",
    matiere: "algorithmique",
    licence: "CC BY-NC",
    statut: "libre",
    url: "https://greenteapress.com/wp/think-python-2e/",
    note: "Introduction à la programmation orientée résolution de problèmes.",
  },
  {
    titre: "RFC 791 — Internet Protocol",
    auteurs: "IETF",
    type: "Spécification",
    langue: "Anglais",
    matiere: "reseaux",
    licence: "Document public",
    statut: "libre",
    url: "https://www.rfc-editor.org/rfc/rfc791",
    note: "Le texte fondateur d'IPv4 : format de l'en-tête et fragmentation.",
  },
  {
    titre: "Guide d'hygiène informatique",
    auteurs: "ANSSI",
    type: "Guide",
    langue: "Français",
    matiere: "securite",
    licence: "Diffusion publique",
    statut: "libre",
    url: "https://cyber.gouv.fr/publications/guide-dhygiene-informatique",
    note: "Quarante-deux mesures concrètes pour sécuriser un système d'information.",
  },
  {
    titre: "Documentation PostgreSQL",
    auteurs: "PostgreSQL Global Development Group",
    type: "Documentation",
    langue: "Anglais et français",
    matiere: "bdd",
    licence: "Licence PostgreSQL",
    statut: "libre",
    url: "https://www.postgresql.org/docs/",
    note: "Référence complète du SQL, avec de nombreux exemples exécutables.",
  },
  {
    titre: "Supports de cours du département",
    auteurs: "Enseignants de la filière",
    type: "Cours",
    langue: "Français",
    matiere: "reseaux",
    licence: "Droits réservés",
    statut: "attente",
    url: null,
    note: "Ne sera mis en ligne qu'après accord écrit du département et des enseignants concernés.",
  },
  {
    titre: "Annales et sujets d'examen",
    auteurs: "Établissement",
    type: "Annales",
    langue: "Français",
    matiere: "algorithmique",
    licence: "Droits réservés",
    statut: "attente",
    url: null,
    note: "Publication conditionnée à une autorisation explicite. Aucun sujet n'est hébergé pour l'instant.",
  },
  {
    titre: "Travaux pratiques de laboratoire",
    auteurs: "Enseignants de la filière",
    type: "TP",
    langue: "Français",
    matiere: "systemes",
    licence: "Droits réservés",
    statut: "attente",
    url: null,
    note: "Des énoncés originaux seront proposés en attendant une éventuelle autorisation.",
  },
];

export const annales = [];

/* Tout le contenu d'un coup, dans la forme que le relais publie. */
export const contenuDemo = {
  matieres,
  exercices,
  qcms,
  videos,
  examens,
  annales,
  ressources,
  publieLe: "2026-10-08T16:49:30.374Z",
};

/* Met ce contenu en place dans les tableaux du site, comme le ferait une
   publication (src/contenu.js les remplace de la même façon). Sert aux
   tests de la logique, qui ont besoin d'un contenu pour chercher dedans. */
export function chargerDemonstration() {
  const paires = [
    [vraiesMatieres, matieres],
    [vraisExercices, exercices],
    [vraisQcms, qcms],
    [videosSuggerees, videos],
    [vraisExamens, examens],
    [vraiesAnnales, annales],
    [vraiesRessources, ressources],
  ];
  for (const [cible, contenu] of paires) cible.splice(0, cible.length, ...structuredClone(contenu));
}
