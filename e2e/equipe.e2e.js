import { site } from "../src/data/site.js";
import { aller, expect, test } from "./outils.js";

/* Le carrousel de l'équipe, page Projet (components/CarrouselEquipe.jsx).
   Les tests demandent « moins d'animations » : le carrousel part alors
   sans défilement automatique, et le bouton propose de le lancer. */

test.describe("équipe", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("les flèches, les points et le clavier passent d'un membre à l'autre", async ({ page }) => {
    await aller(page, "/projet");
    const carrousel = page.getByRole("region", { name: "L'équipe du projet" });
    const nom = carrousel.getByRole("heading", { level: 3 });
    await expect(nom).toHaveText(site.equipe[0].nom);
    await expect(carrousel.getByText(site.equipe[0].role)).toBeVisible();

    await carrousel.getByRole("button", { name: "Membre suivant" }).click();
    await expect(nom).toHaveText(site.equipe[1].nom);
    await carrousel.getByRole("button", { name: "Membre précédent" }).click();
    await carrousel.getByRole("button", { name: "Membre précédent" }).click();
    await expect(nom).toHaveText(site.equipe.at(-1).nom);

    await carrousel.getByRole("group", { name: "Choisir un membre" }).getByRole("button", { name: site.equipe[2].nom }).click();
    await expect(nom).toHaveText(site.equipe[2].nom);
    await expect(carrousel.getByRole("button", { name: site.equipe[2].nom })).toHaveAttribute("aria-current", "true");

    await page.keyboard.press("ArrowRight");
    await expect(nom).toHaveText(site.equipe[3].nom);
  });

  test("le défilement se lance et s'arrête avec le bouton", async ({ page }) => {
    await aller(page, "/projet");
    const carrousel = page.getByRole("region", { name: "L'équipe du projet" });
    await carrousel.getByRole("button", { name: "Relancer le défilement" }).click();
    // Ni survol ni focus dans le carrousel : l'un comme l'autre le suspend.
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur());
    await expect(carrousel.getByRole("heading", { level: 3 })).toHaveText(site.equipe[1].nom, { timeout: 6000 });
    await carrousel.getByRole("button", { name: "Mettre le défilement en pause" }).click();
    await expect(carrousel.getByRole("button", { name: "Relancer le défilement" })).toBeVisible();
  });
});
