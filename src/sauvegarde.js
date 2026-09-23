import { CLES } from "./progression";
import { CLE_PROFIL } from "./profil";

/* ==================================================================
   Sauvegarder et restaurer ses données.

   Sans compte, tout vit dans le navigateur : changer d'ordinateur ou
   vider ses données de navigation fait tout perdre. Une sauvegarde est
   un petit fichier JSON que l'étudiant télécharge, garde où il veut,
   et recharge sur un autre appareil.

   Ce qui est sauvegardé : profil, scores des QCM, exercices travaillés,
   favoris, vidéos ajoutées et vues, thème, planning de révision. Ce qui
   ne l'est pas : la session (qui se recrée à l'entrée), le mot de passe
   admin, le cache du contenu.

   Restaurer relit tout avec méfiance : un fichier d'une autre origine
   ou modifié à la main ne doit pas casser la progression. Seules les
   clés connues, de la bonne forme, sont écrites ; le reste est ignoré.
   ================================================================== */

export const CLE_THEME = "lrsi-theme";
export const CLE_PLANNING = "lrsi-planning";

const APPLICATION = "sunu-cours";
const FORMAT = 1;
const TAILLE_MAX = 2 * 1024 * 1024;

const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/* Chaque donnée sauvegardée : son libellé, et la forme qu'elle doit avoir. */
export const DONNEES = [
  { cle: CLE_PROFIL, libelle: () => "ta fiche profil", valide: estObjet, compter: () => 1 },
  { cle: CLES.scores, libelle: (n) => `${n} QCM terminé${n > 1 ? "s" : ""}`, valide: estObjet, compter: (v) => Object.keys(v).length },
  { cle: CLES.exercices, libelle: (n) => `${n} exercice${n > 1 ? "s" : ""} travaillé${n > 1 ? "s" : ""}`, valide: Array.isArray, compter: (v) => v.length },
  { cle: CLES.favoris, libelle: (n) => `${n} favori${n > 1 ? "s" : ""}`, valide: (v) => Array.isArray(v) || estObjet(v), compter: (v) => (Array.isArray(v) ? v.length : Object.keys(v).length) },
  { cle: CLES.videos, libelle: (n) => `${n} vidéo${n > 1 ? "s" : ""} ajoutée${n > 1 ? "s" : ""}`, valide: Array.isArray, compter: (v) => v.length },
  { cle: CLES.videosVues, libelle: (n) => `${n} vidéo${n > 1 ? "s" : ""} vue${n > 1 ? "s" : ""}`, valide: Array.isArray, compter: (v) => v.length },
  { cle: CLE_PLANNING, libelle: () => "ton planning de révision", valide: estObjet, compter: () => 1 },
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

/* Lit un fichier de sauvegarde. Renvoie { donnees, resume, creeLe } ou
   { erreur } avec un message à montrer tel quel. */
export function lireSauvegarde(texte) {
  if (typeof texte !== "string" || texte.length > TAILLE_MAX) {
    return { erreur: "Ce fichier est trop gros pour être une sauvegarde." };
  }
  let brut;
  try {
    brut = JSON.parse(texte);
  } catch {
    return { erreur: "Ce fichier n'est pas une sauvegarde lisible." };
  }
  if (brut?.application !== APPLICATION || !estObjet(brut.donnees)) {
    return { erreur: "Ce fichier n'est pas une sauvegarde de la plateforme." };
  }
  if (brut.format > FORMAT) {
    return { erreur: "Cette sauvegarde vient d'une version plus récente du site. Recharge la page puis réessaie." };
  }

  const donnees = {};
  const resume = [];
  for (const d of DONNEES) {
    const v = brut.donnees[d.cle];
    if (v === undefined || !d.valide(v)) continue;
    donnees[d.cle] = v;
    resume.push(d.libelle(d.compter(v)));
  }
  if (resume.length === 0) return { erreur: "Cette sauvegarde est vide." };
  return { donnees, resume, creeLe: typeof brut.creeLe === "string" ? brut.creeLe : null };
}

/* Écrit les données d'une sauvegarde lue par `lireSauvegarde`. Une
   donnée absente de la sauvegarde n'est pas touchée. */
export function restaurerSauvegarde(donnees, ecrire) {
  for (const d of DONNEES) {
    if (!(d.cle in donnees)) continue;
    ecrire(d.cle, d.brut ? donnees[d.cle] : JSON.stringify(donnees[d.cle]));
  }
}

/* Côté navigateur : télécharger le fichier. */
export function telechargerSauvegarde() {
  const lire = (cle) => {
    try {
      return localStorage.getItem(cle);
    } catch {
      return null;
    }
  };
  const sauvegarde = construireSauvegarde(lire);
  const blob = new Blob([JSON.stringify(sauvegarde, null, 2)], { type: "application/json" });
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(blob);
  lien.download = `sunu-cours-sauvegarde-${sauvegarde.creeLe.slice(0, 10)}.json`;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
  return Object.keys(sauvegarde.donnees).length;
}
