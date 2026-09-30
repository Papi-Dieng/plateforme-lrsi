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

/* Supabase simulé : inscription sans session (confirmation par code),
   vérification du code (« 482915 » seulement), envoi du code de mot de
   passe oublié et changement de mot de passe. */
function supabaseSimule(page) {
  const appels = { verify: [], motDePasse: [] };
  const utilisateur = {
    id: "00000000-0000-4000-8000-000000000001",
    aud: "authenticated",
    email: "awa@exemple.com",
    user_metadata: { nom: "Awa Diallo", niveau: "Licence 1" },
    app_metadata: { provider: "email" },
    identities: [{ id: "i1" }],
    created_at: "2026-09-30T00:00:00Z",
  };
  const session = () => ({
    access_token: "jeton-de-test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "rafraichir",
    user: utilisateur,
  });
  page.route(`${comptes.url}/auth/v1/signup**`, (route) => route.fulfill({ json: utilisateur }));
  page.route(`${comptes.url}/auth/v1/recover**`, (route) => route.fulfill({ json: {} }));
  page.route(`${comptes.url}/auth/v1/verify**`, (route) => {
    const corps = route.request().postDataJSON();
    appels.verify.push(corps);
    return corps.token === "482915"
      ? route.fulfill({ json: session() })
      : route.fulfill({ status: 403, json: { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" } });
  });
  page.route(`${comptes.url}/auth/v1/user**`, (route) => {
    appels.motDePasse.push(route.request().postDataJSON().password);
    return route.fulfill({ json: utilisateur });
  });
  return appels;
}

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
    await page.getByRole("button", { name: "Recevoir un code" }).click();
    await expect(page.getByText("Indique l'adresse email de ton compte.")).toBeVisible();
  });

  test("inscription par email : le code reçu active le compte", async ({ page }) => {
    const appels = supabaseSimule(page);
    await aller(page, "/inscription");
    await page.getByLabel("Nom complet").fill("Awa Diallo");
    await page.getByLabel("Adresse email").fill("awa@exemple.com");
    await page.getByLabel("Mot de passe", { exact: true }).fill("un-bon-mot-de-passe");
    await page.getByLabel("Confirmer le mot de passe").fill("un-bon-mot-de-passe");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Créer mon compte" }).click();

    await expect(page.getByRole("heading", { name: "Vérifie ta boîte mail" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Renvoyer un code \(dans \d+ s\)/ })).toBeDisabled();

    await page.getByLabel("Code reçu par email").fill("12345");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page.getByText("Le code fait 6 chiffres.", { exact: false }).first()).toBeVisible();

    await page.getByLabel("Code reçu par email").fill("000000");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Code incorrect ou expiré." })).toBeVisible();

    await page.getByLabel("Code reçu par email").fill("482 915");
    await page.getByRole("button", { name: "Activer mon compte" }).click();
    await expect(page).toHaveURL(/#\/tableau-de-bord$/);
    expect(appels.verify.at(-1)).toMatchObject({ email: "awa@exemple.com", token: "482915", type: "signup" });
  });

  test("mot de passe oublié : le code mène au choix du nouveau mot de passe", async ({ page }) => {
    const appels = supabaseSimule(page);
    await aller(page, "/mot-de-passe-oublie");
    await page.getByLabel("Adresse email").fill("awa@exemple.com");
    await page.getByRole("button", { name: "Recevoir un code" }).click();
    // Ne révèle pas si l'adresse a un compte.
    await expect(page.getByText("Si un compte existe avec l'adresse", { exact: false })).toBeVisible();

    await page.getByLabel("Code reçu par email").fill("482915");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(page.getByRole("heading", { name: "Nouveau mot de passe" })).toBeVisible();
    expect(appels.verify.at(-1)).toMatchObject({ token: "482915", type: "recovery" });

    await page.getByLabel("Nouveau mot de passe").fill("encore-meilleur");
    await page.getByLabel("Confirmer le mot de passe").fill("encore-meilleur");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page).toHaveURL(/#\/tableau-de-bord$/);
    expect(appels.motDePasse).toEqual(["encore-meilleur"]);
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
