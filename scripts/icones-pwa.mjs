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
const FOND = "#1f47e0";
mkdirSync("public/icones", { recursive: true });

for (const taille of [192, 512]) {
  await sharp(logo, { density: 600 }).resize(taille, taille).png().toFile(`public/icones/icone-${taille}.png`);
}

// Le logo occupe 70 % de la largeur : la zone sûre d'une icône
// masquable est un cercle de 80 %.
async function surFond(taille, part, fichier) {
  const interieur = Math.round(taille * part);
  const image = await sharp(logo, { density: 600 }).resize(interieur, interieur).png().toBuffer();
  await sharp({ create: { width: taille, height: taille, channels: 4, background: FOND } })
    .composite([{ input: image, gravity: "center" }])
    .png()
    .toFile(fichier);
}

await surFond(512, 0.7, "public/icones/icone-masquable-512.png");
await surFond(180, 0.86, "public/icones/apple-touch-icon.png");
console.log("Icônes écrites dans public/icones/");
