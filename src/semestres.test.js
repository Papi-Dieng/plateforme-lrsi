import { describe, expect, test } from "vitest";
import { matieres } from "./data/matieres";
import { chapitresDuSemestre, normaliserChapitres, semestreChapitre, semestresMatiere } from "./semestres";

const ch = (titre, semestre) => ({ titre, ...(semestre !== undefined && { semestre }) });

describe("semestres : le 1 et le 2, séparés, chapitre par chapitre", () => {
  test("un semestre écrit sur le chapitre est gardé (1 ou 2 seulement)", () => {
    expect(semestreChapitre(ch("a", 2), 0, 4)).toBe(2);
    expect(semestreChapitre(ch("a", "Semestre 1"), 3, 4)).toBe(1);
  });

  test("sans semestre : celui de la matière s'il n'y en a qu'un", () => {
    expect(semestreChapitre(ch("a"), 0, 4, "Semestre 2")).toBe(2);
  });

  test("sinon, ou si le semestre est hors 1 et 2 : première moitié au 1, le reste au 2", () => {
    const semestres = [0, 1, 2, 3, 4].map((i) => semestreChapitre(ch("x", i === 4 ? "Semestre 3" : undefined), i, 5, "Semestres 1 et 2"));
    expect(semestres).toEqual([1, 1, 1, 2, 2]);
  });

  test("normaliser : chaque chapitre a son semestre, la matière n'en a plus", () => {
    const m = normaliserChapitres({ id: "m", semestre: "Semestres 1 et 2", chapitres: [ch("a"), ch("b", 1), ch("c"), ch("d")] });
    expect(m.chapitres.map((c) => c.semestre)).toEqual([1, 1, 2, 2]);
    expect(m).not.toHaveProperty("semestre");
    expect(semestresMatiere(m)).toEqual([1, 2]);
    expect(chapitresDuSemestre(m, 2).map((c) => c.titre)).toEqual(["c", "d"]);
  });

  test("une matière sans chapitre du semestre 2 n'est que du semestre 1", () => {
    expect(semestresMatiere({ chapitres: [ch("a", 1)] })).toEqual([1]);
  });

  test("contenu par défaut : chaque chapitre est au semestre 1 ou 2, chaque matière a les deux", () => {
    for (const m of matieres) {
      expect(m.chapitres.every((c) => c.semestre === 1 || c.semestre === 2), m.id).toBe(true);
      expect(semestresMatiere(m), m.id).toEqual([1, 2]);
    }
  });
});
