import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { site } from './src/data/site.js'

/* Application installable (PWA) : seulement pour le site hébergé, pas
   pour le fichier hors ligne (vite.config.hors-ligne.js), qui n'en a
   pas besoin.

   - le manifeste (nom, couleurs, icônes) est écrit à partir de
     src/data/site.js : changer le nom du site suffit ;
   - les balises correspondantes sont ajoutées dans <head> ;
   - le service worker (pwa/sw-modele.js) reçoit la liste exacte des
     fichiers compilés, pour que tout le site s'ouvre sans réseau.
   Les icônes se fabriquent avec `node scripts/icones-pwa.mjs`. */
function applicationInstallable() {
  const manifeste = {
    name: `${site.nom} — Plateforme LRSI`,
    short_name: site.nom,
    description: site.description,
    lang: 'fr',
    start_url: './#/tableau-de-bord',
    scope: './',
    display: 'standalone',
    background_color: '#0d101a',
    theme_color: '#1f47e0',
    icons: [
      { src: 'icones/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icones/icone-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icones/icone-masquable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return {
    name: 'application-installable',
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: './manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: './icones/apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: site.nom }, injectTo: 'head' },
      ]
    },
    generateBundle(_options, bundle) {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: JSON.stringify(manifeste, null, 2) })

      const publics = ['logo.svg', 'manifest.webmanifest', ...readdirSync('public/icones').map((f) => `icones/${f}`)]
      const fichiers = ['./', './index.html', ...Object.keys(bundle), ...publics]
        .filter((f, i, liste) => liste.indexOf(f) === i && !f.endsWith('.map'))
        .map((f) => (f.startsWith('./') ? f : `./${f}`))
      const version = createHash('sha256').update(fichiers.join('|')).digest('hex').slice(0, 12)
      const source = readFileSync('pwa/sw-modele.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__FICHIERS__', JSON.stringify(fichiers))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), applicationInstallable()],
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
