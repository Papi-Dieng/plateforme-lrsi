/* ==================================================================
   Un QCM écrit en texte, comme sur papier, lu en questions.

       1. Combien de couches compte le modèle OSI ?
       a) 4
       b) 5
       *c) 7
       d) 8
       > Le modèle OSI a 7 couches, TCP/IP en a 4.

   Ce qui est reconnu :
   - une QUESTION commence par un numéro (« 1. », « 2) », « Q3 : ») ou
     suit une question déjà complète ; elle peut tenir sur plusieurs
     lignes, tant qu'aucune réponse n'a commencé ;
   - une RÉPONSE commence par une lettre (« a) », « B. »), un tiret,
     une puce « • » ou une case « [ ] » ;
   - la BONNE réponse est marquée par « * », « ✓ », « ✔ », « (x) »,
     « [x] » ou « (bonne) », au début ou à la fin de la ligne, ou par une
     ligne « Réponse : c » après les réponses ;
   - l'EXPLICATION commence par « > » ou « Explication : ».

   Rien n'est deviné : une question sans bonne réponse marquée, ou avec
   plusieurs, est signalée au lieu d'être complétée au hasard.

   Fichier sans dépendance, pour être testé tel quel avec Node.
   ================================================================== */

const LETTRES = "abcdef";
const MAX_OPTIONS = 6;

const RE_QUESTION = /^(?:q(?:uestion)?\s*)?\d{1,3}\s*[.):\-–]\s*(.+)$/i;
const RE_QUESTION_Q = /^q(?:uestion)?\s*[:.\-–]\s*(.+)$/i;
const RE_EXPLICATION = /^(?:>\s*|explication\s*:\s*)(.*)$/i;
const RE_CLE = /^(?:bonne\s+)?r[ée]ponses?\s*(?:correcte)?\s*:\s*(.+)$/i;
const RE_MARQUE_DEBUT = /^(?:\*|✓|✔|\(x\)|\[x\])\s*/i;
const RE_MARQUE_FIN = /\s*(?:\*|✓|✔|\(x\)|\[x\]|\((?:bonne|vrai|correcte?)\))$/i;
const RE_OPTION = /^(?:([a-f])\s*[).]|[-•–]|\[\s?\]|\(\s?\))\s+(.*)$/i;

/* Une ligne de réponse : son texte et si elle est marquée bonne. */
function lireOption(ligne) {
  let reste = ligne;
  let bonne = false;
  if (RE_MARQUE_DEBUT.test(reste)) {
    bonne = true;
    reste = reste.replace(RE_MARQUE_DEBUT, "");
  }
  // « [x] » ou « (x) » tiennent lieu à la fois de puce et de marque.
  const m = reste.match(RE_OPTION);
  if (!m) return bonne && reste ? { texte: reste, bonne, lettre: null } : null;
  let texte = m[2].trim();
  // La marque peut aussi suivre la puce : « - * DNS », « - [x] 22 ».
  if (RE_MARQUE_DEBUT.test(texte)) {
    bonne = true;
    texte = texte.replace(RE_MARQUE_DEBUT, "").trim();
  }
  if (RE_MARQUE_FIN.test(texte)) {
    bonne = true;
    texte = texte.replace(RE_MARQUE_FIN, "").trim();
  }
  return { texte, bonne, lettre: m[1]?.toLowerCase() ?? null };
}

export function lireQuizTexte(source) {
  const questions = [];
  let courante = null;

  const terminer = () => {
    if (courante) questions.push(courante);
    courante = null;
  };
  const nouvelle = (enonce) => {
    terminer();
    courante = { enonce, options: [], marques: [], cle: null, explication: "" };
  };

  for (const brute of String(source ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const ligne = brute.trim();
    if (!ligne) continue;

    const explication = ligne.match(RE_EXPLICATION);
    if (explication && courante) {
      courante.explication = [courante.explication, explication[1].trim()].filter(Boolean).join(" ");
      continue;
    }

    const cle = ligne.match(RE_CLE);
    if (cle && courante?.options.length) {
      courante.cle = cle[1].trim();
      continue;
    }

    const option = courante ? lireOption(ligne) : null;
    if (option && option.texte) {
      courante.options.push(option.texte);
      courante.marques.push(option.bonne);
      continue;
    }

    const numerotee = ligne.match(RE_QUESTION) ?? ligne.match(RE_QUESTION_Q);
    if (numerotee) {
      nouvelle(numerotee[1].trim());
    } else if (courante && courante.options.length === 0) {
      // Énoncé sur plusieurs lignes.
      courante.enonce = `${courante.enonce}\n${ligne}`;
    } else {
      // Une question non numérotée après une question complète.
      nouvelle(ligne);
    }
  }
  terminer();

  return questions.map((q, i) => {
    const erreurs = [];
    let bonne = -1;
    const marquees = q.marques.map((m, k) => (m ? k : -1)).filter((k) => k >= 0);

    if (q.cle) {
      const lettre = q.cle.toLowerCase().replace(/[^a-f]/g, "");
      if (lettre.length === 1 && LETTRES.indexOf(lettre) < q.options.length) {
        bonne = LETTRES.indexOf(lettre);
      } else {
        // « Réponse : 7 » : on cherche la réponse qui porte ce texte.
        bonne = q.options.findIndex((o) => o.toLowerCase() === q.cle.toLowerCase());
        if (bonne < 0) erreurs.push(`la ligne « Réponse : ${q.cle} » ne désigne aucune des réponses`);
      }
    } else if (marquees.length === 1) {
      bonne = marquees[0];
    } else if (marquees.length > 1) {
      erreurs.push("plusieurs bonnes réponses sont marquées : n'en garde qu'une");
    } else {
      erreurs.push("aucune bonne réponse n'est marquée (ajoute « * » devant la bonne)");
    }

    if (!q.enonce.trim()) erreurs.push("l'énoncé est vide");
    if (q.options.length < 2) erreurs.push("il faut au moins deux réponses");
    if (q.options.length > MAX_OPTIONS) erreurs.push(`${MAX_OPTIONS} réponses au plus`);
    const doublons = new Set(q.options.map((o) => o.toLowerCase())).size !== q.options.length;
    if (doublons) erreurs.push("deux réponses sont identiques");

    return {
      numero: i + 1,
      enonce: q.enonce.trim(),
      options: q.options.slice(0, MAX_OPTIONS),
      bonne,
      explication: q.explication,
      erreurs,
    };
  });
}

/* Le sens inverse : des questions en texte, pour les modifier comme un
   document. `lireQuizTexte(ecrireQuizTexte(q))` redonne les mêmes
   questions. */
export function ecrireQuizTexte(questions) {
  return questions
    .map((q, i) =>
      [
        `${i + 1}. ${q.enonce.replace(/\n+/g, "\n")}`,
        ...q.options.map((o, k) => `${k === q.bonne ? "*" : ""}${LETTRES[k]}) ${o}`),
        q.explication ? `> ${q.explication}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

export const EXEMPLE_QUIZ = `1. Combien de couches compte le modèle OSI ?
a) 4
b) 5
*c) 7
d) 8
> Le modèle OSI a 7 couches ; le modèle TCP/IP en regroupe 4.

2. Quel masque correspond au préfixe /26 ?
a) 255.255.255.0
b) 255.255.255.128
c) 255.255.255.192 *
d) 255.255.255.224
> 26 bits à 1 : le dernier octet vaut 11000000, soit 192.`;
