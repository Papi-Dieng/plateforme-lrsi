import { qcms } from "../src/data/qcm.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   « À revoir aujourd'hui » : la révision espacée sur le tableau de bord.
   ================================================================== */

const jour = (decalage) => {
  const d = new Date();
  d.setDate(d.getDate() + decalage);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const revision = (page, du, etape) =>
  page.addInitScript(([id, d, e]) => localStorage.setItem("lrsi-revisions", JSON.stringify({ [id]: { du: d, etape: e } })), [qcms[0].id, du, etape]);

test("un QCM en retard s'affiche avec son retard, et « Refaire » l'ouvre", async ({ page }) => {
  await revision(page, jour(-3), 0);
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  const bloc = page.getByRole("region", { name: "À revoir aujourd'hui" });
  await expect(bloc).toContainText("en retard de 3 jours");
  await bloc.getByRole("link", { name: `Refaire le QCM « ${qcms[0].titre} »` }).click();
  await expect(page).toHaveURL(new RegExp(`#/qcm/${qcms[0].id}$`));
});

test("rien de dû : la prochaine révision est annoncée", async ({ page }) => {
  await revision(page, jour(4), 1);
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  await expect(page.getByRole("region", { name: "À revoir aujourd'hui" })).toContainText("Rien à refaire aujourd'hui. Prochaine révision le");
});

test("rien à revoir du tout : pas de bloc", async ({ page }) => {
  await entrerEnInvite(page);
  await aller(page, "/tableau-de-bord");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "À revoir aujourd'hui" })).toHaveCount(0);
});
