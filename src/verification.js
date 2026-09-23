/* ==================================================================
   Vérifier la réponse d'un étudiant à un exercice.

   L'auteur indique, pour chaque résultat à trouver, la réponse
   attendue ; plusieurs écritures acceptées se séparent par « | »
   (« /26 | 26 »). L'étudiant tape la sienne et apprend si elle est
   juste, sans que la bonne lui soit montrée.

   La comparaison est souple sur la forme, stricte sur le fond :
   - majuscules, accents et espaces ne comptent pas ;
   - un nombre vaut le même nombre, quelle que soit son écriture
     (« 62 », « 62,0 », « 62.00 ») ;
   - une adresse IP compte octet par octet (« 192.168.010.001 » vaut
     « 192.168.10.1 ») ;
   - rien d'autre n'est deviné : « 64 » n'est pas « 62 ».

   Sans dépendance, pour être testé tel quel avec Node.
   ================================================================== */

const normaliser = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .replace(/[.;:]+$/, "");

const RE_NOMBRE = /^[-+]?\d+(?:[.,]\d+)?$/;
const RE_IP = /^\d{1,3}(?:\.\d{1,3}){3}$/;

function egales(saisie, attendue) {
  const a = normaliser(saisie);
  const b = normaliser(attendue);
  if (!a || !b) return false;
  if (a === b) return true;
  if (RE_NOMBRE.test(a) && RE_NOMBRE.test(b)) {
    return Number(a.replace(",", ".")) === Number(b.replace(",", "."));
  }
  if (RE_IP.test(a) && RE_IP.test(b)) {
    const octets = (ip) => ip.split(".").map(Number);
    return octets(a).every((o, i) => o === octets(b)[i]);
  }
  return false;
}

export const reponsesAcceptees = (attendu) =>
  String(attendu ?? "")
    .split("|")
    .map((r) => r.trim())
    .filter(Boolean);

/* Vrai si la saisie correspond à l'une des réponses acceptées. */
export const reponseJuste = (saisie, attendu) =>
  reponsesAcceptees(attendu).some((r) => egales(saisie, r));

/* Toutes les lignes d'une vérification : { juste, vide } par ligne. */
export const verifierExercice = (lignes, saisies) =>
  lignes.map((l, i) => {
    const saisie = saisies[i] ?? "";
    return { vide: !normaliser(saisie), juste: reponseJuste(saisie, l.attendu) };
  });
