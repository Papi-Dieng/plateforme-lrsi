/* ==================================================================
   Session de l'espace admin : le mot de passe, gardé le temps de
   l'onglet (sessionStorage), jamais au-delà, et les messages d'erreur
   du relais. Partagé par les pages admin ; le formulaire de connexion
   est dans components/ConnexionAdmin.jsx.
   ================================================================== */

import { useSyncExternalStore } from "react";

const CLE_SESSION = "lrsi-admin-ia";

// Copie en mémoire, si le navigateur refuse le stockage (navigation
// privée) : la session dure alors le temps de la page.
let enMemoire = "";
const abonnes = new Set();

export const lireSessionAdmin = () => {
  try {
    return sessionStorage.getItem(CLE_SESSION) ?? "";
  } catch {
    return enMemoire;
  }
};

export const ecrireSessionAdmin = (valeur) => {
  enMemoire = valeur || "";
  try {
    if (valeur) sessionStorage.setItem(CLE_SESSION, valeur);
    else sessionStorage.removeItem(CLE_SESSION);
  } catch {
    /* navigation privée : la copie en mémoire suffit */
  }
  abonnes.forEach((f) => f());
};

/* Le mot de passe admin de la session, partagé par la coque et les
   pages : se déconnecter depuis la barre latérale ferme toutes les
   pages d'un coup. */
export function useSessionAdmin() {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    lireSessionAdmin,
    () => ""
  );
}

const MESSAGES_ERREUR = {
  "mot-de-passe": "Mot de passe incorrect.",
  "admin-non-configure":
    "Le mot de passe admin n'a pas encore été créé sur le relais. Voir le README, section « Éduquer l'assistant ».",
  "trop-de-requetes": "Trop d'essais d'un coup. Attends une minute.",
  "trop-gros": "Le contenu dépasse la taille maximale acceptée par le relais (3 Mo).",
  "aucune-version-precedente": "Il n'y a pas encore de version précédente à restaurer.",
  "pas-un-pdf": "Ce fichier n'est pas un PDF valide.",
  "pdf-trop-gros": "Ce PDF dépasse 20 Mo. Compresse-le ou découpe-le en plusieurs chapitres.",
  quota: "Le quota gratuit de l'IA admin est atteint pour le moment. Réessaie plus tard.",
  surcharge: "Le service d'IA est saturé en ce moment. Réessaie dans quelques secondes.",
  "reponse-illisible": "L'IA a renvoyé une réponse illisible. Réessaie.",
  "rien-a-traiter": "Il n'y a rien à traiter : vérifie qu'il y a des chapitres dans cette matière.",
};

export const messageErreurAdmin = (code) =>
  MESSAGES_ERREUR[code] ?? `Le relais n'a pas pu répondre (${code}).`;
