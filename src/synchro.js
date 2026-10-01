import { CLES } from "./progression";
import { CLE_REVISIONS } from "./revisions";
import { CLE_CONVERSATIONS } from "./conversations";
import { CLE_THEME, DONNEES, construireSauvegarde } from "./sauvegarde";

/* ==================================================================
   Synchronisation des données d'un compte (table donnees_etudiants,
   supabase/schema.sql).

   Le site continue de tout lire et écrire dans le navigateur, comme
   en mode invité : rien ne change pour les pages. Ce module recopie
   simplement ces données (les mêmes que le fichier de sauvegarde) vers
   le compte, et les ramène sur un autre appareil.

   Qui gagne quand les deux ont changé ? Chaque appareil retient l'état
   de sa dernière synchronisation (CLE_SYNCHRO) :
     - seul cet appareil a changé   → il envoie ses données ;
     - seul le compte a changé      → l'appareil les reprend ;
     - les deux ont changé (hors ligne, ou premier passage avec des
       données d'invité) → on fusionne sans rien perdre : les scores, les
       exercices et les chapitres s'additionnent (la version la plus
       récente de chaque entrée l'emporte), les favoris se réunissent,
       et pour le profil ou le planning, c'est le compte qui l'emporte.
   ================================================================== */

export const CLE_SYNCHRO = "lrsi-synchro";
// Ce qui n'a pas pu partir avant une déconnexion : { [utilisateur]: { donnees, date } }.
export const CLE_RESERVE = "lrsi-synchro-en-attente";
const INTERVALLE = 15_000;

// Données rangées par identifiant : { id: { …, date } }.
const DICTIONNAIRES = [CLES.scores, CLES.exercices, CLES.chapitresLus, CLE_REVISIONS, CLE_CONVERSATIONS];
// Listes : favoris, vidéos vues.
const LISTES = [CLES.favoris, CLES.videosVues];

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/* JSON à clés triées : Postgres ne rend pas les clés dans l'ordre où
   on les a écrites, il faut pouvoir comparer quand même. */
export function empreinte(valeur) {
  if (Array.isArray(valeur)) return `[${valeur.map(empreinte).join(",")}]`;
  if (estObjet(valeur)) {
    return `{${Object.keys(valeur)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${empreinte(valeur[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(valeur ?? null);
}

const plusRecente = (a, b) => (String(a?.date ?? "") > String(b?.date ?? "") ? a : b);

/* Fusion de deux jeux de données, sans rien perdre. */
export function fusionner(local, distant) {
  const resultat = {};
  for (const { cle } of DONNEES) {
    const l = local?.[cle];
    const d = distant?.[cle];
    if (l === undefined || d === undefined) {
      if (l !== undefined || d !== undefined) resultat[cle] = d ?? l;
      continue;
    }
    if (DICTIONNAIRES.includes(cle) && estObjet(l) && estObjet(d)) {
      const tout = { ...l };
      for (const [id, v] of Object.entries(d)) tout[id] = id in l ? plusRecente(l[id], v) : v;
      resultat[cle] = tout;
    } else if (LISTES.includes(cle) && Array.isArray(l) && Array.isArray(d)) {
      const vus = new Set(d.map(empreinte));
      resultat[cle] = [...d, ...l.filter((x) => !vus.has(empreinte(x)))];
    } else {
      resultat[cle] = d;
    }
  }
  return resultat;
}

/* Décide quoi faire au démarrage d'une synchronisation.
   `base` : { utilisateur, maj, empreinte } retenu par cet appareil.
   `distant` : la ligne du compte ({ donnees, mis_a_jour }) ou null.
   Renvoie { donnees, envoyer, ecrire } : les données à garder, s'il faut
   les envoyer au compte, s'il faut les recopier dans le navigateur. */
export function arbitrer({ utilisateur, local, distant, base }) {
  const connue = base?.utilisateur === utilisateur ? base : null;
  const vide = (d) => !d || Object.keys(d).length === 0;

  if (!distant) return { donnees: local, envoyer: !vide(local), ecrire: false };

  const localChange = !connue || empreinte(local) !== connue.empreinte;
  const distantChange = !connue || distant.mis_a_jour !== connue.maj;

  let donnees;
  if (!localChange) donnees = distant.donnees;
  else if (!distantChange) donnees = local;
  else donnees = vide(local) ? distant.donnees : fusionner(local, distant.donnees);

  return {
    donnees,
    envoyer: empreinte(donnees) !== empreinte(distant.donnees),
    ecrire: empreinte(donnees) !== empreinte(local),
  };
}

/* ---------------------------------------------------------------- */
/* Côté navigateur                                                   */
/* ---------------------------------------------------------------- */

const stockage = {
  lire(cle) {
    try {
      return localStorage.getItem(cle);
    } catch {
      return null;
    }
  },
  ecrire(cle, valeur) {
    try {
      if (valeur === null) localStorage.removeItem(cle);
      else localStorage.setItem(cle, valeur);
    } catch {
      /* stockage plein ou refusé : la prochaine synchronisation réessaiera */
    }
  },
};

const lireLocal = () => construireSauvegarde(stockage.lire).donnees;

function lireBase() {
  try {
    return JSON.parse(stockage.lire(CLE_SYNCHRO) ?? "null");
  } catch {
    return null;
  }
}
const ecrireBase = (base) => stockage.ecrire(CLE_SYNCHRO, base ? JSON.stringify(base) : null);

/* Recopie `donnees` dans le navigateur, y compris l'absence d'une
   donnée (un favori retiré ailleurs doit disparaître ici aussi). Le
   thème reste celui de l'appareil. */
function ecrireLocal(donnees) {
  for (const d of DONNEES) {
    if (d.cle === CLE_THEME) continue;
    const v = donnees[d.cle];
    stockage.ecrire(d.cle, v === undefined ? null : d.brut ? v : JSON.stringify(v));
  }
}

/* La réserve : la progression d'un compte qui n'a pas pu être envoyée
   avant la déconnexion (pas de réseau, session expirée). Elle reste sur
   l'appareil, rangée sous ce compte, et n'est rendue qu'à lui : à sa
   prochaine connexion ici, elle rejoint ses données puis part. Une
   autre personne qui se connecte ensuite ne la reçoit jamais. */
function lireReserve() {
  try {
    const brut = JSON.parse(stockage.lire(CLE_RESERVE) ?? "null");
    return estObjet(brut) ? brut : {};
  } catch {
    return {};
  }
}
function ecrireReserve(reserve) {
  stockage.ecrire(CLE_RESERVE, Object.keys(reserve).length ? JSON.stringify(reserve) : null);
}

/* Ce que l'appareil a de plus que la dernière synchronisation réussie
   de ce compte. */
export function changementsEnAttente(utilisateur) {
  const local = lireLocal();
  if (Object.keys(local).length === 0) return false;
  const base = lireBase();
  if (base?.utilisateur !== utilisateur) return true;
  return empreinte(local) !== base.empreinte;
}

/* Efface les données personnelles de cet appareil, à la déconnexion :
   sur un ordinateur partagé, le suivant ne doit rien voir. Avec
   `utilisateur`, ce qui n'a pas encore été envoyé est d'abord mis dans
   la réserve de ce compte, pour ne rien perdre. Sans (suppression du
   compte), rien n'est mis de côté ; les réserves des autres comptes de
   l'appareil restent. */
export function oublierDonneesLocales(utilisateur) {
  const reserve = lireReserve();
  if (utilisateur && changementsEnAttente(utilisateur)) {
    const avant = reserve[utilisateur]?.donnees;
    const local = lireLocal();
    // Le plus récent (l'appareil) passe en second : il l'emporte.
    reserve[utilisateur] = { donnees: avant ? fusionner(avant, local) : local, date: new Date().toISOString() };
    ecrireReserve(reserve);
  }
  for (const d of DONNEES) if (d.cle !== CLE_THEME) stockage.ecrire(d.cle, null);
  ecrireBase(null);
}

/* Retire la réserve d'un compte (compte supprimé). */
export function oublierReserve(utilisateur) {
  const reserve = lireReserve();
  delete reserve[utilisateur];
  ecrireReserve(reserve);
}

/* Lance la synchronisation d'un compte. `surChangement()` est appelé
   quand des données venues du compte ont été recopiées ici, pour que
   les pages se relisent. Renvoie { arreter, envoyerMaintenant }. */
export function lancerSynchro(sb, utilisateur, { surChangement } = {}) {
  let arrete = false;
  let enCours = Promise.resolve();
  const table = () => sb.from("donnees_etudiants");

  // Une seule opération à la fois : pas d'envoi pendant une lecture.
  const enFile = (tache) => {
    enCours = enCours.then(() => (arrete ? undefined : tache())).catch((e) => console.log("Synchronisation", e));
    return enCours;
  };

  const retenir = (donnees, maj) => ecrireBase({ utilisateur, maj, empreinte: empreinte(donnees) });

  async function complete() {
    const { data: distant, error } = await table().select("donnees, mis_a_jour").eq("utilisateur", utilisateur).maybeSingle();
    if (error) throw error;
    // Une progression restée en réserve pour ce compte : elle rejoint
    // l'appareil, et la fusion avec le compte se fait comme au premier
    // passage (aucune base), donc sans rien perdre d'un côté ni de l'autre.
    const reserve = lireReserve()[utilisateur];
    if (reserve) {
      const ici = lireLocal();
      ecrireLocal(Object.keys(ici).length ? fusionner(reserve.donnees, ici) : reserve.donnees);
      ecrireBase(null);
    }
    const local = lireLocal();
    const { donnees, envoyer, ecrire } = arbitrer({ utilisateur, local, distant, base: lireBase() });
    if (ecrire) {
      ecrireLocal(donnees);
      surChangement?.();
    }
    let maj = distant?.mis_a_jour ?? null;
    if (envoyer) {
      const { data, error: e } = await table()
        .upsert({ utilisateur, donnees })
        .select("mis_a_jour")
        .single();
      if (e) throw e;
      maj = data.mis_a_jour;
    }
    retenir(donnees, maj);
    // Envoyée : la réserve n'a plus lieu d'être.
    if (reserve) oublierReserve(utilisateur);
  }

  // Envoi rapide : seulement si le compte n'a pas bougé depuis la
  // dernière synchronisation ; sinon, synchronisation complète.
  async function rapide() {
    const base = lireBase();
    const local = lireLocal();
    if (base?.utilisateur !== utilisateur || !base.maj) return complete();
    if (empreinte(local) === base.empreinte) return undefined;
    const { data, error } = await table()
      .update({ donnees: local })
      .eq("utilisateur", utilisateur)
      .eq("mis_a_jour", base.maj)
      .select("mis_a_jour");
    if (error) throw error;
    if (data.length === 0) return complete();
    return retenir(local, data[0].mis_a_jour);
  }

  const surVisibilite = () => enFile(document.visibilityState === "visible" ? complete : rapide);
  const minuteur = setInterval(() => enFile(rapide), INTERVALLE);
  document.addEventListener("visibilitychange", surVisibilite);
  enFile(complete);

  return {
    envoyerMaintenant: () => enFile(rapide),
    arreter() {
      arrete = true;
      clearInterval(minuteur);
      document.removeEventListener("visibilitychange", surVisibilite);
    },
  };
}
