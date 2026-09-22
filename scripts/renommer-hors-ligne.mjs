import { renameSync, statSync } from "node:fs";

/* Vite nomme toujours sa sortie `index.html`. Ce nom ne dit rien une
   fois le fichier envoyé à quelqu'un : on lui en donne un parlant. */

const source = "hors-ligne/index.html";
const cible = "hors-ligne/plateforme-lrsi-hors-ligne.html";

renameSync(source, cible);

const taille = statSync(cible).size;
console.log(
  `\nFichier unique : ${cible} (${(taille / 1024 / 1024).toFixed(1)} Mo)` +
    `\nIl s'ouvre par double-clic, sans serveur ni connexion.\n`
);
