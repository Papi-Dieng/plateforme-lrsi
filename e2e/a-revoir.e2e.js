import { qcms } from "../src/data/qcm.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Le rappel de la révision espacée vit dans la cloche (notifications),
   sur ordinateur comme sur téléphone : plus sur le tableau de bord.
   ================================================================== */

const jour = (decalage) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const revision = (page, du, etape) =>
  page.addInitScript(([id, d, e]) => localStorage.setItem("lrsi-revisions", JSON.stringify({ [id]: { du: d, etape: e } })), [qcms[0].id, du, etape]);

const ouvrirCloche = (page) => page.getByRole("button", { name: /^Notifications :/ }).click();
const panneau = (page) => page.getByRole("region", { name: "Notifications du jour" });

test("un QCM en retard s'affiche dans la cloche avec son retard, et l'entrée l'ouvre", async ({ page }) => {
  await revision(page, jour(-3), 0);
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  await expect(page.getByRole("button", { name: "Notifications : 1 à faire aujourd'hui" })).toBeVisible();
  await ouvrirCloche(page);
  await expect(panneau(page)).toContainText("En retard de 3 jours");
  await panneau(page).getByRole("link", { name: new RegExp(`Refaire le QCM « ${qcms[0].titre} »`) }).click();
  await expect(page).toHaveURL(new RegExp(`#/qcm/${qcms[0].id}$`));
});

test("rien de dû : la cloche annonce la prochaine révision, sans point rouge", async ({ page }) => {
  await revision(page, jour(4), 1);
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  await ouvrirCloche(page);
  await expect(panneau(page)).toContainText("Rien à refaire aujourd'hui. Prochaine révision le");
  await expect(page.getByRole("button", { name: "Notifications : rien pour aujourd'hui" })).toBeVisible();
});

test("le tableau de bord n'affiche plus le bloc de rappel", async ({ page }) => {
  await revision(page, jour(-3), 0);
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "À revoir aujourd'hui" })).toHaveCount(0);
});
