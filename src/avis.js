import { client } from "./comptes";

/* ==================================================================
   Les avis sur la plateforme (page « Ton avis », #/avis).

   Une note de 1 à 5, ce qui plaît, ce qui manque, et, si on veut, un
   prénom et un niveau. Pas besoin de compte : l'avis part directement
   dans la table `avis` du projet Supabase, avec la clé publique du site.
   Ce sont les règles de supabase/schema.sql qui décident de ce qu'un
   visiteur peut faire : lire les avis visibles, en ajouter un, rien
   d'autre (ni modifier, ni effacer, ni choisir la date).

   Les règles de forme (note, longueurs, niveaux) sont les mêmes ici et
   dans la base : le site prévient avant d'envoyer, la base refuse de
   toute façon.
   ================================================================== */

export const NOTES = [
  { valeur: 1, libelle: "Pas du tout" },
  { valeur: 2, libelle: "Bof" },
  { valeur: 3, libelle: "Correct" },
  { valeur: 4, libelle: "Bien" },
  { valeur: 5, libelle: "Génial" },
];

export const NIVEAUX = ["L1", "L2", "L3", "Master", "Autre"];

export const LIMITES = { aime: 600, propose: 600, prenom: 40 };

const COLONNES = "id, cree_le, note, aime, propose, prenom, niveau";

const texte = (v, max) => (typeof v === "string" ? v.replace(/\s+\n/g, "\n").trim().slice(0, max) : "");

/* Ce qui part vers la base, nettoyé. Renvoie { avis } ou { erreur }. */
export function preparerAvis(saisie = {}) {
  const note = Number(saisie.note);
  if (!Number.isInteger(note) || note < 1 || note > 5) {
    return { erreur: "Choisis une note, de 1 à 5 étoiles." };
  }
  const avis = {
    note,
    aime: texte(saisie.aime, LIMITES.aime),
    propose: texte(saisie.propose, LIMITES.propose),
    prenom: texte(saisie.prenom, LIMITES.prenom).replace(/\s+/g, " "),
    niveau: NIVEAUX.includes(saisie.niveau) ? saisie.niveau : "",
  };
  if (!avis.aime && !avis.propose) {
    return { erreur: "Écris au moins une phrase : ce qui te plaît, ou ce que tu proposes." };
  }
  return { avis };
}

/* La moyenne, le nombre d'avis par note (5 en premier) et le nombre de
   propositions. `liste` vient de la base, ou d'un test. */
export function resumerAvis(liste) {
  const avis = Array.isArray(liste) ? liste.filter((a) => Number.isInteger(a?.note) && a.note >= 1 && a.note <= 5) : [];
  const nombre = avis.length;
  const total = avis.reduce((s, a) => s + a.note, 0);
  const repartition = [5, 4, 3, 2, 1].map((n) => ({ note: n, nombre: avis.filter((a) => a.note === n).length }));
  return {
    nombre,
    moyenne: nombre ? Math.round((total / nombre) * 10) / 10 : 0,
    repartition,
    propositions: avis.filter((a) => typeof a.propose === "string" && a.propose.trim()).length,
  };
}

/* « 4,6 » : la virgule française. */
export const afficherMoyenne = (m) => m.toFixed(1).replace(".", ",");

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/* « aujourd'hui », « hier », « il y a 3 jours », puis « 12 oct. 2026 ».
   Compté en jours du calendrier local, pas en tranches de 24 heures. */
export function dateAvis(iso, maintenant = new Date()) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const jour = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(maintenant) - jour(d)) / 86400000);
  if (ecart <= 0) return "aujourd'hui";
  if (ecart === 1) return "hier";
  if (ecart < 7) return `il y a ${ecart} jours`;
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/* Les 200 avis les plus récents, du plus récent au plus ancien. */
export async function listerAvis() {
  const supabase = await client();
  const { data, error } = await supabase.from("avis").select(COLONNES).order("cree_le", { ascending: false }).limit(200);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/* Publie un avis déjà préparé (preparerAvis). Lève une erreur au code
   lisible : « trop-d-avis » quand la base freine l'envoi en masse. */
export async function envoyerAvis(avis) {
  const supabase = await client();
  const { error } = await supabase.from("avis").insert(avis);
  if (error) {
    const e = new Error(/trop-d-avis/.test(error.message ?? "") ? "trop-d-avis" : "envoi-impossible");
    e.cause = error;
    throw e;
  }
}
