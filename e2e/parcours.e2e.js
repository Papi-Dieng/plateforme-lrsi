import { qcms } from "../src/data/qcm.js";
import { exercices } from "../src/data/exercices.js";
import { matieres } from "../src/data/matieres.js";
import { site } from "../src/data/site.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Les parcours principaux d'un étudiant, dans un vrai navigateur.
   ================================================================== */

test.describe("entrée sur le site", () => {
  test("l'accueil propose le mode invité, qui mène au tableau de bord", async ({ page }) => {
    await entrerEnInvite(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("une page réservée renvoie à l'accueil tant qu'on n'est pas entré", async ({ page }) => {
    await aller(page, "/progression");
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.getByRole("button", { name: "Entrer en mode invité" })).toBeVisible();
  });

  test("une fois entré, l'accueil renvoie au tableau de bord", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, "/");
    await expect(page).toHaveURL(/#\/tableau-de-bord$/);
  });

  test("une adresse inconnue affiche « Page introuvable »", async ({ page }) => {
    await aller(page, "/nulle-part");
    await expect(page.getByRole("heading", { name: "Page introuvable" })).toBeAttached();
    await expect(page.getByRole("link", { name: "Revenir à l'accueil" })).toBeVisible();
  });

  test("le thème sombre est gardé d'une visite à l'autre", async ({ page, isMobile }) => {
    test.skip(isMobile, "le bouton de thème est dans la barre latérale, absente sur téléphone");
    await entrerEnInvite(page);
    const html = page.locator("html");
    const sombreAuDepart = await html.evaluate((e) => e.classList.contains("dark"));
    await page.getByRole("button", { name: sombreAuDepart ? "Passer en thème clair" : "Passer en thème sombre" }).first().click();
    await expect(html).toHaveClass(sombreAuDepart ? /^(?!.*\bdark\b)/ : /\bdark\b/);
    await page.reload();
    await expect(html).toHaveClass(sombreAuDepart ? /^(?!.*\bdark\b)/ : /\bdark\b/);
  });
});

test.describe("QCM", () => {
  const qcm = qcms[0];
  const total = qcm.questions.length;

  /* Répond à chaque question : `choix(question, i)` donne l'indice choisi. */
  async function repondre(page, choix) {
    for (const [i, q] of qcm.questions.entries()) {
      await expect(page.getByRole("heading", { name: q.enonce })).toBeVisible();
      const lettre = String.fromCharCode(65 + choix(q, i));
      await page.getByRole("button", { name: new RegExp(`^${lettre}\\.`) }).click();
    }
    await expect(page.getByRole("dialog", { name: "Terminer le questionnaire ?" })).toBeVisible();
    await page.getByRole("button", { name: "Voir mon résultat" }).click();
  }

  test("tout juste : le score est complet, et la révision n'est pas programmée", async ({ page, relais }) => {
    await entrerEnInvite(page);
    await aller(page, `/qcm/${qcm.id}`);
    await expect(page.getByRole("heading", { level: 1, name: qcm.titre })).toBeVisible();
    await repondre(page, (q) => q.bonne);

    await expect(page.getByText(`Tu as répondu correctement à ${total} questions sur ${total}.`)).toBeVisible();
    await expect(page.getByText("À refaire dans 2 jours")).toHaveCount(0);

    // Les statistiques envoyées : l'identifiant du QCM et les choix, rien de personnel.
    await expect.poll(() => relais.stats.length).toBe(1);
    expect(Object.keys(relais.stats[0]).sort()).toEqual(["qcm", "reponses"]);
    expect(relais.stats[0].reponses.map((r) => r.choix)).toEqual(qcm.questions.map((q) => q.bonne));
  });

  test("tout faux : le QCM revient dans 2 jours, et la progression le montre", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, `/qcm/${qcm.id}`);
    await repondre(page, (q) => (q.bonne + 1) % q.options.length);

    await expect(page.getByText(`Tu as répondu correctement à 0 question sur ${total}.`)).toBeVisible();
    await expect(page.getByText(/À refaire dans 2 jours/)).toBeVisible();

    await aller(page, "/progression");
    await expect(page.getByRole("heading", { level: 1, name: "Ma progression" })).toBeVisible();
    await expect(page.getByText(qcm.titre).first()).toBeVisible();
  });

  test("terminer avec des questions sans réponse prévient qu'elles comptent fausses", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, `/qcm/${qcm.id}`);
    await page.getByRole("button", { name: "Terminer le QCM" }).first().click();
    await expect(page.getByText(`Il reste ${total} questions sans réponse`)).toBeVisible();
    await page.getByRole("button", { name: "Continuer le QCM" }).click();
    await expect(page.getByRole("heading", { name: qcm.questions[0].enonce })).toBeVisible();
  });

  test("refuser les statistiques dans les paramètres : plus rien n'est envoyé", async ({ page, relais }) => {
    await entrerEnInvite(page);
    await page.evaluate(() => localStorage.setItem("lrsi-stats-refus", "1"));
    await aller(page, `/qcm/${qcm.id}`);
    await repondre(page, (q) => q.bonne);
    await expect(page.getByText(`sur ${total}.`)).toBeVisible();
    expect(relais.stats).toEqual([]);
  });
});

test.describe("exercice : ma réponse corrigée par l'IA", () => {
  const exercice = exercices.find((e) => e.indice && e.reponse);

  test("dit si c'est juste, montre la réponse saisie dans l'admin, propose l'indice après deux essais", async ({ page }) => {
    const envois = [];
    const verdicts = ["faux", "partiel", "juste"];
    await page.route(`${new URL(site.urlIA).origin}/corriger-exercice`, (route) => {
      const entetes = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: entetes });
      envois.push(route.request().postDataJSON());
      const verdict = verdicts[envois.length - 1];
      return route.fulfill({
        headers: entetes,
        json: { verdict, justes: verdict === "faux" ? [] : ["La méthode correspond au corrigé."], erreurs: verdict === "juste" ? [] : ["Le résultat final ne correspond pas au corrigé."] },
      });
    });

    await entrerEnInvite(page);
    await aller(page, `/exercices/${exercice.id}`);
    await expect(page.getByRole("heading", { name: "Vérifier ma réponse" })).toHaveCount(0);
    const champ = page.getByRole("textbox", { name: "Ta réponse à l'exercice" });
    const corriger = page.getByRole("button", { name: "Faire corriger par l'IA" });
    await expect(corriger).toBeDisabled();

    await champ.fill("64 hôtes");
    await corriger.click();
    await expect(page.getByRole("status").filter({ hasText: "Pas encore" })).toBeVisible();
    await expect(page.getByText("Le résultat final ne correspond pas au corrigé.")).toBeVisible();
    // La réponse attendue est celle de l'admin, affichée par le site.
    await expect(page.getByText("Réponse attendue", { exact: true })).toBeVisible();
    await expect(page.getByText(exercice.reponse.split("\n")[0].slice(0, 30), { exact: false }).first()).toBeVisible();
    // Ce qui part au relais : l'énoncé, le corrigé de l'auteur et la réponse.
    expect(envois[0]).toMatchObject({ reponse: "64 hôtes" });
    expect(envois[0].corrige).toContain(exercice.reponse.slice(0, 20));

    await page.getByRole("button", { name: "Refaire corriger" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Presque" })).toBeVisible();
    await page.getByRole("button", { name: "Affiche l'indice" }).click();
    await expect(page.getByText(exercice.indice)).toBeVisible();

    await champ.fill("62 hôtes");
    await page.getByRole("button", { name: "Refaire corriger" }).click();
    await expect(page.getByRole("status").filter({ hasText: "C'est juste !" })).toBeVisible();
  });
});

test.describe("exercice : répondre question par question, ou tout écrire", () => {
  const numerote = {
    id: "hotes-slash-27",
    titre: "Calculer le nombre d'hôtes d'un sous-réseau",
    matiere: "reseaux",
    difficulte: "Facile",
    duree: "10 min",
    tags: [],
    enonce: "Une entreprise reçoit l'adresse réseau 192.168.5.0/27.\n\n1. Quel est le masque en notation décimale ?\n2. Combien d'adresses utilisables ?\n3. Quelle est l'adresse de diffusion ?",
    indice: "",
    etapes: [],
    reponse: "1. 255.255.255.224\n2. 30\n3. 192.168.5.31",
    explication: "",
  };

  test("une case sous chaque question, et toutes les réponses partent ensemble", async ({ page, relais }) => {
    relais.contenu = { matieres, exercices: [...exercices, numerote], qcms, videos: [], examens: [], annales: [], ressources: [] };
    const envois = [];
    await page.route(`${new URL(site.urlIA).origin}/corriger-exercice`, (route) => {
      const entetes = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: entetes });
      envois.push(route.request().postDataJSON());
      return route.fulfill({ headers: entetes, json: { verdict: "partiel", justes: ["Le masque correspond."], erreurs: ["La question 2 ne correspond pas."] } });
    });

    await entrerEnInvite(page);
    await aller(page, `/exercices/${numerote.id}`);
    const choix = page.getByRole("group", { name: "Façon de répondre" });
    await expect(choix.getByRole("button", { name: "Répondre question par question" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Quel est le masque en notation décimale ?").last()).toBeVisible();

    const corriger = page.getByRole("button", { name: "Faire corriger par l'IA" });
    await expect(corriger).toBeDisabled();
    await page.getByRole("textbox", { name: "Ta réponse à la question 1" }).fill("255.255.255.224");
    await page.getByRole("textbox", { name: "Ta réponse à la question 2" }).fill("32");
    await corriger.click();
    await expect(page.getByRole("status").filter({ hasText: "Presque" })).toBeVisible();
    // Chaque réponse sous sa question ; la question laissée vide est signalée.
    expect(envois[0].reponse).toBe(
      "1. Quel est le masque en notation décimale ?\nRéponse : 255.255.255.224\n\n2. Combien d'adresses utilisables ?\nRéponse : 32\n\n3. Quelle est l'adresse de diffusion ?\nRéponse : (pas de réponse)"
    );

    // L'autre façon : une seule case, pour écrire ou coller toute la réponse.
    await choix.getByRole("button", { name: "Écrire ou coller ma réponse" }).click();
    await expect(page.getByRole("textbox", { name: "Ta réponse à la question 1" })).toHaveCount(0);
    await page.getByRole("textbox", { name: "Ta réponse à l'exercice" }).fill("Masque 255.255.255.224, 30 hôtes, diffusion 192.168.5.31");
    await page.getByRole("button", { name: "Refaire corriger" }).click();
    await expect.poll(() => envois.length).toBe(2);
    expect(envois[1].reponse).toBe("Masque 255.255.255.224, 30 hôtes, diffusion 192.168.5.31");
  });

  test("l'IA ne répond pas : la réponse attendue reste accessible", async ({ page }) => {
    // Le relais simulé d'e2e/outils.js répond 503 à la correction.
    const exercice = exercices.find((e) => e.reponse && !/^\s*1[.)]/m.test(e.enonce));
    await entrerEnInvite(page);
    await aller(page, `/exercices/${exercice.id}`);
    await page.getByRole("textbox", { name: "Ta réponse à l'exercice" }).fill("Une réponse.");
    await page.getByRole("button", { name: "Faire corriger par l'IA" }).click();
    await expect(page.getByRole("alert")).toBeVisible();

    const voir = page.getByRole("button", { name: "Voir la réponse attendue" });
    await voir.click();
    await expect(page.getByText("Réponse attendue", { exact: true })).toBeVisible();
    await expect(page.getByText(exercice.reponse.split("\n")[0].slice(0, 30), { exact: false }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Masquer la réponse attendue" })).toHaveAttribute("aria-expanded", "true");
  });

  test("un énoncé sans questions numérotées : seulement la grande case", async ({ page }) => {
    const sansNumeros = exercices.find((e) => e.reponse && !/^\s*1[.)]/m.test(e.enonce));
    await entrerEnInvite(page);
    await aller(page, `/exercices/${sansNumeros.id}`);
    await expect(page.getByRole("textbox", { name: "Ta réponse à l'exercice" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Façon de répondre" })).toHaveCount(0);
  });
});

test.describe("favoris", () => {
  test("un favori s'allume, reste après un rechargement, et s'éteint", async ({ page }) => {
    const exercice = exercices[0];
    await entrerEnInvite(page);
    await aller(page, `/exercices/${exercice.id}`);
    const favori = page.getByRole("button", { name: /aux favoris$/ }).first();
    await favori.click();
    await expect(page.getByRole("button", { name: /des favoris$/ }).first()).toHaveAttribute("aria-pressed", "true");
    // Toujours allumé après un rechargement ; un clic l'éteint, un autre le rallume.
    await page.reload();
    await expect(page.getByRole("button", { name: /des favoris$/ }).first()).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /des favoris$/ }).first().click();
    await expect(page.getByRole("button", { name: /aux favoris$/ }).first()).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: /aux favoris$/ }).first().click();
    await expect(page.getByRole("button", { name: /des favoris$/ }).first()).toHaveAttribute("aria-pressed", "true");

    await aller(page, "/favoris");
    await expect(page.getByText(exercice.titre).first()).toBeVisible();
    // La sauvegarde par fichier a disparu : les comptes la remplacent.
    await aller(page, "/parametres");
    await expect(page.getByRole("button", { name: "Télécharger ma sauvegarde" })).toHaveCount(0);
  });
});
