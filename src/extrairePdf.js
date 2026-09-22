/* ==================================================================
   Extraire le texte d'un PDF, pour que l'assistant IA puisse s'appuyer
   sur un cours téléversé en PDF.

   pdf.js n'est chargé qu'ici, dans l'espace admin et au moment de
   l'extraction, depuis jsDelivr : les étudiants ne le téléchargent
   jamais, et la version hors ligne n'en porte pas le poids.

   Un PDF scanné (des photos de pages) ne contient pas de texte : on
   renvoie alors une chaîne vide, et l'admin en est prévenu.
   ================================================================== */

const VERSION = "6.3.289";
const BASE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${VERSION}/build`;
const MAX_CARACTERES = 30000;

export async function extraireTextePdf(fichier) {
  const pdfjs = await import(/* @vite-ignore */ `${BASE}/pdf.min.mjs`);
  pdfjs.GlobalWorkerOptions.workerSrc = `${BASE}/pdf.worker.min.mjs`;

  // On libère le PDF par la tâche de chargement : c'est elle qui porte
  // `destroy` dans pdf.js 6, pas le document.
  const chargement = pdfjs.getDocument({ data: await fichier.arrayBuffer() });
  try {
    return await lireTexte(await chargement.promise);
  } finally {
    await chargement.destroy();
  }
}

async function lireTexte(pdf) {
  const pages = [];
  let longueur = 0;
  for (let n = 1; n <= pdf.numPages && longueur < MAX_CARACTERES; n++) {
    const page = await pdf.getPage(n);
    const { items } = await page.getTextContent();
    // Un retour à la ligne quand pdf.js en signale un, sinon une espace.
    const texte = items
      .map((i) => (i.str ?? "") + (i.hasEOL ? "\n" : " "))
      .join("")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (texte) {
      pages.push(texte);
      longueur += texte.length;
    }
  }
  return pages.join("\n\n").slice(0, MAX_CARACTERES);
}
