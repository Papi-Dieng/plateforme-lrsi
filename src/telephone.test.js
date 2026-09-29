import { describe, expect, test } from "vitest";
import { afficherTelephone, emailTelephone, estEmailTelephone, normaliserTelephone } from "./telephone";

describe("numéros de téléphone", () => {
  test("un numéro sénégalais s'écrit de plusieurs façons, un seul compte", () => {
    for (const n of ["77 123 45 67", "771234567", "+221 77 123 45 67", "00221771234567", "77.123.45.67", "(77) 123-45-67"]) {
      expect(normaliserTelephone(n)).toBe("221771234567");
    }
  });

  test("un numéro étranger garde son indicatif", () => {
    expect(normaliserTelephone("+33 6 12 34 56 78")).toBe("33612345678");
  });

  test("ce qui n'est pas un numéro est refusé", () => {
    for (const n of ["", "abc", "12", "awa@exemple.com", "+221 77 12a 45 67", "1234567890123456"]) {
      expect(normaliserTelephone(n)).toBeNull();
    }
  });

  test("l'adresse fabriquée ne peut pas être une vraie boîte mail", () => {
    const email = emailTelephone("221771234567");
    expect(email).toBe("221771234567@telephone.sunu-cours.invalid");
    expect(estEmailTelephone(email)).toBe(true);
    expect(estEmailTelephone("awa@exemple.com")).toBe(false);
  });

  test("affichage lisible", () => {
    expect(afficherTelephone("221771234567")).toBe("+221 77 123 45 67");
    expect(afficherTelephone("33612345678")).toBe("+33612345678");
  });
});
