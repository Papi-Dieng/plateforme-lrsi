import { describe, expect, test } from "vitest";
import { DONNEES, construireSauvegarde } from "./sauvegarde";

/* Un faux localStorage : un simple dictionnaire de chaînes. */
function stockage(initial = {}) {
  const valeurs = new Map(Object.entries(initial));
  return {
    valeurs,
    lire: (cle) => (valeurs.has(cle) ? valeurs.get(cle) : null),
    ecrire: (cle, v) => valeurs.set(cle, v),
  };
}

const APPAREIL = {
  "lrsi-profil": JSON.stringify({ pseudo: "awa", avatar: 2 }),
  "lrsi-scores": JSON.stringify({ "osi-bases": { meilleur: 8, tentatives: 2 } }),
  "lrsi-exercices": JSON.stringify({ "sous-reseaux-1": { date: "2026-09-20" } }),
  "lrsi-chapitres-lus": JSON.stringify({ "reseaux:Le modèle OSI": "2026-09-21" }),
  "lrsi-devoirs": JSON.stringify({ "devoir-1@2026-10-08": { devoir: "devoir-1", titre: "Devoir", note: 14, total: 20, date: "2026-10-08" } }),
  "lrsi-favoris": JSON.stringify([{ type: "qcm", id: "osi-bases" }]),
  "lrsi-videos-vues": JSON.stringify(["AbCdEf12345"]),
  "lrsi-planning": JSON.stringify({ evaluations: [], faites: {}, evenements: [] }),
  "lrsi-disponibilites": JSON.stringify({ 1: { actif: true, debut: "18:00", fin: "20:00" } }),
  "lrsi-revisions": JSON.stringify({ "osi-bases": { etape: 1, prochaine: "2026-09-26" } }),
  "lrsi-conversations": JSON.stringify({ c1: { id: "c1", titre: "OSI", date: "2026-09-30", messages: [] } }),
  "lrsi-theme": "dark",
};

describe("ce qui part dans la sauvegarde", () => {
  test("chaque clé n'apparaît qu'une fois", () => {
    const cles = DONNEES.map((d) => d.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  test("toutes les données de l'étudiant y sont, et rien d'autre", () => {
    expect(DONNEES.map((d) => d.cle).sort()).toEqual(Object.keys(APPAREIL).sort());
  });

  test.each(["lrsi-session", "lrsi-admin-ia", "lrsi-contenu"])("%s n'y est jamais", (cle) => {
    const { lire } = stockage({ ...APPAREIL, [cle]: JSON.stringify({ secret: true }) });
    expect(construireSauvegarde(lire).donnees).not.toHaveProperty(cle);
  });
});

describe("construireSauvegarde", () => {
  test("porte le nom de l'application, le format et la date", () => {
    const s = construireSauvegarde(stockage(APPAREIL).lire);
    expect(s).toMatchObject({ application: "sunu-cours", format: 1 });
    expect(Number.isNaN(Date.parse(s.creeLe))).toBe(false);
  });

  test("écarte une donnée illisible ou de la mauvaise forme", () => {
    const { lire } = stockage({ "lrsi-scores": "{pas du json", "lrsi-favoris": "{}", "lrsi-theme": "rose" });
    expect(construireSauvegarde(lire).donnees).toEqual({});
  });

  test("un appareil vide donne une sauvegarde vide", () => {
    expect(construireSauvegarde(stockage().lire).donnees).toEqual({});
  });
});
