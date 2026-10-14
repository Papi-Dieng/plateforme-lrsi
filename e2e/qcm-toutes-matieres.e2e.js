import { qcms } from "../src/data/qcm.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Le QCM « toutes les matières » : un bouton sur la liste des QCM, des
   questions tirées au hasard dans tout le site, passées comme un QCM
   ordinaire, sans révision espacée.
   ================================================================== */

test("un bouton lance un questionnaire tiré dans toutes les matières, corrigé comme les autres", async ({ page }) => {
  const total = qcms.reduce((n, q) => n + q.questions.length, 0);
  const attendu = Math.min(20, total);
  await entrerEnInvite(page);
  await aller(page, "/qcm");

  const carte = page.getByRole("region", { name: "Un QCM sur toutes les matières" });
  await expect(carte).toContainText(`${attendu} questions tirées au hasard`);
  await carte.getByRole("link", { name: "Commencer" }).click();

  await expect(page).toHaveURL(/#\/qcm\/toutes-les-matieres$/);
  await expect(page.getByRole("heading", { level: 1, name: "QCM toutes matières" })).toBeVisible();
  for (let i = 0; i < attendu; i++) {
    await expect(page.getByText(`Question ${i + 1} sur ${attendu}`)).toBeVisible();
    await page.getByRole("button", { name: /^A\./ }).click();
  }
  await page.getByRole("button", { name: "Voir mon résultat" }).click();
  await expect(page.getByText(new RegExp(`Tu as répondu correctement à \\d+ questions? sur ${attendu}.`))).toBeVisible();
  // La correction s'affiche sans avoir à demander le détail.
  await expect(page.getByRole("heading", { name: "Correction question par question" })).toBeVisible();
  // Pas de révision espacée : le tirage change à chaque départ.
  await expect(page.getByText(/À refaire dans/)).toHaveCount(0);
});
