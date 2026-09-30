import { describe, expect, test } from "vitest";
import {
  DISCUSSIONS_MAX,
  MESSAGES_MAX,
  conversationsValides,
  enregistrer,
  listeConversations,
  messagesAGarder,
  titreConversation,
} from "./conversations";

const q = (id, texte, extra = {}) => ({ id, role: "etudiant", texte, ...extra });
const r = (id, extra = {}) => ({ id, role: "assistant", etat: "ia", texteIA: "Réponse", reponse: { liens: [], texte: [] }, ...extra });

describe("historique des discussions", () => {
  test("le titre : le début de la première question", () => {
    expect(titreConversation([q(1, "  Explique-moi   le modèle OSI ")])).toBe("Explique-moi le modèle OSI");
    expect(titreConversation([q(1, "x".repeat(100))])).toHaveLength(58);
    expect(titreConversation([])).toBe("Discussion");
  });

  test("une discussion sans question n'est pas gardée", () => {
    expect(enregistrer({}, { id: "a", messages: [], date: "2026-09-30" })).toEqual({});
  });

  test("les images ne sont pas gardées, seulement leur nom ; une réponse en attente devient interrompue", () => {
    const [question, reponse] = messagesAGarder([
      q(1, "Que montre ce schéma ?", { image: { nom: "schema.png", donnees: "AAAA", apercu: "blob:x" } }),
      r(2, { etat: "attente" }),
    ]);
    expect(question.image).toEqual({ nom: "schema.png", retiree: true });
    expect(reponse).toMatchObject({ etat: "secours", echec: "interrompu" });
  });

  test("seuls les derniers messages restent, en commençant par une question", () => {
    const messages = Array.from({ length: MESSAGES_MAX + 5 }, (_, i) => (i % 2 === 0 ? q(i + 1, `q${i}`) : r(i + 1)));
    const gardes = messagesAGarder(messages);
    expect(gardes.length).toBeLessThanOrEqual(MESSAGES_MAX);
    expect(gardes[0].role).toBe("etudiant");
  });

  test("les plus récentes d'abord, et pas plus de DISCUSSIONS_MAX", () => {
    let toutes = {};
    for (let i = 0; i < DISCUSSIONS_MAX + 3; i++) {
      toutes = enregistrer(toutes, { id: `c${i}`, messages: [q(1, `Question ${i}`), r(2)], date: `2026-09-${String(i + 1).padStart(2, "0")}` });
    }
    const liste = listeConversations(toutes);
    expect(liste).toHaveLength(DISCUSSIONS_MAX);
    expect(liste[0]).toMatchObject({ id: `c${DISCUSSIONS_MAX + 2}`, nombre: 1 });
    expect(liste.some((c) => c.id === "c0")).toBe(false);
    expect(conversationsValides(toutes)).toBe(true);
  });

  test("mettre à jour garde la même discussion", () => {
    let toutes = enregistrer({}, { id: "a", messages: [q(1, "Un")], date: "1" });
    toutes = enregistrer(toutes, { id: "a", messages: [q(1, "Un"), r(2), q(3, "Deux")], date: "2" });
    expect(Object.keys(toutes)).toEqual(["a"]);
    expect(toutes.a.messages).toHaveLength(3);
  });
});
