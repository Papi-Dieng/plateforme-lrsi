import { describe, expect, test } from "vitest";
import { composerQcmGeneral, melanger, questionsDisponibles } from "./qcmGeneral";

const qcms = [
  { id: "a", matiere: "reseaux", questions: [{ enonce: "A1" }, { enonce: "A2" }, { enonce: "A3" }] },
  { id: "b", matiere: "bdd", questions: [{ enonce: "B1" }, { enonce: "B2" }] },
];

describe("QCM toutes matières", () => {
  test("les questions gardent la matière et le QCM d'où elles viennent", () => {
    expect(questionsDisponibles(qcms)).toHaveLength(5);
    expect(questionsDisponibles([qcms[1]])).toEqual([
      { enonce: "B1", matiere: "bdd", source: "b" },
      { enonce: "B2", matiere: "bdd", source: "b" },
    ]);
  });

  test("le mélange garde toutes les questions, sans doublon", () => {
    const m = melanger([1, 2, 3, 4, 5], () => 0.3);
    expect([...m].sort()).toEqual([1, 2, 3, 4, 5]);
  });

  test("le nombre est borné par ce qui existe, et la durée suit (1 min par question)", () => {
    const e = composerQcmGeneral(qcms, 99);
    expect(e.questions).toHaveLength(5);
    expect(e.duree).toBe("5 min");
    expect(e.tirage).toBe(true);
    expect(new Set(e.questions.map((q) => q.enonce)).size).toBe(5);
  });

  test("plusieurs matières : pas de matière unique ; aucune question : rien", () => {
    const e = composerQcmGeneral(qcms, 5, () => 0.5);
    expect(e.matiere).toBeNull();
    expect([...e.matieres].sort()).toEqual(["bdd", "reseaux"]);
    expect(composerQcmGeneral([], 5)).toBeNull();
  });

  test("une seule matière tirée : le questionnaire porte sa matière", () => {
    const e = composerQcmGeneral([qcms[0]], 2);
    expect(e.matiere).toBe("reseaux");
    expect(e.questions).toHaveLength(2);
  });
});
