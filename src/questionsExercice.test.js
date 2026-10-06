import { describe, expect, test } from "vitest";
import { assemblerReponses, questionsDe } from "./questionsExercice";

describe("questionsDe", () => {
  test("retrouve les questions numérotées, avec leur suite sur les lignes d'après", () => {
    const enonce = `Une entreprise reçoit l'adresse réseau 192.168.5.0/27.

1. Quel est le masque de sous-réseau en notation décimale ?
2) Combien d'adresses IP utilisables ce réseau offre-t-il ?
   (pour des machines)
Question 3 : Quelle est l'adresse de diffusion ?`;
    expect(questionsDe(enonce)).toEqual([
      { numero: 1, texte: "Quel est le masque de sous-réseau en notation décimale ?" },
      { numero: 2, texte: "Combien d'adresses IP utilisables ce réseau offre-t-il ? (pour des machines)" },
      { numero: 3, texte: "Quelle est l'adresse de diffusion ?" },
    ]);
  });

  test("un énoncé sans numérotation, ou une seule question : aucune liste", () => {
    expect(questionsDe("Déterminez le masque et l'adresse de diffusion.")).toEqual([]);
    expect(questionsDe("1. Une seule question ?")).toEqual([]);
    expect(questionsDe("")).toEqual([]);
  });

  test("une adresse ou un nombre en début de ligne n'est pas une question", () => {
    expect(questionsDe("192.168.1.0/24\n255.255.255.0")).toEqual([]);
  });

  test("la numérotation doit partir de 1 et se suivre", () => {
    const enonce = "1. Première ?\n3. Troisième ?\n2. Deuxième ?";
    expect(questionsDe(enonce).map((q) => q.numero)).toEqual([1, 2]);
  });
});

test("assemblerReponses met chaque réponse sous sa question", () => {
  const questions = [
    { numero: 1, texte: "Masque ?" },
    { numero: 2, texte: "Hôtes ?" },
  ];
  expect(assemblerReponses(questions, ["255.255.255.224", " "])).toBe(
    "1. Masque ?\nRéponse : 255.255.255.224\n\n2. Hôtes ?\nRéponse : (pas de réponse)"
  );
});
