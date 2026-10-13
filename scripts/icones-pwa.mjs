/* ==================================================================
   Fabrique les icônes de l'application installable (PWA) à partir de
   public/logo.svg. À relancer seulement si le logo change :

     node scripts/icones-pwa.mjs

   - icone-192.png, icone-512.png : l'icône telle quelle ;
   - icone-masquable-512.png : le logo réduit au centre d'un fond plein,
     pour Android qui découpe l'icône en cercle ou en goutte ;
   - apple-touch-icon.png (180 px) : fond plein, iOS arrondit lui-même.
   ================================================================== */

import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("public/logo.svg");
// Le baobab bleu sur blanc : le fond des icônes est blanc lui aussi.
const FOND = "#ffffff";
mkdirSync("public/icones", { recursive: true });

for (const taille of [192, 512]) {
  await sharp(logo, { density: 600 }).resize(taille, taille).png().toFile(`public/icones/icone-${taille}.png`);
}

// La zone sûre d'une icône masquable est un cercle de 80 % : le logo
// (tuile blanche, invisible sur le fond blanc) occupe 90 % de la largeur,
// ce qui garde la feuille la plus éloignée du centre à 38 %.
async function surFond(taille, part, fichier) {
  const interieur = Math.round(taille * part);
  const image = await sharp(logo, { density: 600 }).resize(interieur, interieur).png().toBuffer();
  await sharp({ create: { width: taille, height: taille, channels: 4, background: FOND } })
    .composite([{ input: image, gravity: "center" }])
    .png()
    .toFile(fichier);
}

await surFond(512, 0.9, "public/icones/icone-masquable-512.png");
await surFond(180, 0.86, "public/icones/apple-touch-icon.png");
console.log("Icônes écrites dans public/icones/");
