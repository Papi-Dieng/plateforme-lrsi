import { existsSync, readFileSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

/* ==================================================================
   Compilation « hors ligne » : tout le site dans UN seul fichier.

   La compilation normale (vite.config.js) produit un `index.html` qui
   va chercher son JavaScript et son CSS dans des fichiers voisins.
   C'est le bon choix pour un site hébergé, mais cela interdit le
   double-clic : un navigateur refuse de charger un module JavaScript
   depuis une adresse `file://`, par sécurité.

   Ici, le JavaScript et le CSS sont écrits À L'INTÉRIEUR du HTML. Il
   n'y a donc plus rien à aller chercher, et le fichier s'ouvre par
   double-clic, sans serveur et sans connexion. Il se transporte aussi
   sur une clé USB ou s'envoie par messagerie.

   Ce que cette version ne peut pas faire : les vidéos restent
   hébergées par YouTube, elles demandent donc une connexion.
   ================================================================== */

const NOM_FICHIER = "plateforme-lrsi-hors-ligne.html";

const DEBUT = "<!-- DEBUT AVERTISSEMENT FICHIER LOCAL -->";
const FIN = "<!-- FIN AVERTISSEMENT FICHIER LOCAL -->";

// L'icône vit dans `public/`, un dossier simplement recopié à côté du
// HTML. Un fichier isolé ne la trouverait donc plus : on la recopie
// directement dans la page, encodée en base64.
function integrerIcone() {
  return {
    name: "integrer-icone",
    transformIndexHtml(html) {
      const svg = readFileSync("public/logo.svg", "utf8");
      const donnees = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
      return html.replace('href="/logo.svg"', `href="${donnees}"`);
    },
  };
}

// `index.html` contient un avertissement destiné à qui ouvrirait la
// page par double-clic : elle resterait blanche, faute de pouvoir
// charger son module JavaScript. Ici, justement, tout est écrit dans
// le fichier et la page fonctionne : l'avertissement serait faux, et
// s'afficherait à la place du site. On le retire.
//
// Découpage par repères plutôt que par expression régulière : c'est
// lisible, et cela échoue franchement si les repères sont renommés,
// au lieu de laisser passer un fichier à moitié juste.
function retirerAvertissementFichierLocal() {
  return {
    name: "retirer-avertissement-fichier-local",
    transformIndexHtml(html) {
      const debut = html.indexOf(DEBUT);
      const fin = html.indexOf(FIN);
      if (debut === -1 || fin === -1) {
        throw new Error(
          `Reperes introuvables dans index.html (${DEBUT} … ${FIN}). ` +
            "Ont-ils ete renommes ou supprimes ?"
        );
      }
      return (
        html.slice(0, debut) + html.slice(fin + FIN.length).replace(/^\s*\n/, "")
      );
    },
  };
}

// Vite nomme toujours sa sortie `index.html`, un nom qui ne dit rien
// une fois le fichier envoyé à quelqu'un.
//
// Le renommage se fait sur le disque, après écriture. C'est le seul
// moment sûr : Rolldown, le compilateur de Vite, interdit à un plugin
// de modifier la liste des fichiers produits. Ce moment-là convient
// aussi au mode continu, où il se rejoue à chaque enregistrement.
function nommerFichierUnique() {
  let dossier = "hors-ligne";
  return {
    name: "nommer-fichier-unique",
    configResolved(config) {
      dossier = config.build.outDir;
    },
    writeBundle() {
      const source = join(dossier, "index.html");
      if (!existsSync(source)) {
        throw new Error(`Page introuvable apres compilation : ${source}`);
      }
      const cible = join(dossier, NOM_FICHIER);
      renameSync(source, cible);
      const taille = (statSync(cible).size / 1024 / 1024).toFixed(1);
      console.log(`\nFichier unique : ${cible} (${taille} Mo)`);
      console.log("Il s'ouvre par double-clic, sans serveur ni connexion.\n");
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    integrerIcone(),
    retirerAvertissementFichierLocal(),
    viteSingleFile(),
    nommerFichierUnique(),
  ],
  // Rien n'est recopié à côté : la page doit se suffire à elle-même.
  publicDir: false,
  build: {
    outDir: "hors-ligne",
    emptyOutDir: true,
    // Les petites ressources sont écrites dans le code plutôt que
    // déposées dans un fichier séparé.
    assetsInlineLimit: 100_000_000,
    // Un seul fichier : découper le code n'aurait aucun sens.
    cssCodeSplit: false,
  },
});
