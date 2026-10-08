import { describe, expect, test } from "vitest";
import { composerExamenBlanc, lireReglages, melanger, questionsDisponibles } from "./examenBlanc";

const qcms = [
  { id: "a", matiere: "reseaux", questions: [{ enonce: "A1" }, { enonce: "A2" }, { enonce: "A3" }] },
  { id: "b", matiere: "bdd", questions: [{ enonce: "B1" }, { enonce: "B2" }] },
];

describe("examen blanc", () => {
  test("les questions gardent la matière et le QCM d'où elles viennent", () => {
    expect(questionsDisponibles(qcms, ["bdd"])).toEqual([
      { enonce: "B1", matiere: "bdd", source: "b" },
      { enonce: "B2", matiere: "bdd", source: "b" },
    ]);
    expect(questionsDisponibles(qcms)).toHaveLength(5);
  });

  test("le mélange garde toutes les questions, sans doublon", () => {
    const m = melanger([1, 2, 3, 4, 5], () => 0.3);
    expect([...m].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test("le nombre est borné par ce qui existe, et la durée suit (1 min par question)", () => {
    const e = composerExamenBlanc(qcms, { matieres: ["reseaux"], n: 99 });
    expect(e.questions).toHaveLength(3);
    expect(e.duree).toBe("3 min");
    expect(e.matiere).toBe("reseaux");
    expect(new Set(e.questions.map((q) => q.enonce)).size).toBe(3);
  });

  test("plusieurs matières : pas de matière unique ; aucune question : rien", () => {
    const e = composerExamenBlanc(qcms, { n: 5 }, () => 0.5);
    expect(e.matiere).toBeNull();
    expect(e.matieres.sort()).toEqual(["bdd", "reseaux"]);
    expect(composerExamenBlanc(qcms, { matieres: ["securite"] })).toBeNull();
  });

  test("les réglages de l'adresse ignorent les matières inconnues", () => {
    const r = lireReglages(new URLSearchParams("m=reseaux,inconnue,reseaux&n=12"), [{ id: "reseaux" }, { id: "bdd" }]);
    expect(r).toEqual({ matieres: ["reseaux"], n: 12 });
    expect(lireReglages(new URLSearchParams(""), []).n).toBe(20);
  });
});
