import { matieres, getMatiere } from "./data/matieres";
import { exercices } from "./data/exercices";
import { qcms } from "./data/qcm";
import { videosSuggerees } from "./data/videos";
import { competences } from "./data/competences";
import { faiblesses, modulesAAmeliorer, nonEvaluees } from "./competences";

/* ==================================================================
   Moteur de l'assistant de révision.

   CE N'EST PAS UNE IA GÉNÉRATIVE. Il ne rédige aucune explication et
   n'invente jamais de contenu pédagogique : il comprend l'intention
   d'une question, cherche dans les données de la plateforme, et
   renvoie vers ce qui existe réellement — chapitres, exercices, QCM,
   vidéos — en s'appuyant sur l'analyse de compétences déjà en place.

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
]);

const motsUtiles = (texte) =>
  normalise(texte)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((m) => m.length >= 4 && !MOTS_VIDES.has(m));

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
  const t = normalise(texte);
  let n = 0;
  for (const mot of mots) if (t.includes(mot)) n += mot.length;
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

function meilleurs(liste, mots, champsDe, maximum = 3) {
  const notes = liste
    .map((item) => ({ item, points: scorePondere(mots, champsDe(item)) }))
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points);

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

const competencesTrouvees = (mots, maximum = 2) =>
  meilleurs(competences, mots, (c) => [[c.nom, 3]], maximum);

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
  const modules = modulesAAmeliorer(analyse);
  const fragiles = faiblesses(analyse);

  if (modules.length === 0) {
    const jamais = nonEvaluees(analyse);
    const aucuneDonnee = jamais.length === competences.length;

    return {
      intention: "priorite",
      texte: aucuneDonnee
        ? [
            "Je ne peux pas encore te répondre : tu n'as terminé aucun QCM, je n'ai donc aucun résultat à lire.",
            "Je ne devinerai pas ton niveau et je n'inventerai pas de faiblesse. Termine un QCM et je pourrai te dire sur quoi insister.",
          ]
        : [
            "D'après tes résultats, aucune compétence n'est en difficulté pour l'instant.",
            "Le plus utile serait donc d'élargir : il reste des compétences sur lesquelles tu n'as pas encore assez répondu pour que je puisse dire quoi que ce soit.",
          ],
      liens: qcms.slice(0, 2).map(lienQcm),
      suggestions: false,
    };
  }

  const premier = modules[0];
  const matiere = getMatiere(premier.matiere);

  return {
    intention: "priorite",
    texte: [
      `Je commencerais par « ${premier.chapitre} » en ${premier.nomMatiere}. La compétence « ${premier.motif} » est à ${premier.taux} %, c'est ton point le plus bas.`,
      fragiles.length > 1
        ? `${fragiles.length} compétences sont à consolider au total, et ${modules.length} chapitres s'y rattachent.`
        : "C'est la seule compétence à consolider pour l'instant.",
    ],
    liens: [
      matiere ? lienMatiere(matiere) : null,
      ...exercices
        .filter((e) => e.matiere === premier.matiere)
        .slice(0, 2)
        .map(lienExercice),
    ].filter(Boolean),
    suggestions: false,
  };
}

function repondreExercice(mots, analyse) {
  let trouves = exercicesTrouves(mots);

  // Aucun sujet reconnu : on propose alors ce qui correspond à la
  // compétence la plus faible, ce qui reste un choix fondé.
  let motif = null;
  if (trouves.length === 0) {
    const fragiles = faiblesses(analyse);
    if (fragiles.length > 0) {
      const cible = fragiles[0];
      trouves = exercices
        .filter((e) => e.competence === cible.id || e.matiere === cible.matiere)
        .slice(0, 3);
      motif = `Je n'ai pas reconnu de sujet précis, alors je pars de ton point faible : « ${cible.nom} », à ${cible.taux} %.`;
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
      "Chaque réponse est rattachée à une compétence, c'est ce qui me permettra ensuite de te dire où tu en es.",
    ],
    liens: trouves.map(lienQcm),
    suggestions: false,
  };
}

function repondreRevision(mots) {
  const chapitres = chapitresTrouves(mots);
  const mats = chapitres.length === 0 ? matieresTrouvees(mots) : [];
  const comps = competencesTrouvees(mots, 1);

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
  if (comps.length > 0) {
    texte.push(
      `Sur la plateforme, ce sujet relève de la compétence « ${comps[0].nom} ».`
    );
  }

  return { intention: "revision", texte, liens, suggestions: false };
}

/* ---------------------------------------------------------------- */
/* Point d'entrée                                                    */
/* ---------------------------------------------------------------- */

export function repondre(question, analyse = []) {
  const brut = String(question ?? "").trim();
  if (brut.length === 0) return RIEN_TROUVE;

  const intention = detecterIntention(brut);
  const mots = motsUtiles(brut);

  if (intention === "aide") return repondreAide();
  if (intention === "priorite") return repondrePriorite(analyse);
  if (intention === "qcm") return repondreQcm(mots);
  if (intention === "exercice") return repondreExercice(mots, analyse);
  return repondreRevision(mots);
}

/* Les quatre demandes proposées en un clic. Elles couvrent les
   quatre intentions reconnues, pour que rien ne tombe à vide. */
export const questionsRapides = [
  "Je n'ai pas compris le masque de sous-réseau, tu peux reprendre ?",
  "Donne-moi un exercice sur les adresses IP.",
  "Interroge-moi sur les réseaux.",
  "Sur quoi devrais-je travailler en priorité ?",
];
