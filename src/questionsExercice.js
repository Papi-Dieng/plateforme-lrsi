/* ==================================================================
   Les questions numérotées d'un énoncé d'exercice, pour « Répondre
   question par question » (components/RepondreExercice.jsx).

   Une question commence une ligne par son numéro : « 1. », « 2) »,
   « 3 - », « Question 4 : »… Les lignes qui suivent, jusqu'à la
   question suivante, lui appartiennent. La numérotation doit partir de
   1 et se suivre, sinon ce n'est pas une liste de questions (une
   adresse comme « 192.168… » en début de ligne, par exemple) : on
   renvoie alors une liste vide, et seul « Écrire ou coller ma réponse »
   est proposé. Il en faut au moins deux.
   ================================================================== */

const DEBUT = /^\s*(?:question\s*)?(\d{1,2})\s*[.):\-–]\s*(.*)$/i;

export function questionsDe(texte) {
  const questions = [];
  let courante = null;
  for (const ligne of String(texte ?? "").split(/\r?\n/)) {
    const m = ligne.match(DEBUT);
    if (m && Number(m[1]) === questions.length + 1) {
      courante = { numero: Number(m[1]), texte: m[2].trim() };
      questions.push(courante);
    } else if (courante && ligne.trim()) {
      courante.texte = `${courante.texte} ${ligne.trim()}`.trim();
    }
  }
  return questions.length >= 2 && questions.every((q) => q.texte) ? questions : [];
}

/* Les réponses question par question, en un seul texte pour l'IA : chaque
   réponse sous sa question, pour qu'elle puisse dire « la question 2… ». */
export const assemblerReponses = (questions, reponses) =>
  questions
    .map((q, i) => `${q.numero}. ${q.texte}\nRéponse : ${reponses[i]?.trim() || "(pas de réponse)"}`)
    .join("\n\n");
