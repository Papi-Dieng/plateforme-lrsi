import { createContext, useContext } from "react";

/* ==================================================================
   Session locale — VERSION 1

   ATTENTION : il n'y a pas encore de serveur, donc pas de véritable
   authentification. Ce module ne fait que retenir, dans le navigateur,
   le mode choisi à l'entrée :

     - "invite" : aucune donnée, simple visite ;
     - "demo"   : un identifiant saisi dans le formulaire de démonstration.

   AUCUN MOT DE PASSE N'EST ENREGISTRÉ NI TRANSMIS. Le formulaire ne
   vérifie rien : il sert à dessiner l'écran en attendant la version 3,
   qui apportera la vraie authentification côté serveur.

   Ce fichier ne contient volontairement aucun composant : le fournisseur
   vit dans FournisseurSession.jsx. Mélanger un composant et un hook dans
   le même module casse le rechargement à chaud de Vite.
   ================================================================== */

export const CLE_SESSION = "lrsi-session";

export const SessionContext = createContext(null);

export function lireSession() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_SESSION) ?? "null");
    if (!brut || (brut.mode !== "invite" && brut.mode !== "demo")) return null;
    return brut;
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
