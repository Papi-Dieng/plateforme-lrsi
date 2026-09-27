import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Le filet (components/FiletErreur.jsx) : une page qui plante affiche
   un message à sa place, et le reste du site continue de marcher.

   Les pannes sont simulées en remplaçant, au vol, le fichier d'une page
   ou de l'application par une version qui plante ou qui n'existe plus.
   ================================================================== */

const SIMULATION_PANNE = 'export default function PageEnPanne() { throw new Error("panne simulée"); }\n';

test("une page qui plante affiche un message, et le reste du site marche encore", async ({ page }) => {
  await page.route(/\/assets\/Videos-[\w-]+\.js$/, (route) =>
    route.fulfill({ contentType: "text/javascript", body: SIMULATION_PANNE })
  );
  await entrerEnInvite(page);
  await aller(page, "/videos");

  const alerte = page.getByRole("alert");
  await expect(alerte).toContainText("Cette page a rencontré un problème");
  await expect(alerte).toContainText("Ta progression n'est pas touchée");
  await expect(alerte.getByRole("button", { name: "Recharger la page" })).toBeVisible();

  // La coque tient : une autre page s'ouvre normalement.
  await aller(page, "/conditions");
  await expect(page.getByRole("heading", { level: 1, name: "Conditions d'utilisation" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("un fichier de page disparu (nouvelle version en ligne) invite à recharger", async ({ page }) => {
  await page.route(/\/assets\/Videos-[\w-]+\.js$/, (route) => route.fulfill({ status: 404, body: "" }));
  await entrerEnInvite(page);
  await aller(page, "/videos");
  await expect(page.getByRole("alert")).toContainText("Une nouvelle version du site est en ligne");
});

test("si l'application elle-même ne se charge pas : un message plein écran, pas une page blanche", async ({ page }) => {
  await page.route(/\/assets\/App-[\w-]+\.js$/, (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("./");
  await expect(page.getByRole("alert")).toContainText("Une nouvelle version du site est en ligne");
  await expect(page.getByRole("button", { name: "Recharger la page" })).toBeVisible();
});

test("un contenu publié mal formé est ignoré : le site affiche le contenu du code", async ({ page, relais }) => {
  relais.contenu = { matieres: [{ id: "abimee", nom: "Matière abîmée" }] };
  await entrerEnInvite(page);
  await aller(page, "/cours");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Matière abîmée")).toHaveCount(0);
});
