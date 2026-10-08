import { matieres } from "../src/data/matieres.js";
import { site } from "../src/data/site.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   La fiche de révision d'un chapitre, tirée du texte du cours par l'IA,
   puis gardée dans le navigateur.
   ================================================================== */

const COURS = "Le modèle OSI compte sept couches. La couche réseau achemine les paquets entre les machines grâce à l'adressage IP, et la couche transport assure la fiabilité.";

test("la fiche s'ouvre au clic, puis se rouvre sans redemander à l'IA", async ({ page, relais }) => {
  const m = matieres[0];
  const chapitre = m.chapitres.find((c) => c.statut === "disponible");
  relais.contenu = {
    matieres: matieres.map((x) => (x.id === m.id ? { ...x, chapitres: x.chapitres.map((c) => (c === chapitre ? { ...c, contenu: COURS } : c)) } : x)),
  };
  const envois = [];
  await page.route(`${new URL(site.urlIA).origin}/fiche-revision`, (route) => {
    const entetes = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: entetes });
    envois.push(route.request().postDataJSON());
    return route.fulfill({ headers: entetes, json: { points: ["Le modèle OSI a sept couches."], definitions: [{ terme: "Couche réseau", sens: "Achemine les paquets." }] } });
  });

  await entrerEnInvite(page);
  await aller(page, `/cours/${m.id}?semestre=${chapitre.semestre ?? 1}`);
  await page.getByRole("button", { name: "Fiche de révision" }).first().click();
  const fiche = page.getByRole("region", { name: `Fiche de révision : ${chapitre.titre}` });
  await expect(fiche).toContainText("Le modèle OSI a sept couches.");
  await expect(fiche).toContainText("Couche réseau");
  expect(envois).toEqual([{ titre: chapitre.titre, texte: COURS }]);

  await page.reload();
  await page.getByRole("button", { name: "Fiche de révision" }).first().click();
  await expect(page.getByRole("region", { name: `Fiche de révision : ${chapitre.titre}` })).toContainText("Le modèle OSI a sept couches.");
  expect(envois).toHaveLength(1);
});
