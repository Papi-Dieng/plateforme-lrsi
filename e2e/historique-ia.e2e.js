import { site } from "../src/data/site.js";
import { aller, entrerEnInvite, expect, test } from "./outils.js";

/* ==================================================================
   La barre latérale des discussions de l'assistant (src/conversations.js).
   Elle est toujours affichée sur un écran large ; sur téléphone, le
   bouton « Discussions » l'ouvre et elle se referme après un choix.
   L'IA est simulée : elle répond « Réponse n° N » et garde ce qu'elle
   reçoit, pour vérifier qu'une discussion rouverte repart avec ses
   échanges précédents.
   ================================================================== */

const RELAIS = new URL(site.urlIA).origin;

async function iaQuiRepond(page) {
  const demandes = [];
  await page.route(new RegExp(`^${RELAIS}/?$`), async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    demandes.push(route.request().postDataJSON());
    await route.fulfill({ headers: { "Access-Control-Allow-Origin": "*" }, json: { texte: `Réponse n° ${demandes.length}` } });
  });
  return demandes;
}

const saisie = (page) => page.getByLabel("Poser une question à l'assistant");
// La question se lit aussi dans la barre latérale (titre de la discussion) :
// on regarde le fil, pas la page entière.
const fil = (page) => page.getByRole("region", { name: "Conversation avec l'assistant" });
async function demander(page, texte, numero) {
  await saisie(page).fill(texte);
  await saisie(page).press("Enter");
  await expect(page.getByText(`Réponse n° ${numero}`)).toBeVisible();
}

// Sur téléphone la barre est un panneau à ouvrir ; sur ordinateur elle
// est déjà là.
const ouvrirBarre = async (page, isMobile) => {
  if (isMobile) await page.getByRole("button", { name: "Discussions" }).click();
};

test.describe("historique de l'assistant", () => {
  test("une discussion se garde, se rouvre, se continue avec ses échanges, et s'efface", async ({ page, isMobile }) => {
    const demandes = await iaQuiRepond(page);
    await entrerEnInvite(page);
    await aller(page, "/assistant");

    await demander(page, "Explique le modèle OSI", 1);
    // « Nouvelle discussion » vit dans la barre latérale.
    await ouvrirBarre(page, isMobile);
    await page.getByRole("button", { name: "Nouvelle discussion" }).click();
    await expect(page.getByText("Réponse n° 1")).toHaveCount(0);
    await demander(page, "Qu'est-ce qu'un VLAN ?", 2);

    // Un rechargement garde la discussion ouverte.
    await page.reload();
    await expect(fil(page).getByText("Qu'est-ce qu'un VLAN ?")).toBeVisible();

    await ouvrirBarre(page, isMobile);
    const panneau = page.getByRole("region", { name: "Historique des discussions" });
    const discussions = panneau.getByRole("listitem");
    await expect(discussions).toHaveCount(2);
    await expect(discussions.first()).toContainText("Qu'est-ce qu'un VLAN ?");

    await panneau.getByRole("button", { name: /^Explique le modèle OSI/ }).click();
    // Sur téléphone, choisir une discussion referme le panneau.
    if (isMobile) await expect(panneau).toHaveCount(0);
    await expect(page.getByText("Réponse n° 1")).toBeVisible();

    // La suite part avec l'échange précédent.
    await demander(page, "Et la couche 3 ?", 3);
    expect(demandes.at(-1).messages.map((m) => m.texte)).toEqual(["Explique le modèle OSI", "Réponse n° 1", "Et la couche 3 ?"]);

    await ouvrirBarre(page, isMobile);
    await panneau.getByRole("button", { name: "Supprimer la discussion « Qu'est-ce qu'un VLAN ? »" }).click();
    await expect(discussions).toHaveCount(1);
    if (isMobile) {
      await page.keyboard.press("Escape");
      await expect(panneau).toHaveCount(0);
    }
  });
});
