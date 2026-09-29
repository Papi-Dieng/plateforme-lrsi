import { createContext, useContext } from "react";

/* ==================================================================
   Session : qui est entré sur le site.

     - "invite" : simple visite, sans compte. Tout reste dans ce
       navigateur.
     - "compte" : un étudiant connecté à son compte (src/comptes.js).
       Ses données le suivent sur tous ses appareils (src/synchro.js).

   Ce qui est retenu ici ne sert qu'à l'affichage (nom, identifiant),
   pour que l'en-tête soit juste dès le premier rendu. La vraie session
   d'un compte (jetons, expiration) est gardée par Supabase, et c'est
   elle qui fait foi : FournisseurSession.jsx la relit au démarrage.

   Ce fichier ne contient volontairement aucun composant : le fournisseur
   vit dans FournisseurSession.jsx. Mélanger un composant et un hook dans
   le même module casse le rechargement à chaud de Vite.
   ================================================================== */

export const CLE_SESSION = "lrsi-session";

export const SessionContext = createContext(null);

export function lireSession() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_SESSION) ?? "null");
    if (!brut) return null;
    if (brut.mode === "invite" || brut.mode === "compte") return brut;
    // Les anciens comptes « de démonstration » n'étaient que des visites.
    if (brut.mode === "demo") return { ...brut, mode: "invite", nom: "Invité" };
    return null;
  } catch {
    return null;
  }
}

export function ecrireSession(session) {
  try {
    if (session) localStorage.setItem(CLE_SESSION, JSON.stringify(session));
    else localStorage.removeItem(CLE_SESSION);
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
}

// Initiales affichées dans la barre du haut, à partir du nom.
export function initiales(nom) {
  const mots = String(nom ?? "")
    .trim()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (mots.length === 0) return "?";
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[1][0]).toUpperCase();
}

export function useSession() {
  const valeur = useContext(SessionContext);
  if (!valeur) {
    throw new Error("useSession doit être utilisé dans <FournisseurSession>.");
  }
  return valeur;
}
