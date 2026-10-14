import { describe, expect, test } from "vitest";
import { afficherMoyenne, dateAvis, preparerAvis, resumerAvis } from "./avis";

describe("date d'un avis", () => {
  const maintenant = new Date(2026, 9, 14, 21, 0);
  test("en jours du calendrier", () => {
    expect(dateAvis(new Date(2026, 9, 14, 8, 0).toISOString(), maintenant)).toBe("aujourd'hui");
    expect(dateAvis(new Date(2026, 9, 13, 23, 59).toISOString(), maintenant)).toBe("hier");
    expect(dateAvis(new Date(2026, 9, 10, 12, 0).toISOString(), maintenant)).toBe("il y a 4 jours");
    expect(dateAvis(new Date(2026, 9, 1, 12, 0).toISOString(), maintenant)).toBe("1 oct. 2026");
  });

  test("une date illisible ne s'affiche pas", () => {
    expect(dateAvis("pas une date", maintenant)).toBe("");
  });
});

describe("préparer un avis", () => {
  test("sans note, rien ne part", () => {
    expect(preparerAvis({ aime: "Les QCM" }).erreur).toMatch(/note/);
    expect(preparerAvis({ note: 0, aime: "Les QCM" }).erreur).toMatch(/note/);
    expect(preparerAvis({ note: 6, aime: "Les QCM" }).erreur).toMatch(/note/);
    expect(preparerAvis({ note: 4.5, aime: "Les QCM" }).erreur).toMatch(/note/);
  });

  test("une note seule ne suffit pas : il faut au moins une phrase", () => {
    expect(preparerAvis({ note: 5, aime: "   ", propose: "" }).erreur).toMatch(/phrase/);
    expect(preparerAvis({ note: 5, propose: "Un mode nuit" }).avis.propose).toBe("Un mode nuit");
  });

  test("les textes sont nettoyés et bornés comme dans la base", () => {
    const { avis } = preparerAvis({ note: "4", aime: "  Les corrigés  ", prenom: "  Awa   Diop ", niveau: "L2", propose: "x".repeat(900) });
    expect(avis).toMatchObject({ note: 4, aime: "Les corrigés", prenom: "Awa Diop", niveau: "L2" });
    expect(avis.propose).toHaveLength(600);
  });

  test("un niveau inconnu est ignoré, jamais envoyé", () => {
    expect(preparerAvis({ note: 3, aime: "Bien", niveau: "Doctorat" }).avis.niveau).toBe("");
  });
});

describe("résumer les avis", () => {
  test("aucun avis", () => {
    expect(resumerAvis([])).toEqual({
      nombre: 0,
      moyenne: 0,
      repartition: [5, 4, 3, 2, 1].map((note) => ({ note, nombre: 0 })),
      propositions: 0,
    });
    expect(resumerAvis(null).nombre).toBe(0);
  });

  test("moyenne arrondie au dixième, répartition de 5 à 1, propositions comptées", () => {
    const r = resumerAvis([
      { note: 5, propose: "Plus de vidéos" },
      { note: 5, propose: "" },
      { note: 4, propose: "  " },
      { note: 3, propose: "Un forum par matière" },
    ]);
    expect(r.nombre).toBe(4);
    expect(r.moyenne).toBe(4.3);
    expect(r.repartition.map((x) => x.nombre)).toEqual([2, 1, 1, 0, 0]);
    expect(r.propositions).toBe(2);
    expect(afficherMoyenne(r.moyenne)).toBe("4,3");
  });

  test("une ligne mal formée ne fausse pas la moyenne", () => {
    expect(resumerAvis([{ note: 5 }, { note: 9 }, null, { note: "4" }]).moyenne).toBe(5);
  });
});
