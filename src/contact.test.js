import { describe, expect, test } from "vitest";
import { lienGmail, lienWhatsApp } from "./contact";

describe("écrire à l'équipe", () => {
  test("Gmail : une rédaction avec destinataire, sujet et message", () => {
    const url = new URL(lienGmail({ sujet: "Contribution", corps: "Bonjour & merci" }, "equipe@exemple.com"));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(Object.fromEntries(url.searchParams)).toEqual({ view: "cm", fs: "1", to: "equipe@exemple.com", su: "Contribution", body: "Bonjour & merci" });
  });

  test("WhatsApp : le numéro sans « + » ni espaces, le texte encodé", () => {
    expect(lienWhatsApp("Bonjour ?", "+221 77 123 45 67")).toBe("https://wa.me/221771234567?text=Bonjour%20%3F");
  });

  test("WhatsApp sans numéro : pas de lien", () => {
    expect(lienWhatsApp("Bonjour", "")).toBeNull();
  });
});
