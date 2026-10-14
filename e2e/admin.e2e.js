import { contenuDemo, exercices, matieres } from "../src/data/demonstration.js";
import { MOT_DE_PASSE_ADMIN, aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   « Gérer le contenu », avec le bon mot de passe : chaque onglet
   s'ouvre, une modification se publie, et ce qui part au relais est
   bien le brouillon modifié. Le relais est simulé (e2e/outils.js).
   ================================================================== */

const ONGLETS = ["Matières et cours", "Exercices", "QCM", "Vidéos", "Devoirs", "Examens", "Bibliothèque"];

// Chaque onglet affiche aussi son nombre d'éléments : « Exercices 12 ».
const onglet = (page, nom) => page.getByRole("tab", { name: new RegExp(`^${nom} \\d+$`) });

/* L'admin part de la dernière version publiée. Les tests qui modifient
   du contenu ont donc besoin d'une publication : on en pose une, celle
   du contenu de démonstration. Sans elle, le brouillon est vide, comme
   sur un site qui vient d'être installé (voir le dernier test). */
async function connecter(page, relais) {
  if (relais) relais.publications.push({ ...structuredClone(contenuDemo), publieLe: "2026-10-08T16:49:30.374Z" });
  await entrerEnInvite(page);
  await aller(page, "/admin/contenu");
  await page.getByLabel("Mot de passe admin").fill(MOT_DE_PASSE_ADMIN);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText(relais ? /Version publiée le/ : "Rien n'a encore été publié")).toBeVisible();
}

test.describe("gérer le contenu", () => {
  test.skip(({ isMobile }) => isMobile, "espace d'auteur, pensé pour un ordinateur");

  test("chaque onglet s'ouvre et montre son contenu", async ({ page, relais }) => {
    await connecter(page, relais);
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
    await connecter(page, relais);
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

    // La première publication est celle posée par `connecter` ; la
    // seconde est celle du test.
    expect(relais.publications).toHaveLength(2);
    const envoye = relais.publications.at(-1);
    expect(envoye.matieres[0].nom).toBe(`${matieres[0].nom} (modifié)`);
    expect(envoye.matieres.slice(1).map((m) => m.nom)).toEqual(matieres.slice(1).map((m) => m.nom));
    expect(envoye.exercices.map((e) => e.id)).toEqual(exercices.map((e) => e.id));
  });

  test("un exercice ajouté sans titre est signalé avant de publier", async ({ page, relais }) => {
    await connecter(page, relais);
    await onglet(page, "Exercices").click();
    await page.getByRole("button", { name: "Ajouter" }).click();

    let message = "";
    page.on("dialog", (d) => {
      message = d.message();
      d.dismiss();
    });
    await page.getByRole("button", { name: "Publier" }).click();
    await expect.poll(() => message).toContain("n'a pas de titre : il serait supprimé");
    // Rien n'est parti : seule la publication de départ est là.
    expect(relais.publications).toHaveLength(1);
  });

  /* L'état d'un site qui vient d'être installé : rien n'est publié, et
     les fichiers de src/data/ sont vides. L'auteur part d'une page
     blanche, et chaque onglet compte zéro élément. */
  test("sans rien de publié, le brouillon part d'un site vide", async ({ page }) => {
    await connecter(page);
    await expect(page.getByRole("tab", { name: /^Matières et cours 0$/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^Exercices 0$/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /^QCM 0$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ajouter" })).toBeVisible();
  });
});
