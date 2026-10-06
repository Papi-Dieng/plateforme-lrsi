import { site } from "./data/site";
import { matieres } from "./data/matieres";
import { exercices } from "./data/exercices";
import { qcms } from "./data/qcm";
import { videosSuggerees } from "./data/videos";
import { annales, examens } from "./data/examens";
import { ressources } from "./data/bibliotheque";
import { normaliserChapitres } from "./semestres";

/* ==================================================================
   Le contenu pédagogique : celui du code, ou celui publié en ligne.

   Les fichiers de `src/data/` donnent le contenu par défaut. Dès que
   l'espace admin publie, le relais (dossier `serveur-ia/`) garde la
   version publiée, et le site la charge ici, AVANT le premier
   affichage (voir `main.jsx`).

   Le remplacement se fait en place, dans les tableaux exportés par
   `src/data/` : toutes les pages qui les importent voient donc le
   contenu publié sans avoir à changer.

   Si le relais ne répond pas (hors connexion, panne), on prend la
   dernière version reçue, gardée dans le navigateur ; la version hors
   ligne a aussi la copie publiée le jour de sa compilation
   (vite.config.hors-ligne.js). La plus récente des deux l'emporte, et à
   défaut le contenu du code. Le site s'affiche toujours.
   ================================================================== */

const CLE_CACHE = "lrsi-contenu";
const DELAI_MAXIMUM = 4000;

const TABLEAUX = {
  matieres,
  exercices,
  qcms,
  videos: videosSuggerees,
  examens,
  annales,
  ressources,
};

// Les ressources écrites dans le code n'ont pas d'identifiant : on leur
// en donne un, stable, tiré du titre, pour que l'admin puisse les gérer.
for (const r of ressources) {
  r.id ??=
    "ressource-" +
    r.titre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
}

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
  // Chaque chapitre au semestre 1 ou 2 (voir semestres.js), même dans
  // une publication d'avant cette règle.
  for (const m of matieres) normaliserChapitres(m);
}

/* Le relais vérifie déjà tout ce qu'il publie. On contrôle quand même
   la forme générale ici : une version en cache d'avant une mise à jour,
   ou un relais d'une autre version, ne doit jamais empêcher le site de
   s'afficher. Au moindre doute, c'est le contenu du code qui s'affiche. */
const estListe = (v) => v === undefined || Array.isArray(v);
const valide = (c) =>
  Boolean(c) &&
  Array.isArray(c.matieres) &&
  c.matieres.length > 0 &&
  c.matieres.every((m) => m && typeof m.id === "string" && Array.isArray(m.chapitres)) &&
  ["exercices", "qcms", "videos", "examens", "annales", "ressources"].every((cle) => estListe(c[cle])) &&
  (c.qcms ?? []).every((q) => q && Array.isArray(q.questions));

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

  let cache = null;
  try {
    cache = JSON.parse(localStorage.getItem(CLE_CACHE));
  } catch {
    /* rien en cache */
  }
  const copie = globalThis.__CONTENU_HORS_LIGNE__;
  const recente = [cache, copie]
    .filter(valide)
    .sort((a, b) => String(b.publieLe ?? "").localeCompare(String(a.publieLe ?? "")))[0];
  if (recente) {
    remplacer(recente);
    origineContenu = "cache";
    dateContenu = recente.publieLe ?? null;
  }
  // Sinon, le contenu du code s'affiche.
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

/* Ce qu'un étudiant voit d'une version complète : le même filtre que le
   relais (examens sans autorisation retirés, ressources en attente sans
   lien ni fichier). Sert à afficher tout de suite ce qu'on vient de
   publier, comme les étudiants le verront. */
const versionVisible = (c) => ({
  ...c,
  annales: c.annales.filter((a) => a.autorisation.obtenue && a.lienSujet),
  ...(c.ressources && {
    ressources: c.ressources.map((r) => (r.statut === "libre" ? r : { ...r, url: null, pdf: null })),
  }),
});

/* La version publiée complète, examens en attente compris ; `null`
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
  remplacer(versionVisible(publie));
  origineContenu = "en-ligne";
  dateContenu = publie.publieLe;
  return publie;
}

export async function restaurerContenu(motDePasse) {
  const restaure = await appel("/admin/contenu/restaurer", motDePasse, { method: "POST" });
  remplacer(versionVisible(restaure));
  dateContenu = restaure.publieLe;
  return restaure;
}

/* ---------------------------------------------------------------- */
/* Cours en PDF                                                       */
/* ---------------------------------------------------------------- */

export const TAILLE_MAX_PDF = 20 * 1024 * 1024;

/* L'adresse publique d'un PDF de cours, servi par le relais. */
export const urlPdf = (id) => new URL(`/fichiers/${id}`, site.urlIA).href;

/* Envoie le fichier tel quel au relais, qui vérifie que c'est bien un
   PDF et renvoie { id, nom, taille }. */
export async function televerserPdf(fichier, motDePasse) {
  const reponse = await fetch(new URL("/admin/fichiers", site.urlIA), {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
      "X-Admin": motDePasse,
      "X-Nom-Fichier": encodeURIComponent(fichier.name),
    },
    body: fichier,
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(donnees?.erreur ?? `statut ${reponse.status}`);
  return donnees;
}
