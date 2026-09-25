import { exercices } from "../src/data/exercices.js";
import { matieres } from "../src/data/matieres.js";
import { MOT_DE_PASSE_ADMIN, aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   « Gérer le contenu », avec le bon mot de passe : chaque onglet
   s'ouvre, une modification se publie, et ce qui part au relais est
   bien le brouillon modifié. Le relais est simulé (e2e/outils.js).
   ================================================================== */

const ONGLETS = ["Matières et cours", "Compétences", "Exercices", "QCM", "Vidéos", "Devoirs", "Examens", "Bibliothèque"];

// Chaque onglet affiche aussi son nombre d'éléments : « Exercices 12 ».
const onglet = (page, nom) => page.getByRole("tab", { name: new RegExp(`^${nom} \\d+$`) });

async function connecter(page) {
  await entrerEnInvite(page);
  await aller(page, "/admin/contenu");
  await page.getByLabel("Mot de passe admin").fill(MOT_DE_PASSE_ADMIN);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Rien n'a encore été publié")).toBeVisible();
}

test.describe("gérer le contenu", () => {
  test.skip(({ isMobile }) => isMobile, "espace d'auteur, pensé pour un ordinateur");

  test("chaque onglet s'ouvre et montre son contenu", async ({ page }) => {
    await connecter(page);
    for (const nom of ONGLETS) {
      await onglet(page, nom).click();
      await expect(onglet(page, nom)).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("button", { name: "Ajouter" })).toBeVisible();
    }
    await onglet(page, "Exercices").click();
    await page.getByRole("button", { name: new RegExp(exercices[0].titre) }).first().click();
    await expect(page.getByLabel("Titre", { exact: true }).first()).toHaveValue(exercices[0].titre);
  });

  test("une modification se publie, et seul le brouillon modifié part au relais", async ({ page, relais }) => {
    await connecter(page);
    const publier = page.getByRole("button", { name: "Publier" });
    await expect(publier).toBeDisabled();

    await page.getByRole("button", { name: new RegExp(matieres[0].nom) }).first().click();
    const nom = page.getByLabel("Nom complet");
    await expect(nom).toHaveValue(matieres[0].nom);
    await nom.fill(`${matieres[0].nom} (modifié)`);

    // S'il reste des points à vérifier, la page les montre avant de publier.
    page.on("dialog", (d) => d.accept());
    await publier.click();
    await expect(page.getByText(/^Publié à /)).toBeVisible();
    await expect(publier).toBeDisabled();

    expect(relais.publications).toHaveLength(1);
    const envoye = relais.publications[0];
    expect(envoye.matieres[0].nom).toBe(`${matieres[0].nom} (modifié)`);
    expect(envoye.matieres.slice(1).map((m) => m.nom)).toEqual(matieres.slice(1).map((m) => m.nom));
    expect(envoye.exercices.map((e) => e.id)).toEqual(exercices.map((e) => e.id));
  });

  test("un exercice ajouté sans titre est signalé avant de publier", async ({ page, relais }) => {
    await connecter(page);
    await onglet(page, "Exercices").click();
    await page.getByRole("button", { name: "Ajouter" }).click();

    let message = "";
    page.on("dialog", (d) => {
      message = d.message();
      d.dismiss();
    });
    await page.getByRole("button", { name: "Publier" }).click();
    await expect.poll(() => message).toContain("n'a pas de titre : il serait supprimé");
    expect(relais.publications).toEqual([]);
  });
});
