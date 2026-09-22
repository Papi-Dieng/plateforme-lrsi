import { readFileSync } from "node:fs";
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

export default defineConfig({
  plugins: [react(), tailwindcss(), integrerIcone(), viteSingleFile()],
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
