import { CLES } from "./progression";
import { CLE_PROFIL } from "./profil";
import { CLE_PLANNING } from "./planning";
import { CLE_REVISIONS } from "./revisions";
import { CLE_DISPONIBILITES } from "./programmeIA";
import { CLE_CONVERSATIONS, conversationsValides } from "./conversations";

/* ==================================================================
   La liste des données de l'étudiant.

   Un seul endroit dit ce qui appartient à l'étudiant : profil, scores
   des QCM, exercices travaillés, chapitres lus, devoirs notés, favoris,
   vidéos vues, planning, disponibilités, révisions espacées,
   discussions avec l'assistant, thème. Ce qui n'y est pas : la session
   (qui se recrée à l'entrée), le mot de passe admin, le cache du
   contenu.

   C'est cette liste que src/synchro.js envoie au serveur pour un
   compte, et qu'il efface de l'appareil à la déconnexion. Chaque entrée
   dit aussi la forme attendue : une donnée abîmée (fichier modifié à la
   main, autre version du site) est ignorée plutôt que recopiée.

   Le fichier de sauvegarde JSON, qui servait quand le navigateur gardait
   la progression tout seul, a été retiré le 14 octobre 2026 : seul un
   compte (email + mot de passe) conserve les données, et c'est le
   serveur qui les garde (src/stockage.js).
   ================================================================== */

export const CLE_THEME = "lrsi-theme";
export { CLE_PLANNING };

const APPLICATION = "sunu-cours";
const FORMAT = 1;

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/* Chaque donnée sauvegardée : son libellé, et la forme qu'elle doit avoir. */
export const DONNEES = [
  { cle: CLE_PROFIL, libelle: () => "ta fiche profil", valide: estObjet, compter: () => 1 },
  { cle: CLES.scores, libelle: (n) => `${n} QCM terminé${n > 1 ? "s" : ""}`, valide: estObjet, compter: (v) => Object.keys(v).length },
  // Exercices travaillés : { identifiant: { date } }, pas une liste.
  { cle: CLES.exercices, libelle: (n) => `${n} exercice${n > 1 ? "s" : ""} travaillé${n > 1 ? "s" : ""}`, valide: estObjet, compter: (v) => Object.keys(v).length },
  { cle: CLES.chapitresLus, libelle: (n) => `${n} chapitre${n > 1 ? "s" : ""} lu${n > 1 ? "s" : ""}`, valide: estObjet, compter: (v) => Object.keys(v).length },
  { cle: CLES.devoirs, libelle: (n) => `${n} devoir${n > 1 ? "s" : ""} noté${n > 1 ? "s" : ""}`, valide: estObjet, compter: (v) => Object.keys(v).length },
  { cle: CLES.favoris, libelle: (n) => `${n} favori${n > 1 ? "s" : ""}`, valide: Array.isArray, compter: (v) => v.length },
  { cle: CLES.videosVues, libelle: (n) => `${n} vidéo${n > 1 ? "s" : ""} vue${n > 1 ? "s" : ""}`, valide: Array.isArray, compter: (v) => v.length },
  { cle: CLE_PLANNING, libelle: () => "ton planning de révision", valide: estObjet, compter: () => 1 },
  { cle: CLE_DISPONIBILITES, libelle: () => "tes disponibilités de la semaine", valide: estObjet, compter: () => 1 },
  { cle: CLE_REVISIONS, libelle: (n) => `${n} QCM à revoir`, valide: estObjet, compter: (v) => Object.keys(v).length },
  { cle: CLE_CONVERSATIONS, libelle: (n) => `${n} discussion${n > 1 ? "s" : ""} avec l'assistant`, valide: conversationsValides, compter: (v) => Object.keys(v).length },
  // Le thème est rangé tel quel (« dark » ou « light »), pas en JSON.
  { cle: CLE_THEME, libelle: () => "ton thème (clair ou sombre)", valide: (v) => v === "dark" || v === "light", compter: () => 1, brut: true },
];

/* `lire(cle)` renvoie la chaîne stockée, ou null. */
export function construireSauvegarde(lire) {
  const donnees = {};
  for (const d of DONNEES) {
    const brut = lire(d.cle);
    if (brut === null || brut === undefined) continue;
    try {
      const valeur = d.brut ? brut : JSON.parse(brut);
      if (d.valide(valeur)) donnees[d.cle] = valeur;
    } catch {
      /* donnée illisible : on ne la sauvegarde pas */
    }
  }
  return { application: APPLICATION, format: FORMAT, creeLe: new Date().toISOString(), donnees };
}
