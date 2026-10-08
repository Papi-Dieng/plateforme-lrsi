/* ==================================================================
   La couverture d'un livre déposé en PDF : sa première page, dessinée
   dans le navigateur avec pdf.js (Mozilla, empaqueté avec le site).

   Ce fichier n'est chargé qu'à la demande (import dynamique) : pdf.js
   pèse lourd, et la plupart des pages n'en ont jamais besoin. Le
   résultat, une petite image JPEG, est gardé dans le navigateur : le
   PDF n'est lu qu'une fois.
   ================================================================== */

import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import adresseOuvrier from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = adresseOuvrier;

const LARGEUR = 260;

export async function premierePage(url) {
  const tache = getDocument({ url, disableAutoFetch: true, disableStream: false });
  try {
    const pdf = await tache.promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const vue = page.getViewport({ scale: LARGEUR / base.width });
    const toile = document.createElement("canvas");
    toile.width = Math.round(vue.width);
    toile.height = Math.round(vue.height);
    await page.render({ canvasContext: toile.getContext("2d"), viewport: vue }).promise;
    return toile.toDataURL("image/jpeg", 0.8);
  } finally {
    tache.destroy();
  }
}
