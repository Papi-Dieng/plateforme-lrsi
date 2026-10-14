import { preparerImage } from "./images";
import { site } from "./data/site";

/* ==================================================================
   Importer sa copie : une photo, plusieurs photos, ou un PDF
   (demande du 14 octobre 2026).

   Beaucoup d'étudiants travaillent sur papier. Plutôt que de retaper
   leur réponse, ils envoient la photo de leur copie :

     - PDF avec du texte (celui d'un ordinateur) : le texte est lu ici,
       dans le navigateur (src/extrairePdf.js). Rien ne part, rien ne
       coûte, c'est immédiat ;
     - PDF scanné (des images de pages) : chaque page est redessinée en
       image, puis lue par l'IA ;
     - photos : chacune est réduite comme une image jointe à l'assistant
       (src/images.js), puis lue par l'IA.

   Ce qui revient est le texte de la copie, tel quel. Le site le met
   dans la case « Ma réponse », où l'étudiant peut le relire et le
   corriger avant la correction : l'IA ne doit jamais corriger une
   réponse qu'elle a mal lue sans qu'il puisse s'en rendre compte.
   ================================================================== */

export const TYPES_COPIE = "image/*,application/pdf";
// Un PDF scanné : au-delà, c'est un cours entier, pas une copie.
const PAGES_MAX = 8;
const LARGEUR_PAGE = 1400;

export const estPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name ?? "");

/* Les messages d'erreur, en clair. `lireFichiers` lève une Error dont
   le message est l'une de ces clés. */
export function messageErreurCopie(code) {
  const messages = {
    type: "Envoie une photo (JPEG, PNG) ou un PDF.",
    taille: "Ce fichier est trop lourd. Prends la photo en qualité normale, ou envoie page par page.",
    illisible: "Ce fichier n'a pas pu être ouvert.",
    "copie-vide": "Rien n'a été lu sur cette copie. Vérifie que l'écriture est nette et bien éclairée.",
    "trop-gros": "Ces pages sont trop lourdes ensemble. Envoie-les en deux fois.",
    image: "Une des pages n'a pas pu être lue.",
    pdf: "Ce PDF n'a pas pu être ouvert.",
    "trop-de-pages": `Envoie ${PAGES_MAX} pages au plus à la fois.`,
  };
  return messages[code] ?? "La copie n'a pas pu être lue. Réessaie dans un moment.";
}

/* Transforme les pages d'un PDF scanné en images JPEG. */
async function pagesEnImages(fichier) {
  const [pdfjs, { default: ouvrier }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = ouvrier;
  const chargement = pdfjs.getDocument({ data: await fichier.arrayBuffer() });
  try {
    const pdf = await chargement.promise;
    const images = [];
    for (let n = 1; n <= Math.min(pdf.numPages, PAGES_MAX); n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const vue = page.getViewport({ scale: Math.min(2, LARGEUR_PAGE / base.width) });
      const toile = document.createElement("canvas");
      toile.width = Math.round(vue.width);
      toile.height = Math.round(vue.height);
      const ctx = toile.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, toile.width, toile.height);
      await page.render({ canvasContext: ctx, viewport: vue, canvas: toile }).promise;
      const url = toile.toDataURL("image/jpeg", 0.85);
      images.push({ type: "image/jpeg", donnees: url.slice(url.indexOf(",") + 1) });
    }
    return images;
  } finally {
    await chargement.destroy();
  }
}

/* Demande au relais de lire une copie. Avec `questions`, il range la
   copie sous chacune et renvoie `reponses` ; sinon il renvoie `texte`. */
async function transcrire({ images = [], texte = "", questions = [] }) {
  const r = await fetch(new URL("/lire-copie", site.urlIA), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images, texte, questions }),
  });
  const donnees = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(donnees.erreur ?? `statut ${r.status}`);
  return donnees;
}

/* Ce que les fichiers choisis contiennent : du texte lu ici (PDF
   d'ordinateur) ou des images de pages à faire lire par l'IA. */
async function contenuDesFichiers(fichiers) {
  const liste = [...fichiers].filter(Boolean);
  if (liste.length === 0) throw new Error("type");
  if (liste.length > PAGES_MAX) throw new Error("trop-de-pages");

  // Un seul PDF : on tente d'abord son texte, sans IA.
  if (liste.length === 1 && estPdf(liste[0])) {
    let texte = "";
    try {
      const { extraireTextePdf } = await import("./extrairePdf");
      texte = await extraireTextePdf(liste[0]);
    } catch {
      throw new Error("pdf");
    }
    if (texte.trim().length > 20) return { texte: texte.trim(), images: [] };
    // PDF scanné : ses pages sont des images.
    return { texte: "", images: await pagesEnImages(liste[0]) };
  }

  if (liste.some(estPdf)) throw new Error("type");

  const images = [];
  for (const f of liste) {
    try {
      const { type, donnees } = await preparerImage(f);
      images.push({ type, donnees });
    } catch (e) {
      throw new Error(e.message === "taille" ? "taille" : e.message === "type" ? "type" : "illisible");
    }
  }
  return { texte: "", images };
}

/* Lit une copie à partir des fichiers choisis. Renvoie
   { texte, parLIA } : `parLIA` dit si l'IA a été appelée, pour que la
   page prévienne l'étudiant de relire. */
export async function lireCopie(fichiers) {
  const { texte, images } = await contenuDesFichiers(fichiers);
  if (texte) return { texte, parLIA: false };
  const r = await transcrire({ images });
  return { texte: r.texte ?? "", parLIA: true };
}

/* Toute la copie d'un devoir d'un coup : l'IA range chaque passage sous
   la question qu'il répond. `questions` est la liste des intitulés, dans
   l'ordre des parties. Renvoie { reponses: { [index]: texte }, parLIA }. */
export async function lireCopieDevoir(fichiers, questions) {
  const { texte, images } = await contenuDesFichiers(fichiers);
  const r = await transcrire({ images, texte, questions });
  const reponses = {};
  for (const x of r.reponses ?? []) reponses[x.question - 1] = x.texte;
  if (Object.keys(reponses).length === 0) throw new Error("copie-vide");
  return { reponses, parLIA: true };
}
