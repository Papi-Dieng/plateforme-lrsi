import { describe, expect, test } from "vitest";
import { niveauExercice } from "./exercices";

/* ==================================================================
   Le niveau d'un exercice est facultatif des deux côtés (demande du
   14 octobre 2026) : l'exercice peut n'en avoir aucun, et une matière
   peut n'en vouloir aucun pour tous les siens.
   ================================================================== */

const reseaux = { id: "reseaux", nom: "Réseaux" };
const sansNiveaux = { id: "algo", nom: "Algo", difficultes: false };

describe("niveauExercice", () => {
  test("rend le niveau de l'exercice quand la matière les affiche", () => {
    expect(niveauExercice({ difficulte: "Moyen" }, reseaux)).toBe("Moyen");
    // Une matière qui ne dit rien les affiche : le contenu déjà publié
    // ne change pas.
    expect(niveauExercice({ difficulte: "Facile" }, undefined)).toBe("Facile");
  });

  test("rien quand l'exercice n'en a pas", () => {
    expect(niveauExercice({ difficulte: "" }, reseaux)).toBe("");
    expect(niveauExercice({}, reseaux)).toBe("");
    expect(niveauExercice(null, reseaux)).toBe("");
  });

  test("rien quand la matière les masque, même si l'exercice en porte un", () => {
    expect(niveauExercice({ difficulte: "Difficile" }, sansNiveaux)).toBe("");
  });

  test("un niveau inconnu est ignoré plutôt qu'affiché tel quel", () => {
    expect(niveauExercice({ difficulte: "Impossible" }, reseaux)).toBe("");
  });
});
