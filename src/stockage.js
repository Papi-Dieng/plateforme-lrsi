import { lireSession } from "./session";

/* ==================================================================
   Où vont les données de l'étudiant.

   Depuis le 14 octobre 2026, le navigateur ne garde plus rien tout
   seul. La progression (scores, exercices, chapitres lus, favoris,
   planning, discussions…) n'est conservée que par un compte, et c'est
   le serveur qui la garde : src/synchro.js la recopie dans la table
   `donnees_etudiants` du projet Supabase.

     - compte connecté : les données passent par localStorage, qui sert
       de copie locale pour travailler hors ligne ; la synchronisation
       l'envoie au serveur et la ramène sur les autres appareils ;
     - invité : tout vit dans cette page, en mémoire vive. Recharger ou
       fermer l'onglet efface tout. C'est voulu — le site le dit avant
       d'entrer, et sur la page Paramètres.

   Ce qui n'est pas une donnée d'étudiant continue d'aller directement
   dans localStorage, parce que c'est un réglage de l'appareil et non
   du compte : la session (src/session.js), le thème, le refus des
   statistiques, les rappels, et les caches du contenu et des
   couvertures.

   Les trois fonctions ont exprès les noms de `localStorage` : passer
   une donnée d'un stockage à l'autre ne demande que de changer
   l'objet appelé.
   ================================================================== */

/* Vrai tant qu'un compte est connecté. Au démarrage, la session rangée
   par src/session.js suffit à le savoir : elle est écrite avant même que
   Supabase réponde, donc les premières lectures tombent au bon endroit. */
let persistant = false;
try {
  persistant = lireSession()?.mode === "compte";
} catch {
  /* pas de navigateur (tests) : on reste en mémoire */
}

const memoire = new Map();

export const stockage = {
  getItem(cle) {
    if (!persistant) return memoire.has(cle) ? memoire.get(cle) : null;
    try {
      return localStorage.getItem(cle);
    } catch {
      return null;
    }
  },
  setItem(cle, valeur) {
    if (!persistant) {
      memoire.set(cle, String(valeur));
      return;
    }
    try {
      localStorage.setItem(cle, String(valeur));
    } catch {
      /* stockage plein ou refusé : la donnée ne sera pas conservée */
    }
  },
  removeItem(cle) {
    if (!persistant) {
      memoire.delete(cle);
      return;
    }
    try {
      localStorage.removeItem(cle);
    } catch {
      /* rien à faire : la donnée reste, ou n'existait pas */
    }
  },
};

/* Vrai si ce qui est écrit maintenant sera encore là demain. Les pages
   s'en servent pour prévenir l'invité que rien n'est gardé. */
export const stockagePersistant = () => persistant;

/* Appelée par FournisseurSession.jsx à chaque changement de session.

   En entrant dans un compte, ce que l'invité venait de faire dans cette
   page le suit : on recopie la mémoire dans localStorage, d'où la
   synchronisation l'enverra au serveur.

   En sortant, la mémoire est vidée : sur un ordinateur partagé, le
   suivant ne doit rien retrouver. Ce qui reste dans localStorage est
   effacé par oublierDonneesLocales() (src/synchro.js), qui met d'abord
   de côté ce qui n'a pas pu partir. */
export function definirStockage(mode) {
  const suite = mode === "compte";
  if (suite === persistant) {
    if (!suite) memoire.clear();
    return;
  }
  persistant = suite;
  if (suite) {
    for (const [cle, valeur] of memoire) {
      try {
        localStorage.setItem(cle, valeur);
      } catch {
        /* tant pis : la donnée de la visite ne rejoint pas le compte */
      }
    }
  }
  memoire.clear();
}
