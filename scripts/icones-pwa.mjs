/* ==================================================================
   Fabrique les icônes de l'application installable (PWA) et l'icône de
   l'onglet, à partir de public/logo-baobab.svg. À relancer seulement
   si le logo change :

     node scripts/icones-pwa.mjs

   Le nom des fichiers porte celui du dessin (baobab). Ce n'est pas une
   coquetterie : un navigateur, un téléphone ou une application déjà
   installée gardent longtemps en mémoire une image dont l'adresse n'a
   pas bougé. Redessiner le logo sans changer ces noms laisse donc
   l'ancienne icône partout. Un nouveau logo = de nouveaux noms ici,
   dans index.html et dans vite.config.js.

   - baobab-192.png, baobab-512.png : l'icône telle quelle (téléphone,
     tablette, et application installée sur un ordinateur) ;
   - baobab-masquable-512.png : le logo réduit au centre d'un fond plein,
     pour Android qui découpe l'icône en cercle ou en goutte ;
   - baobab-apple-touch.png (180 px) : fond plein, iOS arrondit lui-même ;
   - favicon.ico (16, 32, 48 px) : le secours des navigateurs qui ne
     savent pas afficher une icône SVG (Safari d'avant 2022, vieux
     Android, Firefox ancien) et l'icône des raccourcis sur un
     ordinateur. À 16 px, le baobab complet devient une tache : cette
     taille-là reçoit un dessin simplifié (PETIT, ci-dessous).
   ================================================================== */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const logo = readFileSync("public/logo-baobab.svg");
// Le baobab bleu sur blanc : le fond des icônes est blanc lui aussi.
const FOND = "#ffffff";
mkdirSync("public/icones", { recursive: true });

/* Le même arbre, à 16 px : deux branches au lieu de six, deux feuilles
   au lieu de quatre, des traits deux fois plus épais. Les couleurs et
   le fond blanc arrondi restent ceux du logo. */
const PETIT = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="26" fill="#fff"/>
  <path d="M49 98 C52 87 52 76 46 63 Q60 56 74 63 C68 76 68 87 71 98 Z" fill="#1f47e0"/>
  <path d="M60 63L31 40M60 63L89 40" stroke="#1f47e0" stroke-width="12" stroke-linecap="round"/>
  <circle cx="28" cy="36" r="14" fill="#ff5a2b"/>
  <circle cx="92" cy="36" r="14" fill="#cdef3e" stroke="#1f47e0" stroke-width="5"/>
</svg>`);

for (const taille of [192, 512]) {
  await sharp(logo, { density: 600 }).resize(taille, taille).png().toFile(`public/icones/baobab-${taille}.png`);
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

await surFond(512, 0.9, "public/icones/baobab-masquable-512.png");
await surFond(180, 0.86, "public/icones/baobab-apple-touch.png");

/* Un fichier .ico est une simple enveloppe : un en-tête, puis une fiche
   de 16 octets par taille (largeur, hauteur, poids, position), puis les
   images les unes après les autres. Elles peuvent être des PNG depuis
   Windows Vista, ce que lisent tous les navigateurs d'aujourd'hui : pas
   besoin d'une bibliothèque de plus. */
function enveloppeIco(images) {
  const fiches = Buffer.alloc(6 + 16 * images.length);
  fiches.writeUInt16LE(0, 0); // réservé
  fiches.writeUInt16LE(1, 2); // 1 = icône (2 = curseur)
  fiches.writeUInt16LE(images.length, 4);
  let position = fiches.length;
  images.forEach(({ taille, png }, i) => {
    const d = 6 + 16 * i;
    fiches.writeUInt8(taille, d); // largeur (0 voudrait dire 256)
    fiches.writeUInt8(taille, d + 1); // hauteur
    fiches.writeUInt8(0, d + 2); // couleurs de la palette : aucune
    fiches.writeUInt8(0, d + 3); // réservé
    fiches.writeUInt16LE(1, d + 4); // plans
    fiches.writeUInt16LE(32, d + 6); // bits par point
    fiches.writeUInt32LE(png.length, d + 8);
    fiches.writeUInt32LE(position, d + 12);
    position += png.length;
  });
  return Buffer.concat([fiches, ...images.map((x) => x.png)]);
}

const tailles = [
  [16, PETIT],
  [32, logo],
  [48, logo],
];
const images = await Promise.all(
  tailles.map(async ([taille, source]) => ({
    taille,
    png: await sharp(source, { density: 600 }).resize(taille, taille).png().toBuffer(),
  }))
);
writeFileSync("public/favicon.ico", enveloppeIco(images));

console.log("Icônes écrites dans public/icones/ et public/favicon.ico");
