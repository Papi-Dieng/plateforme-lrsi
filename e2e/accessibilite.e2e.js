import AxeBuilder from "@axe-core/playwright";
import { examens } from "../src/data/examens.js";
import { exercices } from "../src/data/exercices.js";
import { qcms } from "../src/data/qcm.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Accessibilité, vérifiée par axe (règles WCAG 2.1, niveaux A et AA)
   sur chaque page, en thème clair et en thème sombre : contrastes,
   libellés, structure des titres et des listes, navigation au clavier…

   Les animations sont coupées (préférence « réduire les animations »),
   pour ne jamais mesurer un texte en train d'apparaître. Le thème est
   choisi avant le chargement, puis la page est rechargée : changer
   seulement la partie après le « # » ne relancerait pas le site.
   ================================================================== */

const PAGES = [
  "/tableau-de-bord",
  "/cours",
  "/cours/reseaux",
  "/exercices",
  `/exercices/${exercices[0].id}`,
  "/qcm",
  `/qcm/${qcms[0].id}`,
  "/examens",
  `/examens/${examens[0].id}`,
  "/videos",
  "/bibliotheque",
  "/favoris",
  "/progression",
  "/planning",
  "/assistant",
  "/profil",
  "/parametres",
  "/conditions",
  "/confidentialite",
  "/mentions-legales",
  "/projet",
  "/admin",
  "/admin/contenu",
];

/* Une ligne lisible par défaut trouvé : la règle, l'élément et, pour
   un contraste, les couleurs mesurées. */
const decrire = (violations) =>
  violations.flatMap((v) =>
    v.nodes.map((n) => {
      const d = n.any[0]?.data;
      const contraste = d?.contrastRatio ? ` — ${d.fgColor} sur ${d.bgColor} : ${d.contrastRatio}:1 (${d.expectedContrastRatio} demandé)` : "";
      return `${v.id} : ${n.target.join(" ")}${contraste}`;
    })
  );

async function verifier(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(decrire(violations), "défauts d'accessibilité").toEqual([]);
}

for (const theme of ["clair", "sombre"]) {
  test.describe(`thème ${theme}`, () => {
    test.use({ colorScheme: theme === "sombre" ? "dark" : "light", reducedMotion: "reduce" });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("lrsi-theme", t), theme === "sombre" ? "dark" : "light");
    });

    test("accueil et connexion", async ({ page }) => {
      await page.goto("./");
      await expect(page.getByRole("button", { name: "Entrer en mode invité" })).toBeVisible();
      await verifier(page);
      await aller(page, "/connexion");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await verifier(page);
    });

    for (const chemin of PAGES) {
      test(chemin, async ({ page }) => {
        await entrerEnInvite(page);
        await aller(page, chemin);
        await page.reload();
        await expect(page.locator("html")).toHaveClass(theme === "sombre" ? /\bdark\b/ : /^(?!.*\bdark\b)/);
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await verifier(page);
      });
    }
  });
}
