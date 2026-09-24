import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Chaque page s'ouvre sans erreur, sur ordinateur comme sur téléphone,
   et quelques écrans qui dépendent de l'IA marchent sans elle.
   ================================================================== */

const PAGES = [
  ["/tableau-de-bord", "Mes cours"],
  ["/cours", "Cours"],
  ["/cours/reseaux", "Réseaux"],
  ["/exercices", "Exercices"],
  ["/qcm", "QCM"],
  ["/examens", "Devoirs"],
  ["/videos", "Vidéos"],
  ["/bibliotheque", "Bibliothèque"],
  ["/favoris", "favoris"],
  ["/progression", "Ma progression"],
  ["/planning", "planning"],
  ["/assistant", "Assistant"],
  ["/profil", "profil"],
  ["/parametres", "Paramètres"],
  ["/conditions", "Conditions"],
  ["/projet", "Une plateforme"],
  ["/admin", "Administration"],
];

test.describe("chaque page s'ouvre", () => {
  for (const [chemin, titre] of PAGES) {
    test(chemin, async ({ page }) => {
      await entrerEnInvite(page);
      await aller(page, chemin);
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(new RegExp(titre, "i"));
      // Rien ne déborde sur le côté, même sur un téléphone.
      const deborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(deborde, "défilement horizontal").toBeLessThanOrEqual(1);
    });
  }
});

test.describe("navigation", () => {
  test("sur téléphone, le menu s'ouvre et mène à une page", async ({ page, isMobile }) => {
    test.skip(!isMobile, "menu propre au téléphone");
    await entrerEnInvite(page);
    await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
    const menu = page.getByRole("navigation", { name: "Navigation mobile" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Exercices" }).click();
    await expect(page).toHaveURL(/#\/exercices$/);
    await expect(menu).toBeHidden();
  });

  test("sur ordinateur, la barre latérale mène à chaque rubrique", async ({ page, isMobile }) => {
    test.skip(isMobile, "barre latérale absente sur téléphone");
    await entrerEnInvite(page);
    const barre = page.getByRole("navigation", { name: "Navigation principale" });
    for (const [nom, adresse] of [["Cours", "/cours"], ["QCM", "/qcm"], ["Mon planning", "/planning"]]) {
      await barre.getByRole("link", { name: nom, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#${adresse}$`));
    }
  });
});

test.describe("sans IA", () => {
  test("l'assistant répond quand même avec le guide, et renvoie vers le cours", async ({ page, relais }) => {
    await entrerEnInvite(page);
    await aller(page, "/assistant");
    await page.getByPlaceholder("Une notion, un exercice, un chapitre à réviser…").fill("Je n'ai pas compris le modèle OSI");
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.locator('a[href="#/cours/reseaux"]').first()).toBeVisible();
    // L'IA a bien été essayée : c'est son refus qui a laissé répondre le guide.
    expect(relais.appels.some((a) => a.startsWith("POST"))).toBe(true);
  });

  test("l'espace admin refuse un mauvais mot de passe", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/admin/contenu");
    await page.getByLabel("Mot de passe admin").fill("pas-le-bon");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();
    // Le mot de passe refusé n'est pas gardé.
    expect(await page.evaluate(() => sessionStorage.getItem("lrsi-admin-ia"))).toBeNull();
  });
});

test.describe("planning", () => {
  test("l'emploi du temps passe d'une vue à l'autre", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/planning");
    for (const vue of ["Semaine", "Jour", "Liste", "Mois"]) {
      const onglet = page.getByRole("tab", { name: vue, exact: true });
      await onglet.click();
      await expect(onglet).toHaveAttribute("aria-selected", "true");
    }
  });
});
