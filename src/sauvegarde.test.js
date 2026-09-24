import { describe, expect, test } from "vitest";
import { DONNEES, construireSauvegarde, lireSauvegarde, restaurerSauvegarde } from "./sauvegarde";

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
  "lrsi-favoris": JSON.stringify([{ type: "qcm", id: "osi-bases" }]),
  "lrsi-videos": JSON.stringify([]),
  "lrsi-videos-vues": JSON.stringify(["AbCdEf12345"]),
  "lrsi-planning": JSON.stringify({ evaluations: [], faites: {}, evenements: [] }),
  "lrsi-disponibilites": JSON.stringify({ 1: { actif: true, debut: "18:00", fin: "20:00" } }),
  "lrsi-revisions": JSON.stringify({ "osi-bases": { etape: 1, prochaine: "2026-09-26" } }),
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

describe("aller-retour", () => {
  test("restaurer sur un autre appareil redonne exactement les mêmes données", () => {
    const fichier = JSON.stringify(construireSauvegarde(stockage(APPAREIL).lire));
    const lue = lireSauvegarde(fichier);
    expect(lue.erreur).toBeUndefined();

    const autre = stockage();
    restaurerSauvegarde(lue.donnees, autre.ecrire);
    expect(Object.fromEntries(autre.valeurs)).toEqual(APPAREIL);
  });

  test("le thème reste une chaîne brute, pas du JSON", () => {
    const lue = lireSauvegarde(JSON.stringify(construireSauvegarde(stockage({ "lrsi-theme": "light" }).lire)));
    const autre = stockage();
    restaurerSauvegarde(lue.donnees, autre.ecrire);
    expect(autre.lire("lrsi-theme")).toBe("light");
  });

  test("une donnée absente de la sauvegarde n'est pas effacée", () => {
    const lue = lireSauvegarde(JSON.stringify(construireSauvegarde(stockage({ "lrsi-theme": "dark" }).lire)));
    const autre = stockage({ "lrsi-scores": '{"a":1}' });
    restaurerSauvegarde(lue.donnees, autre.ecrire);
    expect(autre.lire("lrsi-scores")).toBe('{"a":1}');
  });
});

describe("lireSauvegarde : un fichier est relu avec méfiance", () => {
  const fichier = (contenu) => JSON.stringify({ application: "sunu-cours", format: 1, creeLe: "2026-09-24T10:00:00.000Z", ...contenu });

  test("résume ce qui sera remplacé", () => {
    const lue = lireSauvegarde(fichier({ donnees: { "lrsi-favoris": [1, 2], "lrsi-disponibilites": {} } }));
    expect(lue.resume).toEqual(["2 favoris", "tes disponibilités de la semaine"]);
    expect(lue.creeLe).toBe("2026-09-24T10:00:00.000Z");
  });

  test("ne garde que les clés connues, de la bonne forme", () => {
    const lue = lireSauvegarde(
      fichier({ donnees: { "lrsi-favoris": [], "lrsi-scores": "pas un objet", "lrsi-session": {}, autre: 1 } })
    );
    expect(Object.keys(lue.donnees)).toEqual(["lrsi-favoris"]);
  });

  test.each([
    ["un fichier qui n'est pas du JSON", "bonjour", "pas une sauvegarde lisible"],
    ["le fichier d'une autre application", JSON.stringify({ application: "autre", donnees: {} }), "pas une sauvegarde de la plateforme"],
    ["un fichier sans données", JSON.stringify({ application: "sunu-cours", format: 1 }), "pas une sauvegarde de la plateforme"],
    ["une version plus récente du site", JSON.stringify({ application: "sunu-cours", format: 2, donnees: {} }), "plus récente"],
    ["une sauvegarde vide", JSON.stringify({ application: "sunu-cours", format: 1, donnees: {} }), "vide"],
    ["une sauvegarde sans rien de valable", JSON.stringify({ application: "sunu-cours", format: 1, donnees: { "lrsi-theme": "rose" } }), "vide"],
  ])("refuse %s", (_nom, texte, message) => {
    expect(lireSauvegarde(texte).erreur).toContain(message);
  });

  test("refuse un fichier de plus de 2 Mo", () => {
    expect(lireSauvegarde("x".repeat(2 * 1024 * 1024 + 1)).erreur).toContain("trop gros");
  });

  test("refuse ce qui n'est pas du texte", () => {
    expect(lireSauvegarde(null).erreur).toBeTruthy();
  });
});
