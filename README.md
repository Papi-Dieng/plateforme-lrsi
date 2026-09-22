# Plateforme d'apprentissage LRSI

Version 1 : site de présentation, avec cours, exercices corrigés et QCM interactifs.

> **Le nom définitif n'est pas encore choisi.** Le site affiche un nom provisoire.
> Voir la section 2 pour le remplacer, c'est une seule ligne à modifier.

Projet étudiant, gratuit et sans objectif commercial, destiné aux étudiants de la
filière Réseaux et Systèmes Informatiques.

---

## 1. Démarrer le projet

```bash
npm install
npm run dev
```

Le site est alors disponible sur http://localhost:5173.

Autres commandes :

```bash
npm run build     # génère la version de production dans docs/
npm run preview   # sert la version de production en local
```

### Ouvrir index.html directement ne marche pas

C'est normal, et ce n'est pas un bug. Le fichier `index.html` à la racine ne
contient pas le site : il appelle `src/main.jsx`, que le navigateur ne sait ni
lire ni assembler. Il faut un serveur, ne serait-ce qu'en local.

La version compilée dans `docs/` ne s'ouvre pas non plus par double-clic : les
navigateurs refusent de charger un module JavaScript depuis une adresse
`file://`. Pour la voir, utiliser `npm run preview`, ou la déposer sur un
hébergeur statique. Il existe malgré tout une version faite pour le
double-clic, décrite juste en dessous.

Les adresses contiennent un dièse, par exemple `/#/cours`. C'est voulu : cela
évite les erreurs 404 au rechargement sur un hébergeur statique.

### La version hors ligne, en un seul fichier

```bash
npm run hors-ligne
```

Produit `hors-ligne/plateforme-lrsi-hors-ligne.html`, environ 0,5 Mo. Ce
fichier **contient tout le site** : le JavaScript et le CSS sont écrits à
l'intérieur du HTML, l'icône y est encodée en base64. Il n'a donc plus rien à
aller chercher, et c'est ce qui le rend ouvrable **par double-clic**, sans
serveur et sans connexion. Il se copie sur une clé USB ou s'envoie par
messagerie à un camarade.

Deux limites à connaître :

- les **vidéos** restent hébergées par YouTube, elles demandent une connexion ;
- la progression est enregistrée dans le navigateur, et un fichier ouvert
  depuis le disque ne partage pas cet espace avec le site en ligne : les deux
  versions ont chacune leur propre progression.

Ce fichier n'est pas versionné, `.gitignore` l'écarte. Il se régénère en une
commande, et le verser dans l'historique à chaque compilation l'alourdirait
pour rien. La configuration correspondante est `vite.config.hors-ligne.js`,
volontairement séparée de `vite.config.js` : les deux compilations n'ont pas
le même but, et mélanger les deux rendrait chacune illisible.

### Publier sur GitHub Pages

Le site compilé vit dans le dossier `docs/`, versionné avec le code. Aucune
automatisation à configurer : GitHub Pages sait publier ce dossier directement.

**Une seule fois**, dans le dépôt GitHub : `Settings`, puis `Pages`, puis
source `Deploy from a branch`, branche `main`, dossier `/docs`. Le site est
alors servi à l'adresse `https://<compte>.github.io/<depot>/`,
dans notre cas <https://papi-dieng.github.io/plateforme-lrsi/>.

**À chaque mise en ligne** :

```bash
npm run build
git add docs && git commit -m "Mettre le site en ligne à jour"
git push
```

Trois détails qui expliquent pourquoi cela fonctionne :

- les chemins des fichiers sont **relatifs**, donc le site tourne depuis le
  sous-dossier `/<depot>/` et pas seulement à la racine d'un domaine ;
- les adresses utilisent un **dièse**, donc recharger `/#/cours` ne provoque
  pas d'erreur 404, alors que GitHub Pages ne sait pas réécrire les adresses ;
- le fichier **`.nojekyll`** empêche GitHub de faire passer les fichiers par
  Jekyll, qui ignorerait certains noms. Il vit dans `public/`, car chaque
  compilation vide `docs/` : un fichier déposé à la main y serait effacé.

Le revers de cette méthode : chaque compilation ajoute une nouvelle version du
paquet JavaScript à l'historique Git, environ 500 Ko. Pour un projet étudiant
c'est sans conséquence. Si l'historique devenait lourd, il faudrait passer à
une publication automatique par GitHub Actions, qui ne verse rien dans le
dépôt.

### L'aperçu de partage

Quand le lien du site est collé dans WhatsApp, Facebook ou LinkedIn, c'est
`public/apercu-partage.png` qui s'affiche, au format imposé de 1200 × 630.

Ce PNG est **généré**, il ne se modifie pas à la main. La source est
`design/apercu-partage.svg` : c'est ce fichier qu'il faut éditer, par exemple
si le nom de la plateforme change. La conversion en PNG est obligatoire, les
réseaux sociaux n'affichant pas les SVG.

```bash
npm install --no-save sharp
node -e "const s=require('sharp'),f=require('fs');s(f.readFileSync('design/apercu-partage.svg')).resize(1200,630).png().toFile('public/apercu-partage.png').then(i=>console.log(i.width+'x'+i.height))"
```

L'option `--no-save` évite d'ajouter `sharp` aux dépendances du projet : il
n'est utile que le jour où l'image change.

Attention : les balises `og:image`, `og:url` et `canonical` de `index.html`
contiennent l'adresse **absolue** du site. Un chemin relatif y serait inutile,
les robots qui lisent la page ne sauraient pas le résoudre. Ces trois adresses
sont donc à corriger si le site déménage.

---

## 2. Identité visuelle

### Nom : à choisir

Le site affiche pour l'instant **JàngRSI**, un nom provisoire. « Jàng »
signifie *apprendre* en wolof, associé au sigle de la filière.

Pour le remplacer, une seule ligne à modifier dans `src/data/site.js` :

```js
export const site = {
  nom: "TonNomIci",
  …
};
```

Cela met à jour l'en-tête, le pied de page, le titre de l'onglet et toutes les
pages. Rien d'autre dans le code ne dépend du nom : les données enregistrées
dans le navigateur utilisent volontairement des clés neutres (`lrsi-theme`,
`lrsi-scores`), pour que les scores des étudiants survivent à un changement de
nom.

Baseline actuelle : *Apprendre, réviser, s'entraîner.*

### Logo

Trois nœuds reliés en triangle : un schéma réseau lisible à petite taille.
Défini deux fois, volontairement :

- `public/logo.svg` pour l'icône d'onglet du navigateur ;
- le composant `Logo` dans `src/components/Layout.jsx` pour l'affichage dans
  le site, afin qu'il suive le thème clair ou sombre.

### Couleurs

Trois familles seulement, déclarées dans `src/index.css` sous `@theme`.

| Rôle | Nom | Usage |
| --- | --- | --- |
| Principale | `brand` (bleu réseau) | Navigation, boutons, liens, titres accentués |
| Secondaire | `accent` (vert terminal) | Réussite, chapitres disponibles, bonnes réponses |
| Chaude | `sun` (ambre) | Indices, à venir, points d'attention |
| Vive | `flame` (orange) | Élément actif de la barre latérale, appels à l'action |
| Vive | `lime` (vert citron) | Bouton « Continuer », encart de suggestion |
| Neutre | `ink` | Textes, bordures, fonds |

Chaque famille dispose d'une échelle de 50 à 950. Pour changer la couleur
principale du site, il suffit de modifier les variables `--color-brand-*`.

### Une couleur par matière

Chaque matière porte sa propre couleur, la même partout : carte du tableau de
bord, pastille d'icône, barre de progression du profil, page de la matière.

| Matière | Clé `couleur` | Teinte |
| --- | --- | --- |
| Réseaux informatiques | `bleu` | bleu réseau |
| Systèmes d'exploitation | `emeraude` | vert émeraude |
| Algorithmique et programmation | `violet` | violet |
| Architecture des ordinateurs | `ardoise` | presque noir |
| Bases de données | `orange` | orange vif |
| Cybersécurité | `framboise` | rose framboise |

Les jeux de classes vivent dans `src/data/couleurs.js`. Elles y sont écrites en
toutes lettres et jamais assemblées à la volée : Tailwind lit le code source
pour savoir quelles classes produire, et une classe construite par
concaténation serait absente de la feuille de style finale.

### Typographie et thème

Police système en pile `sans`, police `mono` pour le code et les résultats
numériques. Le thème sombre est piloté par la classe `.dark` sur `<html>` :
il suit la préférence du système, l'étudiant peut le changer, et le choix est
conservé dans le navigateur.

---

## 3. Les pages du site

Le site se divise en deux temps. D'abord les **écrans d'entrée**, qui n'ont pas
de barre latérale : l'accueil public, la connexion et l'inscription. Ensuite
l'**application**, dans une coque avec barre latérale d'icônes à gauche, barre
du haut avec la recherche et le profil, contenu au centre. Sur mobile, la barre
latérale laisse place à un menu dans la barre du haut.

| Route | Page | Contenu |
| --- | --- | --- |
| `/` | Accueil public | Présentation, recherche, entrée en mode invité |
| `/connexion` | Connexion | Formulaire de démonstration et mode invité |
| `/inscription` | Inscription | Formulaire de démonstration et mode invité |
| `/tableau-de-bord` | Tableau de bord | Cartes de matières, prochains chapitres, QCM suggéré |
| `/cours` | Espace des cours | Recherche et filtre par semestre, grille des matières |
| `/cours/:matiereId` | Détail d'une matière | Chapitres, exercices liés, QCM liés |
| `/exercices` | Exercices corrigés | Recherche, filtres matière et difficulté |
| `/exercices/:exerciceId` | Détail d'un exercice | Énoncé, indice, méthode, réponse, à retenir |
| `/qcm` | QCM interactifs | Liste des questionnaires, meilleur score local |
| `/qcm/:qcmId` | Session de QCM | Mode examen : minuteur, navigateur de questions, résultat |
| `/bibliotheque` | Bibliothèque | Ressources libres, et ressources en attente d'autorisation |
| `/projet` | Le projet | Autorisations, versions, rôles, sécurité, IA, pile technique |
| `/videos` | Vidéos | Filtre par matière, lecteur intégré |
| `/profil` | Mon profil | Avatar, nom d'utilisateur, coordonnées |
| `/favoris` | Mes favoris | Matières, chapitres, exercices, QCM et vidéos mis de côté |
| `/progression` | Ma progression | Tableau de bord en grille : vue d'ensemble, précision, régularité, matières, QCM |
| `/parametres` | Paramètres | Thème, session, données conservées sur l'appareil |
| `/conditions` | Conditions d'utilisation | Cadre d'usage, droits, données personnelles |
| `/admin` | Administration | Page d'auteur : inventaire, couverture, liste de rédaction |

Toute autre adresse affiche une page « introuvable » avec un retour à l'accueil.

---

## 4. Structure du dossier

```
lrsi-platform/
├── public/
│   └── logo.svg              icône d'onglet
├── src/
│   ├── components/
│   │   ├── Icon.jsx          jeu d'icônes SVG, sans dépendance externe
│   │   ├── Layout.jsx        en-tête, navigation, thème, pied de page
│   │   ├── videos.jsx        briques vidéo : carte, lecteur, formulaire
│   │   ├── BoutonFavori.jsx  marque-page commun à tous les contenus
│   │   └── ui.jsx            briques réutilisables (boutons, badges, filtres…)
│   ├── data/
│   │   ├── site.js           nom, navigation, objectifs, feuille de route
│   │   ├── matieres.js       matières et chapitres
│   │   ├── exercices.js      exercices et corrections
│   │   ├── qcm.js            questionnaires
│   │   ├── couleurs.js       une couleur par matière
│   │   ├── competences.js    compétences et chapitres associés
│   │   ├── avatars.jsx       six vignettes dessinées en SVG
│   │   ├── videos.js         emplacements de vidéos d'explication
│   │   └── bibliotheque.js   ressources et leur statut d'autorisation
│   ├── pages/
│   │   ├── Bienvenue.jsx         accueil public
│   │   ├── Authentification.jsx  connexion et inscription
│   │   ├── Accueil.jsx           tableau de bord
│   │   ├── Cours.jsx             liste et détail
│   │   ├── Exercices.jsx         liste et détail
│   │   ├── Qcm.jsx               liste et session
│   │   ├── Bibliotheque.jsx
│   │   ├── Projet.jsx
│   │   ├── Profil.jsx            fiche : avatar, pseudo, coordonnées
│   │   ├── Progression.jsx       suivi des acquis
│   │   ├── Videos.jsx            galerie filtrable
│   │   ├── Favoris.jsx           tout ce qui est mis de côté
│   │   ├── Parametres.jsx        thème et données locales
│   │   ├── Conditions.jsx        conditions d'utilisation
│   │   └── Admin.jsx             page d'auteur, hors parcours étudiant
│   ├── session.js            contexte et hook de session (voir section 7)
│   ├── FournisseurSession.jsx  le fournisseur, séparé du hook
│   ├── progression.js        exercices travaillés, scores, favoris, vidéos
│   ├── competences.js        analyse : forces, faiblesses, modules
│   ├── profil.js             fiche profil et vérifications
│   ├── App.jsx               déclaration des routes
│   ├── main.jsx              point d'entrée
│   └── index.css             thème, couleurs, styles de base
├── index.html
└── vite.config.js
```

**Un mot de vocabulaire.** Dans cette version, une filière correspond à une
matière : il n'y a pas de niveau intermédiaire. Chaque matière porte un
`nomCourt`, utilisé pour les pastilles de filtre et les badges, là où le nom
complet serait trop long. Le jour où la plateforme s'ouvrira à d'autres
formations, la filière deviendra un niveau au-dessus de la matière.

**Le principe à retenir** : tout le contenu pédagogique vit dans `src/data/`,
jamais dans les pages. Ajouter un cours, un exercice ou un QCM ne demande donc
pas de toucher à l'interface. C'est ce qui rendra le passage à la version 2
simple : il suffira de remplacer ces fichiers par des appels à une API, sans
réécrire les pages.

---

## 5. Ajouter du contenu

### Une matière

Dans `src/data/matieres.js`, ajouter un objet au tableau :

```js
{
  id: "mathematiques",            // identifiant unique, utilisé dans l'URL
  nomCourt: "Mathématiques",      // pastilles de filtre et badges
  nom: "Mathématiques pour l'informatique",
  couleur: "violet",              // voir src/data/couleurs.js
  icone: "code",                  // voir les noms dans src/components/Icon.jsx
  semestre: "Semestre 1",
  resume: "Une phrase qui dit à quoi sert la matière.",
  chapitres: [
    {
      titre: "Logique et ensembles",
      resume: "Ce que couvre le chapitre.",
      duree: "3 h",
      statut: "disponible",       // disponible | bientot
    },
  ],
}
```

### Un exercice

Dans `src/data/exercices.js`. Les champs `indice`, `etapes`, `reponse` et
`explication` alimentent respectivement le coup de pouce, la méthode pas à pas,
le bloc de réponse et l'encadré « à retenir ».

### Une compétence

C'est ce qui permet à la plateforme de dire « relis ce chapitre » plutôt que
« tu es faible en réseaux ». La chaîne est la suivante :

```text
question ratée → compétence faible → chapitres à relire
```

Trois endroits à renseigner, et seulement trois :

1. `src/data/competences.js` déclare la compétence, sa matière et les
   chapitres qui la travaillent. Les titres de chapitres reprennent mot pour
   mot ceux de `matieres.js`.
2. Chaque question de `qcm.js` porte un champ `competence`.
3. Chaque exercice de `exercices.js` porte le même champ.

```js
// src/data/competences.js
{
  id: "res-adressage",
  nom: "Adressage et sous-réseaux",
  matiere: "reseaux",
  chapitres: ["Adressage IPv4 et sous-réseaux", "Introduction à IPv6"],
}

// src/data/qcm.js, dans une question
competence: "res-adressage",
```

**Ce qui entre dans le calcul, et ce qui n'y entre pas.** Seules les réponses
aux QCM comptent, parce qu'elles seules enregistrent du juste et du faux.
Ouvrir la correction d'un exercice prouve qu'on a travaillé, pas qu'on a
réussi : les exercices comptent dans la progression, jamais dans le niveau.

**Le garde-fou.** En dessous de `MINIMUM_REPONSES`, fixé dans
`src/competences.js`, aucune étiquette n'est posée et la compétence s'affiche
« pas assez de réponses ». Juger une compétence sur une ou deux questions n'a
aucun sens, et annoncer une faiblesse à tort décourage pour rien. Cette
constante est volontairement basse pendant la phase de création : **la relever
vers 8 ou 10 dès que chaque filière approchera la vingtaine de QCM.**

Enfin, seule la dernière tentative de chaque QCM alimente l'analyse. Refaire un
questionnaire met donc à jour le niveau au lieu de l'additionner.

**Où voir ce qu'il reste à écrire.** La page `/admin` liste les trente
compétences triées des plus démunies aux plus fournies, avec leur nombre de
questions. Elle affiche aussi l'objectif chiffré : il faut environ
`compétences × MINIMUM_REPONSES` questions pour que toutes puissent recevoir un
verdict. Cette page s'adresse à l'auteur, pas aux étudiants : elle vit dans la
section « Coulisses » du menu profil, jamais dans la barre latérale.

### Une vidéo d'explication

Deux possibilités.

**Depuis le site**, avec le bouton « Ajouter une vidéo » du tableau de bord :
coller l'adresse YouTube suffit, la plateforme en extrait l'identifiant. La
vidéo n'est alors visible que dans ce navigateur.

**Dans le code**, pour que la vidéo apparaisse pour tout le monde : ouvrir
`src/data/videos.js` et renseigner `youtubeId` avec l'identifiant à onze
caractères. Dans l'adresse `https://www.youtube.com/watch?v=AbCdEf12345`,
l'identifiant est `AbCdEf12345`.

Aucune vidéo n'est hébergée par la plateforme : seul l'identifiant est
conservé, la lecture se fait chez YouTube, et le lecteur ne se charge qu'au
moment où l'on clique. Ne publier que des liens qu'on a le droit de partager.

### Un QCM

Dans `src/data/qcm.js`. `bonne` est l'indice de la bonne réponse dans `options`,
en commençant à zéro. Chaque question doit avoir une `explication` : c'est elle
qui fait la différence entre un questionnaire et un vrai outil de révision.

---

## 6. Ce qui est déjà en place

- Accueil public avec trois entrées : se connecter, créer un compte, ou
  continuer en mode invité.
- Coque d'application : barre latérale, barre du haut, menu mobile.
- Tableau de bord d'accueil : une carte colorée par matière, avec sa progression
  en chapitres, ses compteurs d'exercices et de QCM, et un marque-page.
- Filtres par domaine et recherche globale, tous deux inscrits dans l'URL : une
  vue filtrée se partage par simple copie du lien.
- Favoris sur tous les contenus : matière, chapitre, exercice, QCM et vidéo.
  Un marque-page sur chaque carte, une page dédiée dans la barre latérale, et
  des filtres par type. Les favoris de l'ancien format, qui ne portaient que
  des matières, sont convertis automatiquement à la lecture.
- Page de profil : progression par matière, résultats des QCM avec le meilleur
  score et le nombre de tentatives, questionnaires à reprendre sous 70 %,
  matières en favori, et remise à zéro en deux temps.
- Vidéos d'explication : rangée défilante sur le tableau de bord et page
  dédiée dans la barre latérale, filtrable par matière.
  Lecteur intégré ouvert au clic, ajout d'un lien YouTube depuis l'interface.
- Fiche profil : six avatars dessinés, nom d'utilisateur, âge, téléphone,
  e-mail, niveau et matricule, avec vérification des formats.
- Menu déroulant sous l'avatar : profil, progression, paramètres, conditions
  d'utilisation et sortie de session.
- Page paramètres : choix du thème et tableau de tout ce qui est conservé sur
  l'appareil, avec effacement en deux temps.
- Suivi de progression en grille « bento » : onze cartes qui apparaissent en
  cascade, dont une vue d'ensemble, un anneau de précision, une bande de
  régularité sur quatorze jours, les barres par matière et les résultats des
  QCM.
- Analyse par compétence : forces, faiblesses et chapitres à relire, avec un
  seuil minimal de réponses avant tout verdict (voir section 7).
- Amorce d'espace d'administration : inventaire du contenu, couverture de
  l'analyse et liste des compétences à alimenter. Page d'auteur, séparée du
  parcours étudiant.
- QCM en mode examen : minuteur avec temps imparti, navigation libre entre les
  questions, marquage « à revoir », effacement d'une réponse, confirmation
  avant de rendre, puis écran de résultat avec points, temps passé, précision
  et correction détaillée.
- Thème clair et sombre, mémorisé d'une visite à l'autre.
- Recherche et filtres sur les cours et les exercices.
- Exercices avec indice et correction révélés à la demande.
- Meilleur score par QCM conservé dans le navigateur.
- Bibliothèque séparant clairement les ressources libres de celles en attente
  d'autorisation.
- Liens externes en `noopener noreferrer`, lien d'évitement vers le contenu,
  libellés accessibles sur les boutons d'icône.

## 7. Ce qui viendra ensuite

**Version 2 — ressources pédagogiques.** Remplacer les fichiers de `src/data/`
par une API Node.js et Express, avec une base de données. Ajouter une interface
d'administration pour créer cours, exercices et QCM sans toucher au code.

### Où vit la progression

Trois clés dans le navigateur, toutes écrites au même endroit,
`src/progression.js` :

| Clé | Contenu | Alimentée par |
| --- | --- | --- |
| `lrsi-exercices` | exercices dont la correction a été ouverte | page d'un exercice |
| `lrsi-scores` | meilleur score et nombre de tentatives par QCM | fin d'un QCM |
| `lrsi-favoris` | favoris, tous types confondus | marque-page de chaque carte |
| `lrsi-videos` | vidéos YouTube ajoutées par l'étudiant | tableau de bord |
| `lrsi-videos-vues` | vidéos déjà ouvertes | lecteur vidéo |
| `lrsi-profil` | avatar, nom d'utilisateur, coordonnées | page profil |

Aucune de ces données ne quitte l'appareil, et elles ne suivent pas l'étudiant
d'un ordinateur à l'autre. Pour passer au suivi par compte en version 3, il
suffira de remplacer le contenu de ce fichier par des appels à l'API : aucune
page n'a besoin de changer.

### Les écrans de connexion ne connectent à rien

C'est le point à retenir avant de montrer le projet à quelqu'un. Il n'y a pas
encore de serveur, donc pas d'authentification :

- les formulaires ne vérifient aucun identifiant et n'envoient rien ;
- **le mot de passe saisi n'est jamais enregistré**, il reste dans l'état du
  composant le temps de la saisie ;
- seul le nom affiché est conservé, dans le navigateur, sous la clé
  `lrsi-session`, pour personnaliser la barre du haut ;
- le mode invité ne conserve strictement aucune donnée personnelle.

Un encadré le dit explicitement sur les deux formulaires, et invite à ne pas
saisir un mot de passe utilisé ailleurs. Toute la logique tient dans
`src/session.js`, qui sera remplacé par des appels à l'API en version 3.

**Version 3 — comptes et accès.** Authentification, rôles étudiant et
administrateur, progression enregistrée côté serveur plutôt que dans le
navigateur. Points de vigilance : hachage des mots de passe avec bcrypt ou
Argon2, vérification des droits côté serveur pour chaque ressource réservée,
et jamais un simple masquage dans l'interface.

**Version 4 — assistant de révision.** Intégration d'un modèle de langage, avec
des limites explicites : pas d'invention d'informations pédagogiques, pas
d'accès à des documents non autorisés.

**Version 5 — ouverture.** D'autres filières et d'autres établissements.

---

## 8. Cadre du projet

- Le contenu actuel est **du contenu de démonstration**. Les énoncés d'exercices
  et les questions de QCM ont été rédigés pour la plateforme.
- **Aucun document universitaire n'est publié sans autorisation.** Les ressources
  appartenant à l'université ou aux enseignants n'apparaissent dans la
  bibliothèque qu'à titre de projet, sans être hébergées.
- Les ressources externes listées renvoient vers les sites officiels de leurs
  auteurs, avec leur licence indiquée. Rien n'est recopié ni réhébergé.
- Projet gratuit, sans bénéfice financier. Toute ressource est retirée à la
  demande de son auteur.
