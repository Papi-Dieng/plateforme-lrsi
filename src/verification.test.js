import { describe, expect, test } from "vitest";
import { reponseJuste, reponsesAcceptees, verifierExercice } from "./verification";

describe("reponsesAcceptees", () => {
  test("sépare les écritures par « | » et retire les vides", () => {
    expect(reponsesAcceptees("/26 | 26 ||")).toEqual(["/26", "26"]);
  });

  test("une réponse absente ne donne aucune écriture", () => {
    expect(reponsesAcceptees(undefined)).toEqual([]);
    expect(reponsesAcceptees("")).toEqual([]);
  });
});

describe("reponseJuste", () => {
  test("ignore majuscules, accents et espaces", () => {
    expect(reponseJuste("  Télé Com ", "telecom")).toBe(true);
    expect(reponseJuste("ROUTEUR", "routeur")).toBe(true);
  });

  test("ignore la ponctuation finale", () => {
    expect(reponseJuste("routeur.", "routeur")).toBe(true);
  });

  test("compare les nombres par leur valeur", () => {
    expect(reponseJuste("62", "62,0")).toBe(true);
    expect(reponseJuste("62.00", "62")).toBe(true);
    expect(reponseJuste("-3,5", "-3.5")).toBe(true);
  });

  test("ne devine rien : un autre nombre est faux", () => {
    expect(reponseJuste("64", "62")).toBe(false);
    expect(reponseJuste("6", "62")).toBe(false);
  });

  test("compare les adresses IP octet par octet", () => {
    expect(reponseJuste("192.168.010.001", "192.168.10.1")).toBe(true);
    expect(reponseJuste("192.168.10.2", "192.168.10.1")).toBe(false);
  });

  test("accepte l'une des écritures prévues", () => {
    expect(reponseJuste("26", "/26 | 26")).toBe(true);
    expect(reponseJuste("/26", "/26 | 26")).toBe(true);
    expect(reponseJuste("/24", "/26 | 26")).toBe(false);
  });

  test("une saisie vide n'est jamais juste", () => {
    expect(reponseJuste("", "26")).toBe(false);
    expect(reponseJuste("   ", "26")).toBe(false);
    expect(reponseJuste(null, "26")).toBe(false);
  });

  test("sans réponse attendue, rien n'est juste", () => {
    expect(reponseJuste("26", "")).toBe(false);
  });
});

describe("verifierExercice", () => {
  const lignes = [{ attendu: "192.168.1.0" }, { attendu: "/26 | 26" }, { attendu: "62" }];

  test("donne un verdict par ligne", () => {
    expect(verifierExercice(lignes, ["192.168.001.000", "25", ""])).toEqual([
      { vide: false, juste: true },
      { vide: false, juste: false },
      { vide: true, juste: false },
    ]);
  });

  test("une saisie manquante compte comme vide", () => {
    expect(verifierExercice(lignes, [])).toEqual(lignes.map(() => ({ vide: true, juste: false })));
  });
});
