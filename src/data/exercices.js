// Exercices de DÉMONSTRATION écrits pour la Version 1.
// Énoncés originaux : aucun sujet d'examen ni document universitaire repris.

export const difficultes = ["Facile", "Moyen", "Difficile"];

export const exercices = [
  {
    id: "decoupage-sous-reseaux",
    titre: "Découper un réseau en quatre sous-réseaux",
    matiere: "reseaux",
    competence: "res-adressage",
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
    verification: [
      { libelle: "Nouveau préfixe", attendu: "/26 | 26" },
      { libelle: "Nouveau masque, en décimal", attendu: "255.255.255.192" },
      { libelle: "Hôtes utilisables par sous-réseau", attendu: "62" },
      { libelle: "Adresse de diffusion du dernier sous-réseau", attendu: "192.168.10.255" },
    ],
  },
  {
    id: "adresse-reseau-diffusion",
    titre: "Trouver l'adresse de réseau et de diffusion",
    matiere: "reseaux",
    competence: "res-adressage",
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
    verification: [
      { libelle: "Masque, en décimal", attendu: "255.255.240.0" },
      { libelle: "Adresse de réseau", attendu: "172.16.32.0" },
      { libelle: "Adresse de diffusion", attendu: "172.16.47.255" },
      { libelle: "Nombre d'hôtes utilisables", attendu: "4094" },
    ],
  },
  {
    id: "encapsulation-osi",
    titre: "Suivre l'encapsulation d'un message",
    matiere: "reseaux",
    competence: "res-modeles",
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
    competence: "sys-ordonnancement",
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
    competence: "sys-admin",
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
    competence: "algo-complexite",
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
    competence: "algo-tris",
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
    competence: "arch-codage",
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
    competence: "arch-boole",
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
    competence: "bdd-sql",
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

export const getExercice = (id) => exercices.find((e) => e.id === id);
