import { examens } from "../src/data/examens.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   Un devoir en conditions réelles, et un programme de révision composé
   pour une session d'examens. L'horloge de la page est fixée : les
   dates calculées (créneaux, jours d'examen) ne dépendent pas du jour
   où le test tourne.
   ================================================================== */

// Un jeudi, avant les créneaux du soir (18 h – 20 h par défaut).
const JEUDI = new Date("2026-09-24T08:00:00Z");

test.describe("devoir", () => {
  const devoir = examens[0];
  const total = devoir.parties.reduce((n, p) => n + p.points, 0);

  test("consignes, sujet et minuteur, corrigé à la fin, puis auto-correction", async ({ page }) => {
    await page.clock.install({ time: JEUDI });
    await entrerEnInvite(page);
    await aller(page, `/examens/${devoir.id}`);
    await expect(page.getByRole("heading", { level: 1, name: devoir.titre })).toBeVisible();

    // Avant de commencer : les consignes, ni sujet ni corrigé.
    await expect(page.getByText(devoir.consignes)).toBeVisible();
    await expect(page.getByText(devoir.parties[0].titre)).toHaveCount(0);

    await page.getByRole("button", { name: "Commencer le devoir" }).click();
    await expect(page.getByText(devoir.parties[0].titre)).toBeVisible();
    await expect(page.getByText(/^\d{1,2}:\d{2}(:\d{2})?$/).first()).toBeVisible();
    // Le corrigé reste caché pendant l'épreuve.
    await expect(page.getByText("Corrigé", { exact: true })).toHaveCount(0);

    // Le temps imparti s'écoule : le minuteur le dit, sans rien fermer.
    await page.clock.fastForward((devoir.dureeMinutes + 1) * 60 * 1000);
    await expect(page.getByText("Temps écoulé")).toBeVisible();

    await page.getByRole("button", { name: "Terminer et voir le corrigé" }).click();
    await expect(page.getByText("Corrigé", { exact: true })).toHaveCount(devoir.parties.length);

    // L'étudiant se note partie par partie, sans dépasser le barème.
    const points = page.getByRole("spinbutton", { name: "Mes points" });
    await expect(points).toHaveCount(devoir.parties.length);
    await points.nth(0).fill(String(devoir.parties[0].points + 10));
    await points.nth(1).fill("5");
    const attendu = devoir.parties[0].points + 5;
    await expect(page.getByText("Ma note, d'après mon auto-correction").locator("..")).toContainText(`${attendu} / ${total}`);
  });

  test("les réponses s'écrivent pendant le devoir, et l'IA les corrige une fois terminé", async ({ page }) => {
    const envois = [];
    // Cette route passe avant celle d'e2e/outils.js, qui refuserait l'IA.
    await page.route(/\/corriger-exercice$/, (route) => {
      const entetes = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: entetes });
      envois.push(route.request().postDataJSON());
      return route.fulfill({ headers: entetes, json: { verdict: "partiel", justes: ["Les sept couches correspondent au corrigé."], erreurs: ["La question 2 ne correspond pas."] } });
    });
    await entrerEnInvite(page);
    await aller(page, `/examens/${devoir.id}`);
    await page.getByRole("button", { name: "Commencer le devoir" }).click();

    // Pendant l'épreuve : une case par question, pas encore de correction.
    const partie = page.locator("section").filter({ hasText: devoir.parties[0].titre });
    const reponse1 = partie.getByRole("textbox", { name: "Ta réponse à la question 1" });
    await reponse1.fill("Physique, liaison, réseau, transport, session, présentation, application.");
    await expect(page.getByRole("button", { name: "Faire corriger par l'IA" })).toHaveCount(0);

    // Terminé : les réponses sont toujours là, et toutes se font corriger
    // d'un coup, sans bouton à cliquer partie par partie.
    await page.getByRole("button", { name: "Terminer et voir le corrigé" }).click();
    await expect(reponse1).toHaveValue("Physique, liaison, réseau, transport, session, présentation, application.");
    await expect(partie.getByRole("status").filter({ hasText: "Presque" })).toBeVisible();
    await expect(partie.getByText("La question 2 ne correspond pas.")).toBeVisible();
    await expect(partie.getByRole("button", { name: "Faire corriger par l'IA" })).toHaveCount(0);
    expect(envois).toHaveLength(1);
    expect(envois[0]).toMatchObject({ enonce: devoir.parties[0].enonce, corrige: devoir.parties[0].corrige });
    expect(envois[0].reponse).toContain("Réponse : Physique, liaison, réseau");
    // La note se remplit seule (presque juste = la moitié), et reste modifiable.
    const points = partie.getByRole("spinbutton", { name: "Mes points" });
    await expect(points).toHaveValue(String(devoir.parties[0].points / 2));
    await expect(page.getByText("Ma note, proposée par l'IA").locator("..")).toContainText(`${devoir.parties[0].points / 2} / ${total}`);
    await points.fill("1");
    await expect(page.getByText(/^Ma note, /).locator("..")).toContainText(`1 / ${total}`);
  });

  test("la façon de répondre se choisit avant de commencer, pour toutes les parties", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, `/examens/${devoir.id}`);
    const choix = page.getByRole("group", { name: "Façon de répondre" });
    await expect(choix).toHaveCount(1);
    await choix.getByRole("button", { name: "Écrire ou coller ma réponse" }).click();
    await page.getByRole("button", { name: "Commencer le devoir" }).click();

    // Plus de choix pendant l'épreuve, et une seule grande case par partie.
    await expect(page.getByRole("group", { name: "Façon de répondre" })).toHaveCount(0);
    await expect(page.getByRole("textbox", { name: "Ta réponse à la question 1" })).toHaveCount(0);
    for (let i = 1; i <= devoir.parties.length; i++) {
      await expect(page.getByRole("textbox", { name: `Ta réponse à la partie ${i}` })).toBeVisible();
    }
  });

  test("sans IA, la correction échoue proprement et le corrigé reste là", async ({ page }) => {
    await entrerEnInvite(page);
    await aller(page, `/examens/${devoir.id}`);
    await page.getByRole("button", { name: "Commencer le devoir" }).click();
    const partie = page.locator("section").filter({ hasText: devoir.parties[0].titre });
    await partie.getByRole("textbox", { name: "Ta réponse à la question 1" }).fill("Une réponse.");
    await page.getByRole("button", { name: "Terminer et voir le corrigé" }).click();
    // La correction automatique échoue : on le dit, et on peut relancer.
    await expect(partie.getByRole("alert")).toBeVisible();
    await partie.getByRole("button", { name: "Faire corriger par l'IA" }).click();
    await expect(partie.getByRole("alert")).toBeVisible();
    await expect(partie.getByRole("button", { name: "Faire corriger par l'IA" })).toBeEnabled();
    await expect(page.getByText("Corrigé", { exact: true }).first()).toBeVisible();
  });
});

test.describe("programme de révision", () => {
  test("sans IA, le site répartit les séances lui-même, et elles entrent dans l'emploi du temps", async ({ page }) => {
    await page.clock.install({ time: JEUDI });
    await entrerEnInvite(page);
    await aller(page, "/planning");

    await page.getByRole("button", { name: "Créer mon programme avec l'IA" }).first().click();
    const assistant = page.getByRole("dialog", { name: "Créer mon programme avec l'IA" });
    await expect(assistant).toBeVisible();

    // Étape 1 : la session proposée par défaut (dans deux semaines, un examen).
    await assistant.getByRole("button", { name: "Suivant" }).click();
    // Étape 2 : les disponibilités par défaut, puis la génération.
    await assistant.getByRole("button", { name: "Générer mon programme" }).click();

    // Le relais simulé refuse l'IA : répartition automatique, annoncée.
    await expect(assistant.getByText("L'IA n'a pas pu répondre : le site a réparti les séances lui-même")).toBeVisible();
    await expect(assistant.getByText("Proposé par l'IA.")).toHaveCount(0);
    // L'examen proposé par défaut : dans deux semaines, à 8 h.
    await expect(assistant.getByText("Tes examens")).toBeVisible();
    await expect(assistant.getByRole("listitem").filter({ hasText: "Jeudi 8 octobre à 08:00" })).toBeVisible();

    await assistant.getByRole("button", { name: "Ajouter à mon emploi du temps" }).click();
    await expect(assistant).toBeHidden();

    // Enregistré dans le navigateur : l'examen et des séances de révision
    // placées avant lui, dans les créneaux du soir ou du samedi matin.
    const planning = await page.evaluate(() => JSON.parse(localStorage.getItem("lrsi-planning")));
    const examen = planning.evenements.find((e) => e.categorie === "Examen");
    const seances = planning.evenements.filter((e) => e.categorie === "Révision");
    expect(examen).toBeTruthy();
    expect(seances.length).toBeGreaterThan(0);
    for (const s of seances) {
      expect(s.jour < examen.jour, `séance du ${s.jour} avant l'examen du ${examen.jour}`).toBe(true);
      // Créneaux par défaut : 18 h – 20 h en semaine, 9 h – 12 h le samedi.
      expect(s.debut >= "18:00" || (s.debut >= "09:00" && s.fin <= "12:00"), `séance à ${s.debut}`).toBe(true);
      expect(s.genere).toBe(examen.genere);
    }

    // Toujours là après un rechargement, dans la vue Liste.
    await page.reload();
    await page.getByRole("tab", { name: "Liste", exact: true }).click();
    await expect(page.getByText(examen.titre).first()).toBeVisible();
  });
});
