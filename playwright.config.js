import { defineConfig, devices } from "@playwright/test";

/* ==================================================================
   Tests dans un vrai navigateur (Playwright), dossier `e2e/`.

   Ils ouvrent la version compilée (docs/), servie par `vite preview`,
   et la parcourent comme un étudiant : entrer en invité, faire un QCM,
   vérifier un exercice, sauvegarder et restaurer…

   Le relais IA n'est jamais appelé : chaque test le remplace par une
   fausse réponse (voir e2e/outils.js). Le site affiche donc toujours le
   contenu de src/data/, et aucun quota n'est consommé.

   `npm run test:navigateur` recompile d'abord le site, pour tester le
   code tel qu'il est.
   ================================================================== */

const PORT = 4180;

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.e2e\.js$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: "fr-FR",
    timezoneId: "Africa/Dakar",
    // Le service worker garderait l'ancienne version du site d'un test à
    // l'autre, et échapperait aux fausses réponses du relais.
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "ordinateur", use: { ...devices["Desktop Chrome"] } },
    { name: "telephone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
  },
});
