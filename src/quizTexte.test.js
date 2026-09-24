import { describe, expect, test } from "vitest";
import { EXEMPLE_QUIZ, ecrireQuizTexte, lireQuizTexte } from "./quizTexte";

const une = (texte) => {
  const questions = lireQuizTexte(texte);
  expect(questions).toHaveLength(1);
  return questions[0];
};

describe("lireQuizTexte : questions et réponses", () => {
  test("lit l'exemple affiché dans l'espace admin sans erreur", () => {
    const questions = lireQuizTexte(EXEMPLE_QUIZ);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({
      numero: 1,
      enonce: "Combien de couches compte le modèle OSI ?",
      options: ["4", "5", "7", "8"],
      bonne: 2,
      erreurs: [],
    });
    expect(questions[0].explication).toContain("7 couches");
    expect(questions[1]).toMatchObject({ bonne: 2, erreurs: [] });
  });

  test("reconnaît les numéros « 1. », « 2) » et « Q3 : »", () => {
    const questions = lireQuizTexte("1. Un ?\n*a) x\nb) y\n2) Deux ?\n*a) x\nb) y\nQ3 : Trois ?\n*a) x\nb) y");
    expect(questions.map((q) => q.enonce)).toEqual(["Un ?", "Deux ?", "Trois ?"]);
  });

  test("garde un énoncé écrit sur plusieurs lignes", () => {
    expect(une("1. Soit le réseau suivant.\nQuel est son masque ?\n*a) /24\nb) /26").enonce).toBe(
      "Soit le réseau suivant.\nQuel est son masque ?"
    );
  });

  test("accepte les tirets et les puces comme réponses", () => {
    expect(une("1. Port SSH ?\n- 21\n- 22 *\n- 80").options).toEqual(["21", "22", "80"]);
    expect(une("1. Port SSH ?\n• 21\n• 22 ✓").bonne).toBe(1);
  });

  test("ignore les lignes vides et les fins de ligne Windows", () => {
    expect(une("1. Port SSH ?\r\n\r\na) 21\r\n*b) 22\r\n").bonne).toBe(1);
  });
});

describe("lireQuizTexte : la bonne réponse", () => {
  test.each([
    ["« * » au début", "*b) 22"],
    ["« * » à la fin", "b) 22 *"],
    ["« ✓ »", "b) 22 ✓"],
    ["« ✔ »", "✔ b) 22"],
    ["« (x) »", "b) 22 (x)"],
    ["« [x] » en guise de puce", "[x] 22"],
    ["« (bonne) »", "b) 22 (bonne)"],
    ["une marque après le tiret", "- * 22"],
  ])("marquée par %s", (_nom, ligneBonne) => {
    const q = une(`1. Port SSH ?\na) 21\n${ligneBonne}\nc) 80`);
    expect(q.options[1]).toBe("22");
    expect(q.bonne).toBe(1);
    expect(q.erreurs).toEqual([]);
  });

  test("désignée par une ligne « Réponse : c »", () => {
    expect(une("1. Port SSH ?\na) 21\nb) 80\nc) 22\nRéponse : c").bonne).toBe(2);
  });

  test("désignée par son texte : « Réponse : 22 »", () => {
    expect(une("1. Port SSH ?\na) 21\nb) 22\nréponse : 22").bonne).toBe(1);
  });

  test("lit l'explication après « > » ou « Explication : »", () => {
    expect(une("1. Port SSH ?\na) 21\n*b) 22\nExplication : SSH écoute sur 22.").explication).toBe(
      "SSH écoute sur 22."
    );
  });
});

describe("lireQuizTexte : rien n'est deviné", () => {
  test("signale une question sans bonne réponse", () => {
    const q = une("1. Port SSH ?\na) 21\nb) 22");
    expect(q.bonne).toBe(-1);
    expect(q.erreurs.join()).toContain("aucune bonne réponse");
  });

  test("signale plusieurs bonnes réponses", () => {
    const q = une("1. Port SSH ?\n*a) 21\n*b) 22");
    expect(q.bonne).toBe(-1);
    expect(q.erreurs.join()).toContain("plusieurs bonnes réponses");
  });

  test("signale une ligne « Réponse » qui ne désigne rien", () => {
    const q = une("1. Port SSH ?\na) 21\nb) 22\nRéponse : 443");
    expect(q.bonne).toBe(-1);
    expect(q.erreurs.join()).toContain("ne désigne aucune");
  });

  test("signale une question à une seule réponse", () => {
    expect(une("1. Port SSH ?\n*a) 22").erreurs.join()).toContain("au moins deux réponses");
  });

  test("signale des réponses en double, sans tenir compte des majuscules", () => {
    expect(une("1. Protocole ?\n*a) TCP\nb) tcp").erreurs.join()).toContain("identiques");
  });

  test("signale plus de six réponses et n'en garde que six", () => {
    const q = une("1. Choix ?\n- un *\n- deux\n- trois\n- quatre\n- cinq\n- six\n- sept");
    expect(q.options).toHaveLength(6);
    expect(q.erreurs.join()).toContain("6 réponses au plus");
  });

  test("un texte vide ne donne aucune question", () => {
    expect(lireQuizTexte("")).toEqual([]);
    expect(lireQuizTexte(undefined)).toEqual([]);
  });
});

describe("ecrireQuizTexte", () => {
  test("écrit le format lu par lireQuizTexte", () => {
    const texte = ecrireQuizTexte([{ enonce: "Port SSH ?", options: ["21", "22"], bonne: 1, explication: "22." }]);
    expect(texte).toBe("1. Port SSH ?\na) 21\n*b) 22\n> 22.");
  });

  test("relire ce qu'il écrit redonne les mêmes questions", () => {
    const questions = lireQuizTexte(EXEMPLE_QUIZ);
    const relues = lireQuizTexte(ecrireQuizTexte(questions));
    expect(relues).toEqual(questions);
  });

  test("garde un énoncé sur plusieurs lignes et une question sans explication", () => {
    const questions = [
      { enonce: "Soit le réseau 10.0.0.0/8.\nCombien d'hôtes ?", options: ["254", "16 777 214"], bonne: 1, explication: "" },
    ];
    const [relue] = lireQuizTexte(ecrireQuizTexte(questions));
    expect(relue).toMatchObject({ ...questions[0], erreurs: [] });
  });
});
