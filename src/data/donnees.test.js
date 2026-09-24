import { describe, expect, test } from "vitest";
import { competences } from "./competences";
import { exercices } from "./exercices";
import { matieres } from "./matieres";
import { qcms } from "./qcm";

/* Le contenu par défaut, écrit dans le code, doit être cohérent : une
   faute de frappe dans un identifiant ou un titre de chapitre casserait
   en silence l'analyse des compétences ou le planning. */

const doublons = (liste) => liste.filter((x, i) => liste.indexOf(x) !== i);
const idsCompetences = new Set(competences.map((c) => c.id));
const idsMatieres = new Set(matieres.map((m) => m.id));

describe("identifiants uniques", () => {
  test.each([
    ["matières", matieres],
    ["compétences", competences],
    ["exercices", exercices],
    ["QCM", qcms],
  ])("%s", (_nom, liste) => {
    expect(doublons(liste.map((x) => x.id))).toEqual([]);
  });
});

describe("compétences", () => {
  test("chacune appartient à une matière qui existe", () => {
    expect(competences.filter((c) => !idsMatieres.has(c.matiere)).map((c) => c.id)).toEqual([]);
  });

  test("leurs chapitres reprennent mot pour mot ceux de matieres.js", () => {
    const introuvables = competences.flatMap((c) => {
      const titres = matieres.find((m) => m.id === c.matiere)?.chapitres.map((ch) => ch.titre) ?? [];
      return c.chapitres.filter((t) => !titres.includes(t)).map((t) => `${c.id} → « ${t} »`);
    });
    expect(introuvables).toEqual([]);
  });
});

describe("exercices", () => {
  test("chacun appartient à une matière qui existe", () => {
    expect(exercices.filter((e) => !idsMatieres.has(e.matiere)).map((e) => e.id)).toEqual([]);
  });

  test("leur compétence existe", () => {
    expect(exercices.filter((e) => e.competence && !idsCompetences.has(e.competence)).map((e) => e.id)).toEqual([]);
  });
});

describe("QCM", () => {
  test("chacun appartient à une matière qui existe", () => {
    expect(qcms.filter((q) => !idsMatieres.has(q.matiere)).map((q) => q.id)).toEqual([]);
  });

  const questions = qcms.flatMap((q) => q.questions.map((x, i) => ({ ...x, ou: `${q.id} n°${i + 1}` })));

  test("la bonne réponse désigne une réponse qui existe", () => {
    const fausses = questions.filter((x) => !Number.isInteger(x.bonne) || x.bonne < 0 || x.bonne >= x.options.length);
    expect(fausses.map((x) => x.ou)).toEqual([]);
  });

  test("au moins deux réponses, toutes différentes", () => {
    const fautives = questions.filter(
      (x) => x.options.length < 2 || new Set(x.options.map((o) => o.toLowerCase())).size !== x.options.length
    );
    expect(fautives.map((x) => x.ou)).toEqual([]);
  });

  test("chaque question a une explication", () => {
    expect(questions.filter((x) => !x.explication?.trim()).map((x) => x.ou)).toEqual([]);
  });

  test("leur compétence existe", () => {
    expect(questions.filter((x) => x.competence && !idsCompetences.has(x.competence)).map((x) => x.ou)).toEqual([]);
  });
});
