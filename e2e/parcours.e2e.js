import { qcms } from "../src/data/qcm.js";
import { exercices } from "../src/data/exercices.js";
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
      await page.getByRole("button", { name: i + 1 < total ? "Enregistrer et suivant" : "Terminer le QCM" }).first().click();
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

test.describe("exercice : vérifier ma réponse", () => {
  const exercice = exercices.find((e) => e.verification?.length && e.indice);

  test("dit ce qui est juste sans donner la réponse, puis propose l'indice", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, `/exercices/${exercice.id}`);
    await expect(page.getByRole("heading", { name: "Vérifier ma réponse" })).toBeVisible();

    const champ = (l) => page.getByRole("textbox", { name: l.libelle });
    const verifier = page.getByRole("button", { name: "Vérifier", exact: true });
    await expect(verifier).toBeDisabled();

    // Une seule réponse juste, écrite autrement que la réponse attendue.
    const [premiere, ...autres] = exercice.verification;
    await champ(premiere).fill(` ${premiere.attendu.split("|").at(-1).trim().toUpperCase()} `);
    for (const l of autres) await champ(l).fill("0");
    await verifier.click();
    await expect(page.getByRole("status")).toHaveText(`1 sur ${exercice.verification.length} juste. Corrige ce qui est en rouge et revérifie.`);
    for (const l of autres) await expect(champ(l)).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(autres[0].attendu)).toHaveCount(0);

    // Deuxième essai raté : l'indice est proposé.
    await verifier.click();
    await expect(page.getByRole("button", { name: "Affiche l'indice" })).toBeVisible();

    // Tout juste.
    for (const l of autres) await champ(l).fill(l.attendu.split("|")[0].trim());
    await verifier.click();
    await expect(page.getByRole("status")).toContainText("Tout est juste, bravo !");
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
