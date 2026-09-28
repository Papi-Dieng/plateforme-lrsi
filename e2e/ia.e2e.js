import AxeBuilder from "@axe-core/playwright";
import { site } from "../src/data/site.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   La zone de saisie de l'assistant (components/SaisieIA.jsx) et
   l'animation d'attente de l'IA (components/ChargementIA.jsx).

   L'IA est simulée : sa réponse n'arrive que quand le test la libère.
   La reconnaissance vocale du navigateur est retirée par défaut (le
   bouton rond est alors « Envoyer ») ; le test de la dictée la remplace
   par une fausse, qui « entend » une phrase.
   ================================================================== */

const RELAIS = new URL(site.urlIA).origin;
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

/* Une IA qui répond quand on appelle `liberer()`. Cette route passe
   avant celle d'e2e/outils.js, qui refuserait l'IA. */
async function iaEnAttente(page, reponse) {
  let liberer;
  const feu = new Promise((r) => (liberer = r));
  const demandes = [];
  await page.route(new RegExp(`^${RELAIS}/?$`), async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    demandes.push(route.request().postDataJSON());
    await feu;
    await route.fulfill({ headers: { "Access-Control-Allow-Origin": "*" }, json: reponse }).catch(() => {});
  });
  return { liberer: () => liberer(), demandes };
}

const saisie = (page) => page.getByLabel("Poser une question à l'assistant");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.__dicteeSimulee) {
      delete window.SpeechRecognition;
      delete window.webkitSpeechRecognition;
    }
  });
});

async function ouvrir(page) {
  await entrerEnInvite(page);
  await aller(page, "/assistant");
  await expect(saisie(page)).toBeVisible();
}

test.describe("saisie", () => {
  test("Entrée envoie, Maj + Entrée va à la ligne, rien ne part à vide", async ({ page }) => {
    const ia = await iaEnAttente(page, { texte: "Réponse." });
    await ouvrir(page);

    await expect(page.getByRole("button", { name: "Envoyer" })).toBeDisabled();
    await saisie(page).press("Enter");
    expect(ia.demandes).toEqual([]);

    await saisie(page).fill("Première ligne");
    await saisie(page).press("Shift+Enter");
    await saisie(page).pressSequentially("seconde ligne");
    await expect(saisie(page)).toHaveValue("Première ligne\nseconde ligne");
    await saisie(page).press("Enter");

    await expect(saisie(page)).toHaveValue("");
    await expect.poll(() => ia.demandes.length).toBe(1);
    expect(ia.demandes[0].messages.at(-1).texte).toBe("Première ligne\nseconde ligne");
    expect(ia.demandes[0]).not.toHaveProperty("image");
    ia.liberer();
  });

  test("la zone s'agrandit avec la question, jusqu'à une limite", async ({ page }) => {
    await ouvrir(page);
    const hauteur = () => saisie(page).evaluate((e) => e.getBoundingClientRect().height);
    const depart = await hauteur();
    await saisie(page).fill(Array.from({ length: 5 }, (_, i) => `Ligne ${i + 1}`).join("\n"));
    expect(await hauteur()).toBeGreaterThan(depart);
    await saisie(page).fill(Array.from({ length: 60 }, (_, i) => `Ligne ${i + 1}`).join("\n"));
    expect(await hauteur()).toBeLessThanOrEqual(240);
  });
});

test.describe("raccourcis", () => {
  test("« Un exercice » oriente la réponse, et le message le montre", async ({ page }) => {
    const ia = await iaEnAttente(page, { texte: "Voici un exercice." });
    await ouvrir(page);

    const raccourci = page.getByRole("button", { name: "Un exercice", exact: true });
    await raccourci.click();
    await expect(raccourci).toHaveAttribute("aria-pressed", "true");
    await expect(saisie(page)).toHaveAttribute("placeholder", "Un exercice sur quel sujet ?");

    await saisie(page).fill("les sous-réseaux");
    await saisie(page).press("Enter");

    const bulle = page.locator("p").filter({ hasText: "les sous-réseaux" }).last();
    await expect(bulle).toContainText("Un exercice");
    await expect.poll(() => ia.demandes.length).toBe(1);
    expect(ia.demandes[0].messages.at(-1).texte).toMatch(/^Propose-moi un exercice.*sur : les sous-réseaux$/);

    // Un second clic enlève le raccourci.
    await raccourci.click();
    await expect(raccourci).toHaveAttribute("aria-pressed", "false");
    ia.liberer();
  });
});

test.describe("arrêter la réponse", () => {
  test("le bouton rond devient Stop, et arrête vraiment la demande", async ({ page }) => {
    await iaEnAttente(page, { texte: "Trop tard." });
    await ouvrir(page);
    await saisie(page).fill("Explique le routage");
    await saisie(page).press("Enter");

    const stop = page.getByRole("button", { name: "Arrêter la réponse" });
    await expect(stop).toBeVisible();
    await stop.click();

    await expect(page.getByText("Tu as arrêté la réponse.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Arrêter la réponse" })).toHaveCount(0);
    await expect(page.getByText("Trop tard.")).toHaveCount(0);
  });
});

test.describe("image jointe", () => {
  const choisir = (page, fichier) => page.locator('input[type="file"][accept="image/*"]').setInputFiles(fichier);
  const image = (nom) => ({ name: nom, mimeType: "image/png", buffer: PNG });

  test("joindre, agrandir, retirer, puis envoyer : l'image part avec la question", async ({ page }) => {
    const ia = await iaEnAttente(page, { texte: "Je lis un point blanc.", image: "lue" });
    await ouvrir(page);

    await choisir(page, image("schema.png"));
    await page.getByRole("button", { name: "Agrandir l'image jointe : schema.png" }).click();
    await expect(page.getByRole("dialog", { name: "Image jointe" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Image jointe" })).toHaveCount(0);

    await page.getByRole("button", { name: "Retirer l'image" }).click();
    await expect(page.getByRole("button", { name: /Agrandir l'image/ })).toHaveCount(0);

    // Une image seule suffit pour envoyer.
    await choisir(page, image("schema.png"));
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("img", { name: "Image jointe : schema.png" })).toBeVisible();
    await expect.poll(() => ia.demandes.length).toBe(1);
    const envoi = ia.demandes[0];
    expect(envoi.image.type).toBe("image/jpeg");
    expect(envoi.image.donnees).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(envoi.messages.at(-1).texte).toBe("Que montre cette image ? Explique-la-moi.");

    ia.liberer();
    await expect(page.getByText("Je lis un point blanc.")).toBeVisible();
    await expect(page.getByText("L'image n'a pas été lue")).toHaveCount(0);
  });

  test("si le relais n'est pas encore à jour, la page le dit au lieu de faire comme si", async ({ page }) => {
    const ia = await iaEnAttente(page, { texte: "Réponse sans l'image." });
    await ouvrir(page);
    await choisir(page, image("photo.png"));
    await saisie(page).fill("Corrige mon exercice");
    await saisie(page).press("Enter");
    ia.liberer();
    await expect(page.getByText("L'image n'a pas été lue")).toBeVisible();
  });

  test("un fichier qui n'est pas une image est refusé", async ({ page }) => {
    await ouvrir(page);
    await choisir(page, { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("bonjour") });
    await expect(page.getByRole("alert")).toHaveText("Ce fichier n'est pas une image.");
  });
});

test.describe("dictée", () => {
  test.beforeEach(async ({ page }) => {
    // Une fausse reconnaissance vocale : elle « entend » une phrase, en
    // deux temps comme la vraie, puis s'arrête quand on le lui demande.
    await page.addInitScript(() => {
      window.__dicteeSimulee = true;
      window.webkitSpeechRecognition = class {
        start() {
          const resultat = (texte) => ({ results: [[{ transcript: texte }]] });
          setTimeout(() => this.onresult?.(resultat("qu'est-ce qu'un")), 200);
          setTimeout(() => this.onresult?.(resultat("qu'est-ce qu'un VLAN")), 400);
        }
        stop() {
          setTimeout(() => this.onend?.(), 50);
        }
        abort() {
          this.onend?.();
        }
      };
    });
  });

  test("le micro remplace Envoyer quand le champ est vide, et écrit ce qui est dit", async ({ page }) => {
    await ouvrir(page);
    await page.getByRole("button", { name: "Dicter ma question" }).click();
    await expect(page.getByText("Parle, j'écris ta question")).toBeVisible();
    await expect(page.getByText("qu'est-ce qu'un VLAN").first()).toBeVisible();

    await page.getByRole("button", { name: "Arrêter la dictée" }).click();
    await expect(saisie(page)).toHaveValue("qu'est-ce qu'un VLAN");
    await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  });
});

test.describe("attente de l'IA", () => {
  // L'horloge du test est simulée : le défilement en douceur du navigateur
  // ne s'y déroulerait pas. Avec « réduire les animations », le fil descend
  // d'un coup, comme pour les étudiants qui ont choisi ce réglage.
  test.use({ reducedMotion: "reduce" });

  test("les étapes défilent pendant l'attente, puis laissent place à la réponse", async ({ page }) => {
    await page.clock.install();
    const ia = await iaEnAttente(page, { texte: "Le modèle OSI compte sept couches." });
    await ouvrir(page);
    await saisie(page).fill("Explique-moi le modèle OSI");
    await saisie(page).press("Enter");

    const etape = page.getByRole("status").filter({ hasText: "…" }).first();
    await expect(etape).toHaveText("Recherche dans la plateforme…");
    await expect(page.getByRole("button", { name: "Arrêter la réponse" })).toBeVisible();

    // Le contrôle d'accessibilité passe aussi pendant l'animation.
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);

    // Le fil descend jusqu'à l'attente, même sur téléphone.
    await expect(etape).toBeInViewport();
    await page.clock.runFor(4000);
    await expect(etape).toHaveText("Préparation de la demande…");

    ia.liberer();
    await expect(page.getByText("Le modèle OSI compte sept couches.")).toBeVisible();
    await expect(page.getByText("Préparation de la demande…")).toHaveCount(0);
  });
});
