import { test as base, expect } from "@playwright/test";
import { site } from "../src/data/site.js";
import { comptes } from "../src/data/comptes.js";
import { contenuDemo } from "../src/data/demonstration.js";

/* ==================================================================
   Ce que partagent les tests dans le navigateur.

   `page` est remplacée par une page dont le relais IA est simulé :
   - GET /contenu répond `relais.contenu`, le contenu de démonstration
     par défaut (src/data/demonstration.js). Les fichiers de src/data/
     sont vides : sans cette publication, le site n'aurait rien à
     montrer. Un test qui veut un site vide met `relais.contenu = null` ;
   - POST /stats est accepté, et chaque envoi est gardé dans
     `relais.stats` pour que les tests puissent le relire ;
   - l'espace admin (/admin/…) n'accepte que MOT_DE_PASSE_ADMIN : rien
     n'y est publié au départ, et chaque publication est gardée dans
     `relais.publications` ;
   - tout le reste répond 503 : l'IA est indisponible, le site doit
     alors se débrouiller seul (guide, répartition sans IA).

   La table `avis` de Supabase (page « Ton avis ») est simulée elle
   aussi : la lecture répond `relais.avis`, et chaque avis publié est
   gardé dans `relais.avisEnvoyes`, puis ajouté à `relais.avis`.

   Les erreurs JavaScript de la page sont relevées : un test échoue si
   la page en a produit une.
   ================================================================== */

const RELAIS = new URL(site.urlIA).origin;
export const MOT_DE_PASSE_ADMIN = "mot-de-passe-des-tests";

export const test = base.extend({
  // Playwright exige ce `{}` : une fixture reçoit toujours les autres en premier.
  // oxlint-disable-next-line no-empty-pattern
  relais: async ({}, utiliser) => {
    await utiliser({ contenu: structuredClone(contenuDemo), stats: [], appels: [], publications: [], avis: [], avisEnvoyes: [] });
  },
  page: async ({ page, relais }, utiliser) => {
    await page.route(`${RELAIS}/**`, async (route) => {
      const requete = route.request();
      const chemin = new URL(requete.url()).pathname;
      relais.appels.push(`${requete.method()} ${chemin}`);
      if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" } });
      const entetes = { "Access-Control-Allow-Origin": "*" };
      if (chemin === "/contenu") return route.fulfill({ json: relais.contenu, headers: entetes });
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

    await page.route(
      (url) => url.href.startsWith(`${comptes.url}/rest/v1/avis`),
      async (route) => {
        const requete = route.request();
        const entetes = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
        if (requete.method() === "OPTIONS") return route.fulfill({ status: 204, headers: entetes });
        if (requete.method() === "POST") {
          const recu = requete.postDataJSON();
          relais.avisEnvoyes.push(recu);
          relais.avis.unshift({ id: 1000 + relais.avisEnvoyes.length, cree_le: new Date().toISOString(), ...recu });
          return route.fulfill({ status: 201, headers: entetes, body: "" });
        }
        return route.fulfill({ headers: entetes, json: relais.avis });
      }
    );

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

/* Va à une page du site, adresse avec dièse comprise.

   Depuis le 14 octobre 2026, une visite sans compte ne garde rien : la
   progression vit en mémoire, et un rechargement l'efface (voir
   src/stockage.js). Changer de page ne doit donc pas recharger le site,
   comme quand l'étudiant clique dans le menu. Tant que le site n'est pas
   ouvert, on l'ouvre pour de bon. */
export async function aller(page, chemin) {
  if (!/#/.test(page.url()) && !page.url().includes("/index.html") && page.url() === "about:blank") {
    await page.goto(`./#${chemin}`);
    return;
  }
  await page.evaluate((c) => {
    window.location.hash = c;
  }, chemin);
  // Laisse deux images à React pour afficher la page. On n'attend pas
  // une adresse précise : le site renvoie parfois ailleurs tout de suite
  // (une page réservée, ou l'accueil une fois entré).
  await page.evaluate(() => new Promise((suite) => requestAnimationFrame(() => requestAnimationFrame(suite))));
}

/* Recharge vraiment la page : pour les tests qui veulent savoir ce qui
   survit, et ce qui ne survit pas. */
export const recharger = (page) => page.reload();

/* ==================================================================
   Entrer avec un compte.

   Depuis le 14 octobre 2026, seul un compte conserve la progression :
   un test qui veut des données déjà là, ou qui recharge la page pour
   voir ce qui survit, passe par ici (voir src/stockage.js).

   Supabase n'est jamais appelé pour de vrai : la connexion par mot de
   passe et la table `donnees_etudiants` sont simulées. La table répond
   toujours la même chose, pour que la synchronisation n'écrase jamais
   ce que le test a semé.
   ================================================================== */

const COMPTE = {
  id: "00000000-0000-4000-8000-000000000042",
  aud: "authenticated",
  email: "awa@exemple.com",
  user_metadata: { nom: "Awa Diallo", niveau: "Licence 1" },
  app_metadata: { provider: "email" },
  identities: [{ id: "i1" }],
  created_at: "2026-09-30T00:00:00Z",
};

async function supabaseDeTest(page) {
  await page.route(`${comptes.url}/**`, (route) => {
    const url = route.request().url();
    const entetes = { "Access-Control-Allow-Origin": "*" };
    if (url.includes("/auth/v1/token")) {
      return route.fulfill({
        headers: entetes,
        json: {
          access_token: "jeton-de-test",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: "rafraichir",
          user: COMPTE,
        },
      });
    }
    // La ligne du compte : toujours vide, et toujours la même date, pour
    // que l'appareil garde ce qu'il a.
    if (url.includes("/rest/v1/donnees_etudiants")) {
      if (route.request().method() === "GET") {
        return route.fulfill({ headers: entetes, json: { donnees: {}, mis_a_jour: "2026-01-01T00:00:00Z" } });
      }
      return route.fulfill({ status: 201, headers: entetes, json: {} });
    }
    return route.fulfill({ status: 200, headers: entetes, json: {} });
  });
}

/* Entre avec un compte, puis sème des données déjà enregistrées :
   `donnees` est un dictionnaire { clé: valeur }, écrit tel quel comme
   le ferait le site. La page est rechargée ensuite, pour que tout soit
   relu depuis zéro. */
export async function entrerAvecCompte(page, donnees = null) {
  await supabaseDeTest(page);
  await page.goto("./#/connexion");
  await page.getByLabel("Email ou numéro de téléphone").fill(COMPTE.email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/#\/tableau-de-bord$/);
  if (donnees) {
    await page.evaluate((d) => {
      for (const [cle, valeur] of Object.entries(d)) localStorage.setItem(cle, JSON.stringify(valeur));
    }, donnees);
    await page.reload();
  }
}
