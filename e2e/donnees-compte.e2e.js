import { exercices } from "../src/data/demonstration.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Depuis le 14 octobre 2026, le navigateur ne garde plus rien tout
   seul : la progression n'est conservée que par un compte, et c'est le
   serveur qui la garde (src/stockage.js, src/synchro.js).

   Ce que vérifie ce fichier : sans compte, ce que fait l'étudiant vit
   le temps de la page et disparaît au rechargement, et le site le dit.
   Le même parcours avec un compte est dans e2e/parcours.e2e.js
   (« un favori s'allume, reste après un rechargement, et s'éteint »).
   ================================================================== */

test.describe("sans compte, rien n'est gardé", () => {
  test("un favori mis sans compte a disparu après un rechargement", async ({ page }) => {
    const exercice = exercices[0];
    await entrerEnInvite(page);
    await aller(page, `/exercices/${exercice.id}`);

    const ajouter = page.getByRole("button", { name: /aux favoris$/ }).first();
    await ajouter.click();
    await expect(page.getByRole("button", { name: /des favoris$/ }).first()).toHaveAttribute("aria-pressed", "true");

    // Changer de page ne perd rien : c'est la même page ouverte.
    await aller(page, "/favoris");
    await expect(page.getByText(exercice.titre).first()).toBeVisible();

    // Un rechargement, lui, efface tout.
    await page.reload();
    await expect(page.getByText(exercice.titre)).toHaveCount(0);
    await aller(page, `/exercices/${exercice.id}`);
    await expect(page.getByRole("button", { name: /aux favoris$/ }).first()).toHaveAttribute("aria-pressed", "false");
  });

  test("les paramètres disent que rien n'est enregistré, et ne proposent plus de fichier", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/parametres");
    await expect(page.getByText(/Sans compte, rien n'est enregistré/)).toBeVisible();
    await expect(page.getByRole("button", { name: /sauvegarde/i })).toHaveCount(0);
  });
});
