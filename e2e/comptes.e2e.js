import { comptes } from "../src/data/comptes.js";
import { aller, expect, test } from "./outils.js";

/* ==================================================================
   Écrans des comptes. Les tests ne touchent jamais le vrai projet
   Supabase : ses réponses sont simulées ici. Ils vérifient les
   formulaires, leurs contrôles et le repli sur le mode invité. La
   logique des comptes et
   de la synchronisation est testée à part (src/synchro.test.js,
   src/telephone.test.js, serveur-ia/relais.test.js).
   ================================================================== */

test.describe("comptes", () => {
  // Filet : aucune requête ne part vers le vrai Supabase pendant les tests.
  test.beforeEach(async ({ page }) => {
    await page.route(`${comptes.url}/**`, (route) => route.fulfill({ status: 503, json: {} }));
  });

  test("connexion : un seul champ, email ou numéro, et chaque erreur dite", async ({ page }) => {
    await aller(page, "/connexion");
    await expect(page.getByRole("heading", { name: "Se connecter" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuer avec Google" })).toBeVisible();

    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Indique ton adresse email ou ton numéro de téléphone.")).toBeVisible();
    await expect(page.getByText("Indique ton mot de passe.")).toBeVisible();

    await page.getByLabel("Email ou numéro de téléphone").fill("12");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByText("Ce numéro n'est pas valide. Exemple : 77 123 45 67.")).toBeVisible();

    // Mauvais mot de passe : Supabase refuse, le site le dit en français.
    let email = null;
    await page.route(`${comptes.url}/auth/v1/token**`, (route) => {
      email = route.request().postDataJSON().email;
      return route.fulfill({ status: 400, json: { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" } });
    });
    await page.getByLabel("Email ou numéro de téléphone").fill("77 123 45 67");
    await page.getByLabel("Mot de passe", { exact: true }).fill("un-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Identifiant ou mot de passe incorrect." })).toBeVisible();
    // Le numéro devient l'adresse du compte téléphone (src/telephone.js).
    expect(email).toBe("221771234567@telephone.sunu-cours.invalid");
  });

  test("inscription : email ou numéro, au choix", async ({ page }) => {
    await aller(page, "/inscription");
    const choix = page.getByRole("group", { name: "S'inscrire avec" });
    await expect(page.getByLabel("Adresse email")).toBeVisible();
    await choix.getByRole("button", { name: "Téléphone" }).click();
    await expect(choix.getByRole("button", { name: "Téléphone" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByLabel("Numéro de téléphone")).toBeVisible();
    await expect(page.getByLabel("Adresse email")).toHaveCount(0);

    await page.getByRole("button", { name: "Créer mon compte" }).click();
    await expect(page.getByText("Indique ton nom.")).toBeVisible();
    await expect(page.getByText("Indique un numéro valide. Exemple : 77 123 45 67.")).toBeVisible();
    await expect(page.getByText("Il faut accepter les conditions d'utilisation.")).toBeVisible();
  });

  test("mot de passe oublié, depuis la connexion", async ({ page }) => {
    await aller(page, "/connexion");
    await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
    await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible();
    await page.getByRole("button", { name: "Envoyer le lien" }).click();
    await expect(page.getByText("Indique l'adresse email de ton compte.")).toBeVisible();
  });

  test("le mode invité reste ouvert depuis la connexion", async ({ page }) => {
    await aller(page, "/connexion");
    await page.getByRole("button", { name: "Entrer en mode invité" }).click();
    await expect(page).toHaveURL(/#\/tableau-de-bord$/);
  });

  test("une ancienne session « de démonstration » devient une visite", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("lrsi-session", JSON.stringify({ mode: "demo", nom: "Awa" })));
    await aller(page, "/parametres");
    await expect(page.getByText("Ta progression reste sur cet appareil seulement.")).toBeVisible();
  });
});
