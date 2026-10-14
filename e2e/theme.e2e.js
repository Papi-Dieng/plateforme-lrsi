import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Le thème clair est le thème principal (src/main.jsx) : le sombre ne
   vient que d'un choix de l'étudiant, jamais du système.
   ================================================================== */

const sombre = (page) => page.evaluate(() => document.documentElement.classList.contains("dark"));

test.describe("thème", () => {
  test.use({ colorScheme: "dark" });

  test("un système en mode sombre n'impose pas le thème sombre", async ({ page }) => {
    await entrerEnInvite(page);
    expect(await sombre(page)).toBe(false);
  });

  test("un thème sombre enregistré avant le changement est oublié une fois", async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem("deja")) {
        sessionStorage.setItem("deja", "1");
        localStorage.setItem("lrsi-theme", "dark");
      }
    });
    await entrerEnInvite(page);
    expect(await sombre(page)).toBe(false);
  });

  test("le thème sombre choisi par l'étudiant reste après rechargement", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/parametres");
    // La carte « Sombre » des paramètres, pas le bouton de la barre du
    // haut (« Passer en thème sombre »), présent lui aussi sur téléphone.
    await page.getByRole("button", { name: /^Sombre/ }).click();
    expect(await sombre(page)).toBe(true);
    await page.reload();
    expect(await sombre(page)).toBe(true);
  });
});
