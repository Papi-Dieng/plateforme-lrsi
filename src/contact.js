import { site } from "./data/site";

/* ==================================================================
   Écrire à l'équipe : par Gmail ou par WhatsApp, avec un message déjà
   commencé. Le site n'envoie rien lui-même : il ouvre l'application
   choisie, où l'étudiant complète, joint ses fichiers (PDF, photos)
   et envoie.

   WhatsApp n'apparaît que si `site.whatsapp` est renseigné
   (src/data/site.js), au format international sans « + » ni espaces.
   ================================================================== */

export const MESSAGE_CONTRIBUTION = {
  sujet: `Contribution à ${site.nom}`,
  corps: `Bonjour l'équipe ${site.nom},\n\nJe voudrais proposer :\n- matière :\n- type (cours, exercice, correction, QCM, vidéo…) :\n- description :\n\nJe joins mes fichiers à ce message.\n\nMerci !`,
};

/* Ouvre une rédaction Gmail, destinataire et sujet remplis. */
export const lienGmail = ({ sujet, corps }, destinataire = site.contact) =>
  `https://mail.google.com/mail/?${new URLSearchParams({ view: "cm", fs: "1", to: destinataire, su: sujet, body: corps })}`;

/* Ouvre une conversation WhatsApp avec le numéro de l'équipe, ou null
   si aucun numéro n'est renseigné. */
export function lienWhatsApp(texte, numero = site.whatsapp) {
  const chiffres = String(numero ?? "").replace(/\D/g, "");
  if (chiffres.length < 8) return null;
  return `https://wa.me/${chiffres}?text=${encodeURIComponent(texte)}`;
}
