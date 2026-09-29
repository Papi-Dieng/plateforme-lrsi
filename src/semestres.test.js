import { describe, expect, test } from "vitest";
import { matieres } from "./data/matieres";
import { normaliserSemestre, numerosSemestre } from "./semestres";

describe("semestres : seulement le 1 et le 2", () => {
  test.each([
    ["Semestre 1", "Semestre 1"],
    ["semestre 2", "Semestre 2"],
    ["Semestres 1 et 2", "Semestres 1 et 2"],
    ["Semestre 3", "Semestres 1 et 2"],
    ["Semestre 5", "Semestres 1 et 2"],
    ["Semestres 3 et 4", "Semestres 1 et 2"],
    ["", "Semestres 1 et 2"],
    [undefined, "Semestres 1 et 2"],
  ])("« %s » → « %s »", (entree, attendu) => {
    expect(normaliserSemestre(entree)).toBe(attendu);
  });

  test("aucune matière du contenu par défaut n'est hors des semestres 1 et 2", () => {
    for (const m of matieres) {
      expect(numerosSemestre(m.semestre).every((n) => n === 1 || n === 2), m.id).toBe(true);
      expect(normaliserSemestre(m.semestre)).toBe(m.semestre);
    }
  });
});
