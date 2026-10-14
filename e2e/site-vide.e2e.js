import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Le site sans aucun contenu publié.

   Depuis le 14 octobre 2026, `src/data/` est vide : tant que l'espace
   admin n'a rien publié, la plateforme n'a rien à montrer. Chaque page
   doit alors s'ouvrir normalement et dire qu'il n'y a rien, jamais
   planter ni afficher une page blanche.

   C'est l'état d'un site qui vient d'être installé : ce test est le
   seul qui le parcourt, les autres reçoivent le contenu de
   démonstration par le faux relais (voir e2e/outils.js).
   ================================================================== */

const PAGES = [
  "/tableau-de-bord",
  "/cours",
  "/exercices",
  "/qcm",
  "/examens",
  "/videos",
  "/bibliotheque",
  "/favoris",
  "/progression",
  "/planning",
  "/assistant",
  "/profil",
  "/parametres",
];

test.describe("site vide", () => {
  test("chaque page s'ouvre sans contenu publié", async ({ page, relais }) => {
    relais.contenu = null;
    await entrerEnInvite(page);

    for (const chemin of PAGES) {
      await aller(page, chemin);
      // Le filet des pages qui plantent (components/FiletErreur.jsx).
      await expect(page.getByText("Cette page a rencontré un problème")).toHaveCount(0);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    }
  });

  test("le tableau de bord et les listes disent qu'il n'y a rien", async ({ page, relais }) => {
    relais.contenu = null;
    await entrerEnInvite(page);
    await expect(page.getByText(/Aucun QCM n'est encore publié/)).toBeVisible();

    await expect(page.getByText("Le site n'a pas encore de contenu")).toBeVisible();

    // Chaque liste dit que rien n'est publié, au lieu de parler de filtre.
    for (const [chemin, message] of [
      ["/cours", "Le site n'a pas encore de cours"],
      ["/exercices", "Aucun exercice n'est encore publié"],
      ["/qcm", "Aucun QCM n'est encore publié"],
      ["/bibliotheque", "Aucune ressource n'est encore publiée"],
      ["/videos", "Pas encore de vidéo"],
    ]) {
      await aller(page, chemin);
      await expect(page.getByText(message)).toBeVisible();
    }
  });
});
