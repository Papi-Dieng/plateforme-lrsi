import { qcms } from "../src/data/qcm.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   L'examen blanc : réglé sur la liste des QCM, tiré au hasard, passé
   comme un QCM, sans révision espacée.
   ================================================================== */

test("on choisit une matière et le nombre de questions, puis l'examen se passe comme un QCM", async ({ page }) => {
  const qcm = qcms[0];
  await entrerEnInvite(page);
  await aller(page, "/qcm");
  const reglage = page.getByRole("region", { name: "Examen blanc" });
  await reglage.getByRole("group", { name: "Matières de l'examen blanc" }).getByRole("button", { name: /Réseaux/ }).click();
  await reglage.getByLabel("Nombre de questions").fill("5");
  await expect(reglage).toContainText("5 questions · 5 min");
  await reglage.getByRole("button", { name: "Commencer l'examen blanc" }).click();

  await expect(page).toHaveURL(/#\/qcm\/examen-blanc\?n=5&m=reseaux$/);
  await expect(page.getByRole("heading", { level: 1, name: "Examen blanc" })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await expect(page.getByText(`Question ${i + 1} sur 5`)).toBeVisible();
    await page.getByRole("button", { name: /^A\./ }).click();
  }
  await page.getByRole("button", { name: "Voir mon résultat" }).click();
  await expect(page.getByText(/Tu as répondu correctement à \d+ questions? sur 5./)).toBeVisible();
  // Pas de révision espacée : un examen blanc change à chaque tirage.
  await expect(page.getByText(/À refaire dans/)).toHaveCount(0);
  expect(qcm.matiere).toBe("reseaux");
});
