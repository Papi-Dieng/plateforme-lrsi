import { describe, expect, test } from "vitest";
import {
  MINIMUM_REPONSES,
  SEUIL_FAIBLESSE,
  SEUIL_FORCE,
  analyserMatieres,
  chapitresARevoir,
  couvertureMatieres,
  faiblesses,
  forces,
  nonEvaluees,
  reponsesEnregistrees,
} from "./analyseMatieres";

/* Deux matières, un QCM chacune, comme le contenu publié. */
const listeMatieres = [
  { id: "reseaux", nom: "Réseaux informatiques", nomCourt: "Réseaux", chapitres: [
    { titre: "OSI", statut: "disponible" },
    { titre: "IPv4", statut: "disponible" },
    { titre: "IPv6", statut: "bientot" },
  ] },
  { id: "systemes", nom: "Systèmes d'exploitation", nomCourt: "Systèmes", chapitres: [{ titre: "Processus", statut: "disponible" }] },
];
const listeQcm = [
  { id: "qcm-res", matiere: "reseaux", questions: [{}, {}, {}, {}] },
  { id: "qcm-sys", matiere: "systemes", questions: [{}, {}] },
];
const detail = (justes, total) => Array.from({ length: total }, (_, i) => ({ correct: i < justes }));
const analyser = (scores) => analyserMatieres(scores, { listeQcm, listeMatieres });
const trouver = (analyse, id) => analyse.find((m) => m.id === id);

describe("analyserMatieres", () => {
  test("une ligne par matière, même sans aucun score", () => {
    const analyse = analyser({});
    expect(analyse.map((m) => m.id)).toEqual(["reseaux", "systemes"]);
    expect(analyse.every((m) => m.niveau === "non-evaluee" && m.taux === null)).toBe(true);
    expect(reponsesEnregistrees(analyse)).toBe(0);
  });

  test("les réponses d'un QCM comptent dans la matière du QCM", () => {
    const analyse = analyser({ "qcm-res": { detail: detail(4, 4) }, "qcm-sys": { detail: detail(0, 2) } });
    expect(trouver(analyse, "reseaux")).toMatchObject({ justes: 4, total: 4, taux: 100, niveau: "force" });
    // 2 réponses seulement : pas de verdict, même tout faux.
    expect(trouver(analyse, "systemes")).toMatchObject({ total: 2, niveau: "non-evaluee", manquantes: MINIMUM_REPONSES - 2 });
  });

  test("seuils de force et de faiblesse", () => {
    const niveau = (justes, total) => trouver(analyser({ "qcm-res": { detail: detail(justes, total) } }), "reseaux").niveau;
    expect(SEUIL_FORCE).toBeGreaterThan(SEUIL_FAIBLESSE);
    expect(niveau(8, 10)).toBe("force");
    expect(niveau(5, 10)).toBe("a-consolider");
    expect(niveau(4, 10)).toBe("faiblesse");
  });

  test("un QCM disparu du contenu est ignoré", () => {
    const analyse = analyser({ "qcm-supprime": { detail: detail(0, 5) } });
    expect(reponsesEnregistrees(analyse)).toBe(0);
  });

  test("forces, faiblesses et matières non évaluées", () => {
    const analyse = analyser({ "qcm-res": { detail: detail(1, 4) } });
    expect(forces(analyse)).toEqual([]);
    expect(faiblesses(analyse).map((m) => m.id)).toEqual(["reseaux"]);
    expect(nonEvaluees(analyse).map((m) => m.id)).toEqual(["systemes"]);
  });
});

describe("chapitresARevoir", () => {
  const faible = analyser({ "qcm-res": { detail: detail(1, 4) } });

  test("les chapitres disponibles pas encore lus d'une matière fragile", () => {
    const liste = chapitresARevoir(faible, { "reseaux::OSI": true }, { listeMatieres });
    expect(liste.map((c) => c.chapitre)).toEqual(["IPv4"]);
    expect(liste[0]).toMatchObject({ matiere: "reseaux", dejaLu: false });
  });

  test("tout est lu : tous les chapitres sont à relire", () => {
    const liste = chapitresARevoir(faible, { "reseaux::OSI": true, "reseaux::IPv4": true }, { listeMatieres });
    expect(liste.map((c) => c.chapitre)).toEqual(["OSI", "IPv4"]);
    expect(liste.every((c) => c.dejaLu)).toBe(true);
  });

  test("rien à revoir sans matière fragile", () => {
    expect(chapitresARevoir(analyser({}), {}, { listeMatieres })).toEqual([]);
  });
});

test("couvertureMatieres compte les questions par matière", () => {
  expect(couvertureMatieres({ listeQcm, listeMatieres })).toEqual({
    total: 2,
    evaluables: 1,
    questionsPar: { reseaux: 4, systemes: 2 },
  });
});
