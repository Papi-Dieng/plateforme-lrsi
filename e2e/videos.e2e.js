import { matieres } from "../src/data/matieres.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Les vidéos : seul l'admin en ajoute. L'étudiant voit celles qui sont
   publiées avec un lien, et rien pour en ajouter ou en modifier.
   ================================================================== */

const publiees = [
  { id: "osi", titre: "Le modèle OSI en dix minutes", matiere: "reseaux", youtubeId: "AbCdEf12345", duree: "10:00" },
  { id: "vide", titre: "Emplacement sans lien", matiere: "reseaux", youtubeId: null, duree: "—" },
];

test("l'étudiant voit les vidéos publiées avec un lien, et ne peut rien ajouter", async ({ page, relais }) => {
  relais.contenu = { matieres, videos: publiees };
  await entrerEnInvite(page);

  // Le tableau de bord : la vidéo publiée, sans bouton d'ajout.
  await expect(page.getByRole("heading", { name: /Vidéos d'explication/ })).toBeVisible();
  await expect(page.getByText("Le modèle OSI en dix minutes").first()).toBeVisible();
  await expect(page.getByText("Emplacement sans lien")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ajouter une vidéo/ })).toHaveCount(0);

  // La page Vidéos : pareil.
  await aller(page, "/videos");
  await expect(page.getByRole("heading", { level: 1, name: "Vidéos d'explication" })).toBeVisible();
  await expect(page.getByText("Le modèle OSI en dix minutes")).toBeVisible();
  await expect(page.getByText("Emplacement sans lien")).toHaveCount(0);
  await expect(page.getByText("Lien à ajouter")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Ajouter une vidéo/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Retirer la vidéo/ })).toHaveCount(0);
});

test("sans vidéo publiée : le tableau de bord n'affiche pas la section, la page le dit", async ({ page }) => {
  await entrerEnInvite(page);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Vidéos d'explication/ })).toHaveCount(0);

  await aller(page, "/videos");
  await expect(page.getByText("Pas encore de vidéo")).toBeVisible();
});

test("les vidéos qu'un étudiant avait ajoutées lui-même sont effacées", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("deja")) {
      sessionStorage.setItem("deja", "1");
      localStorage.setItem("lrsi-videos", JSON.stringify([{ id: "perso-AbCdEf12345", titre: "Ma vidéo", youtubeId: "AbCdEf12345" }]));
    }
  });
  await entrerEnInvite(page);
  expect(await page.evaluate(() => localStorage.getItem("lrsi-videos"))).toBeNull();
  await aller(page, "/videos");
  await expect(page.getByText("Ma vidéo")).toHaveCount(0);
});
