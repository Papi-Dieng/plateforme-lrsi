/* ==================================================================
   Examens.

   Deux rubriques :
   - les EXAMENS BLANCS, rédigés pour la plateforme : un sujet en
     plusieurs parties, une durée, et le corrigé affiché à la fin ;
   - les ANNALES, sujets d'examens passés de l'établissement. Aucune
     n'est publiée sans autorisation écrite : l'espace admin l'exige,
     et le relais ne montre aux étudiants que les annales marquées
     comme autorisées.

   Ces listes servent de contenu par défaut. Dès qu'un contenu est
   publié depuis l'espace admin, c'est lui qui s'affiche.
   ================================================================== */

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

export const annales = [];

export const getExamen = (id) => examens.find((x) => x.id === id);
// Un examen en PDF se note sur le total indiqué dans l'admin ; un
// examen écrit, sur la somme de ses parties.
export const totalPoints = (examen) =>
  examen.format === "pdf"
    ? examen.pointsTotal ?? 20
    : examen.parties.reduce((n, p) => n + (p.points ?? 0), 0);
