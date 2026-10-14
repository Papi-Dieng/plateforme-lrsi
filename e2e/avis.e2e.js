import { expect, test } from "./outils.js";

/* ==================================================================
   La page « Ton avis » (#/avis), ouverte sans entrer sur le site : c'est
   le lien partagé sur WhatsApp. On y lit les avis des autres, et on
   publie le sien sans compte. Supabase est simulé (e2e/outils.js).
   ================================================================== */

test("un visiteur sans compte lit les avis, puis publie le sien", async ({ page, relais }) => {
  relais.avis = [
    { id: 1, cree_le: new Date().toISOString(), note: 4, aime: "Les QCM avec la correction", propose: "Plus de vidéos en réseaux", prenom: "Moussa", niveau: "L1" },
  ];
  await page.goto("./#/avis");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("ce que tu penses");
  await expect(page.getByText("Les QCM avec la correction")).toBeVisible();
  await expect(page.getByText("sur 1 avis · 1 proposition")).toBeVisible();

  // Sans note, rien ne part.
  await page.getByRole("button", { name: "Publier mon avis" }).click();
  await expect(page.getByRole("alert")).toContainText("note");
  expect(relais.avisEnvoyes).toEqual([]);

  await page.getByRole("radio", { name: "5 sur 5, Génial" }).check({ force: true });
  await page.getByLabel("Ce que tu proposes pour le site").fill("  Un forum par matière  ");
  await page.getByLabel(/Niveau/).selectOption("L2");
  await page.getByRole("button", { name: "Publier mon avis" }).click();

  await expect(page.getByRole("status")).toContainText("ton avis est publié");
  expect(relais.avisEnvoyes).toEqual([{ note: 5, aime: "", propose: "Un forum par matière", prenom: "", niveau: "L2" }]);
  // La liste est relue : le nouvel avis y figure, en tête.
  await expect(page.getByText("Un forum par matière")).toBeVisible();
  await expect(page.getByText("sur 2 avis · 2 propositions")).toBeVisible();

  await page.getByRole("button", { name: /Propositions/ }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Proposition" })).toHaveCount(2);
});
