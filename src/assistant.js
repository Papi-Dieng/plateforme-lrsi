import { matieres, getMatiere } from "./data/matieres";
import { exercices } from "./data/exercices";
import { qcms } from "./data/qcm";
import { videosSuggerees } from "./data/videos";
import { faiblesses, nonEvaluees } from "./analyseMatieres";

/* ==================================================================
   Moteur de l'assistant de révision.

   CE N'EST PAS UNE IA GÉNÉRATIVE. Il ne rédige aucune explication et
   n'invente jamais de contenu pédagogique : il comprend l'intention
   d'une question, cherche dans les données de la plateforme, et
   renvoie vers ce qui existe réellement — chapitres, exercices, QCM,
   vidéos — en s'appuyant sur l'analyse par matière déjà en place.

   C'est une limite, et c'est aussi une garantie : il ne peut pas se
   tromper sur une notion, puisqu'il n'en explique aucune. Quand il
   ne trouve rien, il le dit au lieu de meubler.

   Tout est ici, hors de React : le jour où une vraie IA arrivera en
   version 4, c'est ce fichier qu'on remplacera, sans toucher à la
   page.
   ================================================================== */

export const normalise = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* Mots trop courants pour désigner un sujet. Ils sont retirés APRÈS
   la détection d'intention, qui s'appuie justement sur certains
   d'entre eux. */
const MOTS_VIDES = new Set([
  "alors", "aussi", "avec", "bien", "bonjour", "cette", "comme", "comprendre",
  "comprends", "compris", "dans", "donne", "donner", "encore", "explique",
  "expliquer", "faire", "fais", "interroge", "interroger", "juste", "merci",
  "peux", "plus", "pour", "pourrais", "quoi", "reprendre", "reprends",
  "revise", "reviser", "salut", "sont", "stp", "tous", "tout", "veux",
  "vraiment", "propose", "proposer", "montre", "montrer", "aide", "aider",
  "niveau", "mien", "sujet", "chose", "truc", "petit", "petite",
  // Les mots d'une question, qui ne disent rien du sujet : sans eux,
  // « quelle différence entre un routeur et un commutateur » menait au
  // chapitre dont le résumé parle de « différence entre processus… ».
  "quel", "quelle", "quels", "quelles", "difference", "differences",
  "entre", "comment", "pourquoi", "quand", "combien", "lequel", "laquelle",
  "exemple", "exemples", "concret", "concrete", "definition", "definir",
  "signifie", "veut", "dire", "sert", "servent", "utilise", "utiliser",
  "fonctionne", "marche", "deux", "trois", "autre", "autres", "leur", "leurs",
  // Les petits mots de trois lettres : les mots de trois lettres sont
  // gardés pour les sigles (DNS, SQL, TCP, ARP…), pas pour ceux-là.
  "les", "des", "une", "est", "que", "qui", "sur", "par", "pas", "son", "ses",
  "aux", "ces", "mes", "tes", "nos", "vos", "ont", "mon", "ton", "moi", "toi",
  "lui", "elle", "eux", "ils", "cet", "car", "donc", "mais", "ou", "oui", "non",
  "bon", "fait", "peu", "tres", "trop", "quoi", "cela", "ceci", "tel", "via",
]);

/* La racine d'un mot, pour rapprocher les formes d'une même famille :
   « commutateur » et « commutation » (commutat), « routeur » et
   « routage » (rout), « tris » et « tri ». On retire une terminaison
   courante, sans descendre sous quatre lettres ; c'est grossier, mais
   suffisant pour un vocabulaire de cours. */
const TERMINAISONS = [
  "ateurs", "atrices", "ations", "ateur", "atrice", "ation",
  "ements", "ement", "euses", "euse", "eurs", "eur",
  "iques", "ique", "ages", "age", "ions", "ion", "ite", "ites",
  "ees", "ee", "er", "es", "e", "s", "x",
];
export function racine(mot) {
  for (const t of TERMINAISONS) {
    if (mot.endsWith(t) && mot.length - t.length >= 4) return mot.slice(0, -t.length);
  }
  return mot;
}

/* Les sigles de la question (DHCP, OSI, IPv6, SQL…) : au moins deux
   majuscules, ou des lettres suivies d'un chiffre. Ils désignent presque
   toujours le sujet, et comptent donc plus qu'un mot long et vague :
   dans « le protocole DHCP », c'est DHCP qui compte. */
const RE_SIGLE = /^(?=(?:[^A-Z]*[A-Z]){2})[A-Za-z0-9]{2,8}$|^[A-Za-z]{2,5}\d+$/;
const POIDS_SIGLE = 10;

function motsUtiles(texte) {
  const mots = normalise(texte)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m))
    .map(racine)
    .filter((m, i, t) => m.length >= 3 && t.indexOf(m) === i);
  mots.sigles = new Set(
    String(texte ?? "")
      .split(/[^A-Za-z0-9]+/)
      .filter((m) => RE_SIGLE.test(m))
      .map((m) => m.toLowerCase())
  );
  return mots;
}

/* ---------------------------------------------------------------- */
/* Intentions                                                        */
/* ---------------------------------------------------------------- */

const INTENTIONS = [
  {
    cle: "aide",
    motif:
      /\b(que sais.?tu|que peux.?tu|qui es.?tu|comment (ca|cela) marche|a quoi tu sers|tu sers a quoi|aide moi|bonjour|salut|bonsoir)\b/,
  },
  {
    cle: "priorite",
    motif:
      /\b(priorit|par quoi|quoi travailler|sur quoi|commencer|je dois reviser|mes faiblesses|mes points faibles|ou j en suis|mon niveau)\b/,
  },
  { cle: "qcm", motif: /\b(qcm|quiz|questionnaire|interroge|teste moi|test)\b/ },
  {
    cle: "exercice",
    motif: /\b(exercice|exercices|exo|exos|entrain|pratique|s entrainer)\b/,
  },
];

export function detecterIntention(question) {
  const q = normalise(question).replace(/[^a-z0-9]+/g, " ");
  for (const { cle, motif } of INTENTIONS) if (motif.test(q)) return cle;
  return "revision";
}

/* ---------------------------------------------------------------- */
/* Recherche dans le contenu                                         */
/* ---------------------------------------------------------------- */

/* Un élément marque un point par mot retrouvé dans son texte. Les
   correspondances longues comptent davantage : « adressage » est plus
   parlant que « base ». */
function score(mots, texte) {
  // Les mots du texte, ramenés à leur racine comme ceux de la question :
  // on compare mot à mot, pas des morceaux de mots (« rout » ne doit pas
  // se retrouver dans « déroute », ni « tri » dans « matrice »).
  const racines = new Set(
    normalise(texte)
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .map(racine)
  );
  let n = 0;
  for (const mot of mots) if (racines.has(mot)) n += mots.sigles?.has(mot) ? POIDS_SIGLE : mot.length;
  return n;
}

/* Champs pondérés : un mot trouvé dans un titre compte plus que le
   même mot trouvé dans le nom de la matière. Sans cela, « réseau »
   ferait remonter tous les chapitres de Réseaux au même rang que
   celui qui traite réellement la question. */
const scorePondere = (mots, champs) =>
  champs.reduce((n, [texte, poids]) => n + score(mots, texte) * poids, 0);

/* Les résultats trop loin du meilleur sont écartés : une réponse
   courte et juste vaut mieux qu'une liste qui noie la bonne entrée. */
const PLANCHER = 0.4;

/* Si la question contient un sigle (OSI, DHCP…), seuls les contenus qui
   le citent sont gardés : un chapitre qui ne parle pas d'OSI n'a rien à
   faire dans la réponse à une question sur OSI, même s'il partage le mot
   « modèle ». */
function meilleurs(liste, mots, champsDe, maximum = 3) {
  const sigles = [...(mots.sigles ?? [])].filter((s) => mots.includes(s));
  sigles.sigles = mots.sigles;
  let notes = liste
    .map((item) => ({
      item,
      points: scorePondere(mots, champsDe(item)),
      sigle: sigles.length > 0 && scorePondere(sigles, champsDe(item)) > 0,
    }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points);
  // Un sigle qu'aucun contenu ne cite (« la table ARP ») : c'est le
  // sujet de la question, et la plateforme n'en parle pas. Mieux vaut ne
  // rien proposer que des contenus trouvés sur un mot vague (« table »).
  if (sigles.length > 0) notes = notes.filter((x) => x.sigle);

  if (notes.length === 0) return [];

  const seuil = notes[0].points * PLANCHER;
  return notes
    .filter((x) => x.points >= seuil)
    .slice(0, maximum)
    .map((x) => x.item);
}

function chapitresTrouves(mots, maximum = 3) {
  const tous = matieres.flatMap((m) =>
    m.chapitres.map((c) => ({ ...c, matiere: m }))
  );
  return meilleurs(
    tous,
    mots,
    (c) => [
      [c.titre, 3],
      [c.resume ?? "", 2],
      [`${c.matiere.nom} ${c.matiere.nomCourt}`, 1],
    ],
    maximum
  );
}

const matieresTrouvees = (mots, maximum = 2) =>
  meilleurs(
    matieres,
    mots,
    (m) => [
      [`${m.nom} ${m.nomCourt}`, 3],
      [m.resume, 1],
    ],
    maximum
  );

const exercicesTrouves = (mots, maximum = 3) =>
  meilleurs(
    exercices,
    mots,
    (e) => [
      [e.titre, 3],
      [(e.tags ?? []).join(" "), 3],
      [e.enonce, 1],
      [getMatiere(e.matiere)?.nom ?? "", 1],
    ],
    maximum
  );

const qcmsTrouves = (mots, maximum = 2) =>
  meilleurs(
    qcms,
    mots,
    (q) => [
      [q.titre, 3],
      [q.description, 2],
      [getMatiere(q.matiere)?.nom ?? "", 1],
    ],
    maximum
  );

const videosTrouvees = (mots, maximum = 2) =>
  meilleurs(
    videosSuggerees,
    mots,
    (v) => [
      [v.titre, 3],
      [getMatiere(v.matiere)?.nom ?? "", 1],
    ],
    maximum
  );

/* ---------------------------------------------------------------- */
/* Fabrication des liens affichés                                    */
/* ---------------------------------------------------------------- */

const lienChapitre = (c) => ({
  type: "chapitre",
  titre: c.titre,
  detail: c.resume,
  matiere: c.matiere.id,
  to: `/cours/${c.matiere.id}`,
  meta: c.statut === "disponible" ? c.matiere.nom : "pas encore publié",
  indisponible: c.statut !== "disponible",
});

const lienMatiere = (m) => ({
  type: "matiere",
  titre: m.nom,
  detail: m.resume,
  matiere: m.id,
  to: `/cours/${m.id}`,
  meta: `${m.chapitres.length} chapitres`,
});

const lienExercice = (e) => ({
  type: "exercice",
  titre: e.titre,
  detail: e.enonce,
  matiere: e.matiere,
  to: `/exercices/${e.id}`,
  meta: `${e.difficulte} · ${e.duree}`,
});

const lienQcm = (q) => ({
  type: "qcm",
  titre: q.titre,
  detail: q.description,
  matiere: q.matiere,
  to: `/qcm/${q.id}`,
  meta: `${q.questions.length} questions · ${q.duree}`,
});

const lienVideo = (v) => ({
  type: "video",
  titre: v.titre,
  detail: "",
  matiere: v.matiere,
  to: "/videos",
  meta: v.youtubeId ? "vidéo disponible" : "lien à ajouter",
  indisponible: !v.youtubeId,
});

/* ---------------------------------------------------------------- */
/* Réponses                                                          */
/* ---------------------------------------------------------------- */

const RIEN_TROUVE = {
  intention: "inconnu",
  texte: [
    "Je n'ai rien trouvé sur ce sujet dans le contenu de la plateforme.",
    "Je ne rédige pas d'explication moi-même : je cherche dans les cours, les exercices et les QCM qui existent, et je t'y amène. Si le sujet n'y est pas encore, je ne peux pas l'inventer.",
  ],
  liens: [],
  suggestions: true,
};

function repondreAide() {
  return {
    intention: "aide",
    texte: [
      "Je suis un guide, pas une intelligence artificielle : je ne rédige aucune explication et je ne peux donc rien inventer. Ce que je sais faire, c'est chercher dans le contenu de la plateforme et t'amener au bon endroit.",
      "Tu peux me demander de retrouver un chapitre, un exercice ou un QCM sur une notion, ou me demander sur quoi travailler en priorité — dans ce cas je regarde tes résultats de QCM.",
    ],
    liens: [],
    suggestions: true,
  };
}

function repondrePriorite(analyse) {
  const fragiles = faiblesses(analyse);

  if (fragiles.length === 0) {
    const aucuneDonnee = nonEvaluees(analyse).length === analyse.length;

    return {
      intention: "priorite",
      texte: aucuneDonnee
        ? [
            "Je ne peux pas encore te répondre : tu n'as terminé aucun QCM, je n'ai donc aucun résultat à lire.",
            "Je ne devinerai pas ton niveau et je n'inventerai pas de faiblesse. Termine un QCM et je pourrai te dire sur quoi insister.",
          ]
        : [
            "D'après tes résultats, aucune matière n'est en difficulté pour l'instant.",
            "Le plus utile serait donc d'élargir : il reste des matières où tu n'as pas encore assez répondu pour que je puisse dire quoi que ce soit.",
          ],
      liens: qcms.slice(0, 2).map(lienQcm),
      suggestions: false,
    };
  }

  const premier = fragiles[0];
  const matiere = getMatiere(premier.id);

  return {
    intention: "priorite",
    texte: [
      `Je commencerais par ${premier.nom} : tu y es à ${premier.taux} % aux QCM, c'est ta matière la plus fragile.`,
      fragiles.length > 1
        ? `${fragiles.length} matières sont à consolider au total. Relis le cours, puis refais ses exercices et ses QCM.`
        : "C'est la seule matière à consolider pour l'instant. Relis le cours, puis refais ses exercices et ses QCM.",
    ],
    liens: [
      matiere ? lienMatiere(matiere) : null,
      ...exercices
        .filter((e) => e.matiere === premier.id)
        .slice(0, 2)
        .map(lienExercice),
    ].filter(Boolean),
    suggestions: false,
  };
}

function repondreExercice(mots, analyse) {
  let trouves = exercicesTrouves(mots);

  // Aucun sujet reconnu : on propose alors les exercices de la matière
  // la plus fragile, ce qui reste un choix fondé.
  let motif = null;
  if (trouves.length === 0) {
    const fragiles = faiblesses(analyse);
    if (fragiles.length > 0) {
      const cible = fragiles[0];
      trouves = exercices.filter((e) => e.matiere === cible.id).slice(0, 3);
      motif = `Je n'ai pas reconnu de sujet précis, alors je pars de ta matière la plus fragile : ${cible.nom}, à ${cible.taux} %.`;
    }
  }

  if (trouves.length === 0) return RIEN_TROUVE;

  return {
    intention: "exercice",
    texte: [
      motif ??
        `Voici ${trouves.length > 1 ? "les exercices" : "l'exercice"} qui ${
          trouves.length > 1 ? "correspondent" : "correspond"
        } à ta demande.`,
      "Chacun a un énoncé, un indice, la méthode détaillée puis la réponse. L'indice et la correction ne s'ouvrent que si tu le demandes.",
    ],
    liens: trouves.map(lienExercice),
    suggestions: false,
  };
}

function repondreQcm(mots) {
  let trouves = qcmsTrouves(mots);

  if (trouves.length === 0) {
    const m = matieresTrouvees(mots, 1)[0];
    if (m) trouves = qcms.filter((q) => q.matiere === m.id).slice(0, 2);
  }
  if (trouves.length === 0) return RIEN_TROUVE;

  return {
    intention: "qcm",
    texte: [
      `Voici de quoi t'interroger. ${
        trouves.length > 1 ? "Ces QCM se lancent" : "Ce QCM se lance"
      } en mode examen : minuteur, navigation entre les questions, correction à la fin.`,
      "Chaque réponse compte dans le niveau de la matière, c'est ce qui me permettra ensuite de te dire où tu en es.",
    ],
    liens: trouves.map(lienQcm),
    suggestions: false,
  };
}

function repondreRevision(mots) {
  const chapitres = chapitresTrouves(mots);
  const mats = chapitres.length === 0 ? matieresTrouvees(mots) : [];

  if (chapitres.length === 0 && mats.length === 0) return RIEN_TROUVE;

  const liens = [
    ...chapitres.map(lienChapitre),
    ...mats.map(lienMatiere),
    ...exercicesTrouves(mots, 2).map(lienExercice),
    ...qcmsTrouves(mots, 1).map(lienQcm),
    ...videosTrouvees(mots, 1).map(lienVideo),
  ];

  const principal = chapitres[0];
  const indisponible = principal && principal.statut !== "disponible";

  const texte = [
    principal
      ? `Le chapitre « ${principal.titre} » en ${principal.matiere.nom} traite de ça.`
      : `Ce sujet relève de ${mats[0].nom}.`,
    "Je ne te réexplique pas la notion moi-même : je ne suis pas une IA, et t'écrire une explication approximative serait pire qu'inutile. Je t'amène à ce qui a été écrit pour ça.",
  ];

  if (indisponible) {
    texte.push(
      "Attention : ce chapitre n'est pas encore publié. Sa mise en ligne attend l'autorisation du département et de l'enseignant."
    );
  }

  return { intention: "revision", texte, liens, suggestions: false };
}

/* ---------------------------------------------------------------- */
/* Point d'entrée                                                    */
/* ---------------------------------------------------------------- */

/* `intentionChoisie` : l'étudiant a choisi un raccourci dans la zone de
   saisie (« Un exercice », « Me tester »…) ; il l'emporte sur ce que
   la phrase laisserait deviner. */
export function repondre(question, analyse = [], intentionChoisie = null) {
  const brut = String(question ?? "").trim();
  if (brut.length === 0) return RIEN_TROUVE;

  const intention = intentionChoisie ?? detecterIntention(brut);
  const mots = motsUtiles(brut);

  if (intention === "aide") return repondreAide();
  if (intention === "priorite") return repondrePriorite(analyse);
  if (intention === "qcm") return repondreQcm(mots);
  if (intention === "exercice") return repondreExercice(mots, analyse);
  return repondreRevision(mots);
}

/* Les raccourcis de la zone de saisie (components/SaisieIA.jsx) : chacun
   impose une des intentions ci-dessus. `consigneIA` précède la question
   quand elle part à l'IA, pour qu'elle réponde dans le bon registre ;
   la page affiche le raccourci avec la question. */
export const RACCOURCIS = {
  revision: {
    label: "Expliquer",
    icone: "bulb",
    couleur: "sky",
    placeholder: "Quelle notion veux-tu que je t'explique ?",
    consigneIA: "Explique-moi : ",
  },
  exercice: {
    label: "Un exercice",
    icone: "pencil",
    couleur: "violet",
    placeholder: "Un exercice sur quel sujet ?",
    consigneIA: "Propose-moi un exercice, sans donner la correction tout de suite, sur : ",
  },
  qcm: {
    label: "Me tester",
    icone: "target",
    couleur: "flame",
    placeholder: "Sur quelle matière veux-tu être interrogé ?",
    consigneIA: "Pose-moi quelques questions pour vérifier mes connaissances, sans donner les réponses tout de suite, sur : ",
  },
};

/* Les quatre demandes proposées en un clic. Elles couvrent les
   quatre intentions reconnues, pour que rien ne tombe à vide. */
export const questionsRapides = [
  "Je n'ai pas compris le masque de sous-réseau, tu peux reprendre ?",
  "Donne-moi un exercice sur les adresses IP.",
  "Interroge-moi sur les réseaux.",
  "Sur quoi devrais-je travailler en priorité ?",
];
