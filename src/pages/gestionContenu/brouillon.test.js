import { describe, expect, test } from "vitest";
import { pourPublier, problemes } from "./brouillon";
import { deplacer, extraireYoutube, identifiant, optionsCompetences } from "./outils";

/* Un brouillon minimal et sans défaut, que chaque test abîme à sa façon. */
const brouillon = () => ({
  matieres: [{ id: "reseaux", nom: "Réseaux", chapitres: [{ titre: "OSI" }] }],
  competences: [{ id: "res-osi", nom: "Modèle OSI", matiere: "reseaux", chapitres: ["OSI"] }],
  exercices: [{ id: "ex", titre: "Couches", matiere: "reseaux", enonce: "Nommer les couches.", etapes: ["", " Lister "], verification: [] }],
  qcms: [{ id: "q", titre: "OSI", matiere: "reseaux", questions: [{ enonce: "Combien ?", options: ["7", "", "4"], bonne: 2 }] }],
  videos: [],
  examens: [],
  annales: [],
  ressources: [],
});

describe("problemes : ce qui serait écarté ou cassé, dit avant de publier", () => {
  test("un brouillon correct n'a aucun problème", () => {
    expect(problemes(brouillon())).toEqual([]);
  });

  test("un élément sans titre serait supprimé", () => {
    const b = brouillon();
    b.exercices[0].titre = "  ";
    expect(problemes(b)).toEqual([expect.stringContaining("n'a pas de titre : il serait supprimé")]);
  });

  test("une compétence qui renvoie vers un chapitre renommé", () => {
    const b = brouillon();
    b.matieres[0].chapitres[0].titre = "Le modèle OSI";
    expect(problemes(b)).toEqual([expect.stringContaining("chapitre introuvable : « OSI »")]);
  });

  test("un exercice sans énoncé, ni écrit ni en PDF", () => {
    const b = brouillon();
    b.exercices[0].enonce = "";
    expect(problemes(b).join()).toContain("ni énoncé écrit ni énoncé en PDF");
    b.exercices[0].pdfEnonce = { id: "abc" };
    expect(problemes(b)).toEqual([]);
  });

  test("une ressource en accès libre sans lien ni PDF", () => {
    const b = brouillon();
    b.ressources.push({ id: "r", titre: "Livre", matiere: "reseaux", statut: "libre" });
    expect(problemes(b).join()).toContain("sans lien ni PDF");
  });

  test("une question de QCM avec une seule réponse", () => {
    const b = brouillon();
    b.qcms[0].questions[0].options = ["7", " "];
    expect(problemes(b).join()).toContain("au moins deux réponses");
  });
});

describe("pourPublier : ce qui part au relais", () => {
  test("retire les étapes et les réponses vides, en gardant la bonne réponse", () => {
    const envoye = pourPublier(brouillon());
    expect(envoye.exercices[0].etapes).toEqual(["Lister"]);
    expect(envoye.qcms[0].questions[0]).toMatchObject({ options: ["7", "4"], bonne: 1 });
  });

  test("n'envoie pas le choix « lien ou PDF » propre à l'éditeur", () => {
    const b = brouillon();
    b.ressources.push({ id: "r", titre: "Livre", source: "pdf" });
    expect(pourPublier(b).ressources[0]).not.toHaveProperty("source");
  });

  test("ne modifie pas le brouillon lui-même", () => {
    const b = brouillon();
    pourPublier(b);
    expect(b).toEqual(brouillon());
  });
});

describe("outils", () => {
  test("identifiant : lisible, sans accent, et jamais en double", () => {
    expect(identifiant("Découper un réseau !", [])).toBe("decouper-un-reseau");
    expect(identifiant("", [])).toBe("nouveau");
    const second = identifiant("Couches", [{ id: "couches" }]);
    expect(second).toMatch(/^couches-[a-z0-9]{1,4}$/);
  });

  test.each([
    ["AbCdEf12345", "AbCdEf12345"],
    ["https://www.youtube.com/watch?v=AbCdEf12345&t=30", "AbCdEf12345"],
    ["https://youtu.be/AbCdEf12345", "AbCdEf12345"],
    ["https://www.youtube.com/shorts/AbCdEf12345", "AbCdEf12345"],
    ["https://exemple.com/video", null],
  ])("extraireYoutube(%s)", (saisie, attendu) => {
    expect(extraireYoutube(saisie)).toBe(attendu);
  });

  test("deplacer change l'ordre sans toucher à la liste d'origine", () => {
    const liste = ["a", "b", "c"];
    expect(deplacer(liste, 0, 2)).toEqual(["b", "c", "a"]);
    expect(liste).toEqual(["a", "b", "c"]);
  });

  test("optionsCompetences : seulement celles de la matière, plus « Aucune »", () => {
    const competences = [
      { id: "a", nom: "A", matiere: "reseaux" },
      { id: "b", nom: "B", matiere: "bdd" },
    ];
    expect(optionsCompetences(competences, "reseaux").map((o) => o.value)).toEqual(["", "a"]);
  });
});
