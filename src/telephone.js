/* ==================================================================
   Comptes par numéro de téléphone, sans SMS.

   Supabase ne sait vérifier un numéro qu'en envoyant un SMS, payant.
   Le site range donc un compte « téléphone » comme un compte email
   dont l'adresse est fabriquée à partir du numéro, et qui ne reçoit
   jamais de courrier :

     77 123 45 67  →  221771234567@telephone.sunu-cours.invalid

   (« .invalid » est réservé : ce domaine n'existe pas et n'existera
   jamais.) Le compte est créé par le relais (serveur-ia/comptes.js),
   déjà confirmé ; l'étudiant se connecte ensuite avec son numéro et
   son mot de passe, comme partout.

   Ce fichier est partagé par le site et le relais : la même règle des
   deux côtés, sinon un étudiant inscrit ne pourrait plus se connecter.
   ================================================================== */

export const DOMAINE_TELEPHONE = "telephone.sunu-cours.invalid";
export const INDICATIF = "221"; // Sénégal : le numéro local suffit.

/* « 77 123 45 67 », « +221 77… », « 00221 77… » → « 221771234567 ».
   Un numéro étranger s'écrit avec son indicatif (+33…). Renvoie null
   si ce n'est visiblement pas un numéro. */
export function normaliserTelephone(texte) {
  const brut = String(texte ?? "").trim();
  if (!/^\+?[\d\s.\-()]+$/.test(brut)) return null;
  let chiffres = brut.replace(/\D/g, "");
  const international = brut.startsWith("+") || chiffres.startsWith("00");
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (!international && chiffres.length === 9 && /^[37]/.test(chiffres)) chiffres = INDICATIF + chiffres;
  if (chiffres.length < 8 || chiffres.length > 15) return null;
  return chiffres;
}

export const emailTelephone = (numero) => `${numero}@${DOMAINE_TELEPHONE}`;

export const estEmailTelephone = (email) => String(email ?? "").endsWith(`@${DOMAINE_TELEPHONE}`);

/* « 221771234567 » → « +221 77 123 45 67 », pour l'affichage. */
export function afficherTelephone(numero) {
  const n = String(numero ?? "");
  if (n.startsWith(INDICATIF) && n.length === 12) {
    const l = n.slice(3);
    return `+${INDICATIF} ${l.slice(0, 2)} ${l.slice(2, 5)} ${l.slice(5, 7)} ${l.slice(7)}`;
  }
  return n ? `+${n}` : "";
}
