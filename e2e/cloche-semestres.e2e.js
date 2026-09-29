import { matieres } from "../src/data/matieres.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   La cloche (ce qu'il y a à faire aujourd'hui) et les semestres (le 1
   et le 2 seulement, partout sur le site).
   ================================================================== */

const JOUR = "2026-09-29";

test.describe("cloche", () => {
  test.skip(({ isMobile }) => isMobile, "la cloche est dans la barre du haut, sur ordinateur");

  test("rien à faire : pas de pastille, et elle le dit", async ({ page }) => {
    await entrerEnInvite(page);
    const cloche = page.getByRole("button", { name: "Notifications : rien pour aujourd'hui" });
    await cloche.click();
    await expect(page.getByText("Rien pour aujourd'hui.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Rien pour aujourd'hui.")).toHaveCount(0);
  });

  test("un QCM à refaire et un examen demain : la pastille compte 2, chaque entrée mène à sa page", async ({ page }) => {
    await page.clock.install({ time: new Date(`${JOUR}T09:00:00Z`) });
    await page.addInitScript(() => {
      localStorage.setItem("lrsi-revisions", JSON.stringify({ "reseaux-bases": { du: "2026-09-27", etape: 0 } }));
      localStorage.setItem(
        "lrsi-planning",
        JSON.stringify({ evaluations: [{ id: "ev1", titre: "Examen de Réseaux", matiere: "reseaux", date: "2026-09-30" }], faites: {}, evenements: [] })
      );
    });
    await entrerEnInvite(page);

    const cloche = page.getByRole("button", { name: "Notifications : 2 à faire aujourd'hui" });
    await expect(cloche).toContainText("2");
    await cloche.click();
    await expect(page.getByText("Examen de Réseaux")).toBeVisible();
    await expect(page.getByText("Demain")).toBeVisible();

    await page.getByRole("link", { name: /Refaire le QCM « Réseaux : les fondamentaux »/ }).click();
    await expect(page).toHaveURL(/#\/qcm\/reseaux-bases$/);
  });
});

test.describe("semestres", () => {
  test("la page Cours ne propose que le semestre 1 et le semestre 2", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/cours");
    const filtres = page.getByRole("group", { name: "Filtrer par semestre" });
    // La page arrive à la demande : attendre les filtres avant de les lire.
    await expect(filtres.getByRole("button", { name: "Semestre 2" })).toBeVisible();
    const libelles = await filtres.getByRole("button").allInnerTexts();
    expect(libelles.map((t) => t.trim())).toEqual(["Tous les semestres", "Semestre 1", "Semestre 2"]);

    // Toutes les matières couvrent les deux semestres : elles restent toutes.
    await filtres.getByRole("button", { name: "Semestre 2" }).click();
    for (const m of matieres) await expect(page.getByText(m.nom, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Semestre [3-9]/)).toHaveCount(0);
  });

  test("un semestre 3 publié avant la règle s'affiche « Semestres 1 et 2 »", async ({ page, relais }) => {
    relais.contenu = { matieres: matieres.map((m, i) => (i === 0 ? { ...m, semestre: "Semestre 3" } : m)) };
    await entrerEnInvite(page);
    await aller(page, `/cours/${matieres[0].id}`);
    await expect(page.getByText("Semestres 1 et 2").first()).toBeVisible();
    await expect(page.getByText("Semestre 3")).toHaveCount(0);
  });
});
