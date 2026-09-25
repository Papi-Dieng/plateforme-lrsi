import { test as base, expect } from "@playwright/test";
import { site } from "../src/data/site.js";

/* ==================================================================
   Ce que partagent les tests dans le navigateur.

   `page` est remplacée par une page dont le relais IA est simulé :
   - GET /contenu répond `null` : rien de publié, le site affiche le
     contenu de src/data/ ;
   - POST /stats est accepté, et chaque envoi est gardé dans
     `relais.stats` pour que les tests puissent le relire ;
   - l'espace admin (/admin/…) n'accepte que MOT_DE_PASSE_ADMIN : rien
     n'y est publié au départ, et chaque publication est gardée dans
     `relais.publications` ;
   - tout le reste répond 503 : l'IA est indisponible, le site doit
     alors se débrouiller seul (guide, répartition sans IA).

   Les erreurs JavaScript de la page sont relevées : un test échoue si
   la page en a produit une.
   ================================================================== */

const RELAIS = new URL(site.urlIA).origin;
export const MOT_DE_PASSE_ADMIN = "mot-de-passe-des-tests";

export const test = base.extend({
  // Playwright exige ce `{}` : une fixture reçoit toujours les autres en premier.
  // oxlint-disable-next-line no-empty-pattern
  relais: async ({}, utiliser) => {
    await utiliser({ stats: [], appels: [], publications: [] });
  },
  page: async ({ page, relais }, utiliser) => {
    await page.route(`${RELAIS}/**`, async (route) => {
      const requete = route.request();
      const chemin = new URL(requete.url()).pathname;
      relais.appels.push(`${requete.method()} ${chemin}`);
      if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
      const entetes = { "Access-Control-Allow-Origin": "*" };
      if (chemin === "/contenu") return route.fulfill({ json: null, headers: entetes });
      if (chemin === "/stats") {
        relais.stats.push(requete.postDataJSON());
        return route.fulfill({ json: { ok: true }, headers: entetes });
      }
      if (chemin.startsWith("/admin/")) {
        if (requete.headers()["x-admin"] !== MOT_DE_PASSE_ADMIN) {
          return route.fulfill({ status: 401, json: { erreur: "mot-de-passe" }, headers: entetes });
        }
        if (chemin === "/admin/verifier") return route.fulfill({ json: { ok: true }, headers: entetes });
        if (chemin === "/admin/contenu" && requete.method() === "GET") {
          return route.fulfill({ json: relais.publications.at(-1) ?? null, headers: entetes });
        }
        if (chemin === "/admin/contenu" && requete.method() === "PUT") {
          const publie = { ...requete.postDataJSON(), publieLe: new Date().toISOString() };
          relais.publications.push(publie);
          return route.fulfill({ json: publie, headers: entetes });
        }
      }
      return route.fulfill({ status: 503, json: { erreur: "surcharge" }, headers: entetes });
    });

    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message));
    await utiliser(page);
    expect(erreurs, "erreurs JavaScript dans la page").toEqual([]);
  },
});

export { expect };

/* Entre sur le site en mode invité, comme depuis la page d'accueil. */
export async function entrerEnInvite(page) {
  await page.goto("./");
  await page.getByRole("button", { name: "Entrer en mode invité" }).click();
  await expect(page).toHaveURL(/#\/tableau-de-bord$/);
}

/* Va à une page du site, adresse avec dièse comprise. */
export const aller = (page, chemin) => page.goto(`./#${chemin}`);
