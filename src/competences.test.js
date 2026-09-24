import { describe, expect, test } from "vitest";
import {
  MINIMUM_REPONSES,
  SEUIL_FAIBLESSE,
  SEUIL_FORCE,
  analyserCompetences,
  faiblesses,
  forces,
  modulesAAmeliorer,
  nonEvaluees,
  reponsesEnregistrees,
} from "./competences";
import { competences } from "./data/competences";

/* Des scores comme ceux de `lrsi-scores` : `justes` bonnes réponses sur
   `total` pour une compétence, dans un QCM. */
const reponses = (competence, justes, total) =>
  Array.from({ length: total }, (_, i) => ({ competence, correct: i < justes }));
const scores = (...qcms) => Object.fromEntries(qcms.map((detail, i) => [`qcm-${i}`, { detail }]));

const [A, B, C] = competences;
const trouver = (analyse, id) => analyse.find((c) => c.id === id);

describe("analyserCompetences", () => {
  test("rend une ligne par compétence, même sans aucun score", () => {
    const analyse = analyserCompetences({});
    expect(analyse).toHaveLength(competences.length);
    expect(analyse.every((c) => c.niveau === "non-evaluee" && c.taux === null)).toBe(true);
  });

  test(`aucun verdict sous ${MINIMUM_REPONSES} réponses`, () => {
    const c = trouver(analyserCompetences(scores(reponses(A.id, 0, MINIMUM_REPONSES - 1))), A.id);
    expect(c).toMatchObject({ evaluee: false, niveau: "non-evaluee", manquantes: 1, taux: 0 });
  });

  test("les seuils de force et de faiblesse", () => {
    const niveau = (justes, total) => trouver(analyserCompetences(scores(reponses(A.id, justes, total))), A.id).niveau;
    expect(niveau(8, 10)).toBe("force");
    expect(niveau(7, 10)).toBe("a-consolider");
    expect(niveau(5, 10)).toBe("a-consolider");
    expect(niveau(4, 10)).toBe("faiblesse");
    expect(SEUIL_FORCE).toBeGreaterThan(SEUIL_FAIBLESSE);
  });

  test("additionne les réponses de plusieurs QCM", () => {
    const c = trouver(analyserCompetences(scores(reponses(A.id, 2, 2), reponses(A.id, 1, 2))), A.id);
    expect(c).toMatchObject({ justes: 3, total: 4, taux: 75 });
  });

  test("ignore les réponses sans compétence ou d'une compétence inconnue", () => {
    const analyse = analyserCompetences(scores([{ correct: true }, { competence: "inconnue", correct: true }]));
    expect(reponsesEnregistrees(analyse)).toBe(0);
  });

  test("un score sans détail ne casse rien", () => {
    expect(() => analyserCompetences({ ancien: { meilleur: 3 } })).not.toThrow();
    expect(() => analyserCompetences(null)).not.toThrow();
  });
});

describe("forces, faiblesses et modules à améliorer", () => {
  const analyse = analyserCompetences(
    scores(reponses(A.id, 1, 5), reponses(B.id, 3, 5), reponses(C.id, 5, 5))
  );

  test("classe chaque compétence évaluée", () => {
    expect(forces(analyse).map((c) => c.id)).toEqual([C.id]);
    expect(faiblesses(analyse).map((c) => c.id)).toEqual([A.id, B.id]);
    expect(nonEvaluees(analyse)).toHaveLength(competences.length - 3);
  });

  test("les chapitres à relire viennent des compétences fragiles, sans doublon", () => {
    const modules = modulesAAmeliorer(analyse);
    const cles = modules.map((m) => m.cle);
    expect(new Set(cles).size).toBe(cles.length);
    expect(modules[0]).toMatchObject({ motif: A.nom, taux: 20 });
    for (const m of modules) expect([...A.chapitres, ...B.chapitres]).toContain(m.chapitre);
  });

  test("une force ne donne aucun chapitre à relire", () => {
    const seulementForte = analyserCompetences(scores(reponses(C.id, 5, 5)));
    expect(modulesAAmeliorer(seulementForte)).toEqual([]);
  });
});
