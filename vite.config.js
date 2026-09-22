import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Chemins relatifs plutôt qu'absolus, pour que la version compilée
  // fonctionne aussi depuis un sous-dossier, par exemple sur GitHub
  // Pages. Attention : cela ne permet pas d'ouvrir docs/index.html par
  // double-clic, les navigateurs refusant de charger un module
  // JavaScript depuis un fichier local. Il faut passer par un serveur,
  // même minimal : `npm run preview`.
  base: "./",
  build: {
    // GitHub Pages sait publier le dossier `docs` de la branche
    // principale. En compilant directement dedans, le site en ligne
    // reste versionné avec le code : aucune automatisation à
    // configurer, et tout est disponible en local.
    outDir: "docs",
    emptyOutDir: true,
  },
})
