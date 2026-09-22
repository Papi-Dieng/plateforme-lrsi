import { site } from "./data/site";
import { matieres } from "./data/matieres";
import { competences } from "./data/competences";
import { exercices } from "./data/exercices";
import { qcms } from "./data/qcm";
import { videosSuggerees } from "./data/videos";
import { annales, examens } from "./data/examens";

/* ==================================================================
   Le contenu pédagogique : celui du code, ou celui publié en ligne.

   Les fichiers de `src/data/` donnent le contenu par défaut. Dès que
   l'espace admin publie, le relais (dossier `serveur-ia/`) garde la
   version publiée, et le site la charge ici, AVANT le premier
   affichage (voir `main.jsx`).

   Le remplacement se fait en place, dans les tableaux exportés par
   `src/data/` : toutes les pages qui les importent voient donc le
   contenu publié sans avoir à changer.

   Si le relais ne répond pas (hors connexion, version hors ligne,
   panne), on prend la dernière version reçue, gardée dans le
   navigateur, et à défaut le contenu du code. Le site s'affiche
   toujours.
   ================================================================== */

const CLE_CACHE = "lrsi-contenu";
const DELAI_MAXIMUM = 4000;

const TABLEAUX = {
  matieres,
  competences,
  exercices,
  qcms,
  videos: videosSuggerees,
  examens,
  annales,
};

// Le contenu du code, gardé à part : l'admin peut repartir de lui
// tant que rien n'est publié.
const PAR_DEFAUT = structuredClone(TABLEAUX);

// D'où vient le contenu affiché : "code", "en-ligne" ou "cache".
export let origineContenu = "code";
export let dateContenu = null;

function remplacer(contenu) {
  for (const [cle, tableau] of Object.entries(TABLEAUX)) {
    if (Array.isArray(contenu?.[cle])) tableau.splice(0, tableau.length, ...contenu[cle]);
  }
}

const valide = (c) => c && Array.isArray(c.matieres) && c.matieres.length > 0;

export async function chargerContenu() {
  if (!site.urlIA) return;

  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MAXIMUM);
  try {
    // Jamais depuis le cache du navigateur : juste après « Publier »,
    // on doit voir la nouvelle version, pas celle d'il y a une minute.
    const reponse = await fetch(new URL("/contenu", site.urlIA), {
      signal: controle.signal,
      cache: "no-store",
    });
    const contenu = await reponse.json();
    if (valide(contenu)) {
      remplacer(contenu);
      origineContenu = "en-ligne";
      dateContenu = contenu.publieLe ?? null;
      try {
        localStorage.setItem(CLE_CACHE, JSON.stringify(contenu));
      } catch {
        /* stockage plein ou bloqué : on rechargera la prochaine fois */
      }
    }
    return;
  } catch {
    /* relais injoignable : on essaie la dernière version reçue */
  } finally {
    clearTimeout(minuteur);
  }

  try {
    const cache = JSON.parse(localStorage.getItem(CLE_CACHE));
    if (valide(cache)) {
      remplacer(cache);
      origineContenu = "cache";
      dateContenu = cache.publieLe ?? null;
    }
  } catch {
    /* rien en cache : le contenu du code s'affiche */
  }
}

/* Une copie du contenu affiché, que l'espace admin peut modifier sans
   toucher au site tant qu'il n'a pas publié. */
export const copieContenu = () => structuredClone(TABLEAUX);
export const copieContenuParDefaut = () => structuredClone(PAR_DEFAUT);

/* ---------------------------------------------------------------- */
/* Espace admin                                                       */
/* ---------------------------------------------------------------- */

async function appel(chemin, motDePasse, options = {}) {
  const reponse = await fetch(new URL(chemin, site.urlIA), {
    ...options,
    headers: { "Content-Type": "application/json", "X-Admin": motDePasse },
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(donnees?.erreur ?? `statut ${reponse.status}`);
  return donnees;
}

/* La version publiée complète, annales en attente comprises ; `null`
   si rien n'a encore été publié. */
export const lireContenuAdmin = (motDePasse) => appel("/admin/contenu", motDePasse);

/* Publier remplace aussi le contenu affiché dans cet onglet : l'admin
   voit le résultat tout de suite, comme les étudiants au prochain
   chargement. */
export async function publierContenu(contenu, motDePasse) {
  const publie = await appel("/admin/contenu", motDePasse, {
    method: "PUT",
    body: JSON.stringify(contenu),
  });
  remplacer({ ...publie, annales: publie.annales.filter((a) => a.autorisation.obtenue && a.lienSujet) });
  origineContenu = "en-ligne";
  dateContenu = publie.publieLe;
  return publie;
}

export async function restaurerContenu(motDePasse) {
  const restaure = await appel("/admin/contenu/restaurer", motDePasse, { method: "POST" });
  remplacer({ ...restaure, annales: restaure.annales.filter((a) => a.autorisation.obtenue && a.lienSujet) });
  dateContenu = restaure.publieLe;
  return restaure;
}
