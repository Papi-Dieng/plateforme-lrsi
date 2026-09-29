import { describe, expect, test } from "vitest";
import { arbitrer, empreinte, fusionner } from "./synchro";

const U = "utilisateur-1";

describe("empreinte", () => {
  test("l'ordre des clés ne compte pas (Postgres les réordonne)", () => {
    expect(empreinte({ b: 1, a: { d: [1, 2], c: null } })).toBe(empreinte({ a: { c: null, d: [1, 2] }, b: 1 }));
    expect(empreinte([1, 2])).not.toBe(empreinte([2, 1]));
  });
});

describe("fusion de deux appareils", () => {
  test("les scores s'additionnent ; pour un même QCM, la tentative la plus récente l'emporte", () => {
    const local = { "lrsi-scores": { osi: { score: 8, date: "2026-09-29" }, sql: { score: 5, date: "2026-09-20" } } };
    const distant = { "lrsi-scores": { osi: { score: 6, date: "2026-09-25" }, tcp: { score: 9, date: "2026-09-26" } } };
    expect(fusionner(local, distant)["lrsi-scores"]).toEqual({
      osi: { score: 8, date: "2026-09-29" },
      sql: { score: 5, date: "2026-09-20" },
      tcp: { score: 9, date: "2026-09-26" },
    });
  });

  test("les favoris se réunissent sans doublon", () => {
    const f = (ref) => ({ type: "matiere", ref });
    expect(fusionner({ "lrsi-favoris": [f("a"), f("b")] }, { "lrsi-favoris": [f("b"), f("c")] })["lrsi-favoris"]).toEqual([
      f("b"),
      f("c"),
      f("a"),
    ]);
  });

  test("profil et planning : le compte l'emporte ; une donnée d'un seul côté est gardée", () => {
    const r = fusionner(
      { "lrsi-profil": { pseudo: "local" }, "lrsi-planning": { evaluations: [] } },
      { "lrsi-profil": { pseudo: "compte" } }
    );
    expect(r["lrsi-profil"]).toEqual({ pseudo: "compte" });
    expect(r["lrsi-planning"]).toEqual({ evaluations: [] });
  });

  test("les clés inconnues ne passent pas", () => {
    expect(fusionner({ pirate: 1 }, { autre: 2 })).toEqual({});
  });
});

describe("arbitrage au démarrage", () => {
  const scores = (n) => ({ "lrsi-scores": { osi: { score: n, date: `2026-09-2${n}` } } });
  const base = (donnees, maj) => ({ utilisateur: U, maj, empreinte: empreinte(donnees) });

  test("compte vide : l'appareil envoie ses données (les progrès d'invité sont gardés)", () => {
    expect(arbitrer({ utilisateur: U, local: scores(3), distant: null, base: null })).toEqual({ donnees: scores(3), envoyer: true, ecrire: false });
  });

  test("rien de chaque côté : rien à envoyer", () => {
    expect(arbitrer({ utilisateur: U, local: {}, distant: null, base: null }).envoyer).toBe(false);
  });

  test("seul le compte a changé : l'appareil reprend ses données, suppressions comprises", () => {
    const local = { "lrsi-favoris": [{ type: "matiere", ref: "a" }] };
    const r = arbitrer({ utilisateur: U, local, distant: { donnees: { "lrsi-favoris": [] }, mis_a_jour: "t2" }, base: base(local, "t1") });
    expect(r).toEqual({ donnees: { "lrsi-favoris": [] }, envoyer: false, ecrire: true });
  });

  test("seul l'appareil a changé : il envoie, même un favori retiré", () => {
    const avant = { "lrsi-favoris": [{ type: "matiere", ref: "a" }] };
    const r = arbitrer({ utilisateur: U, local: { "lrsi-favoris": [] }, distant: { donnees: avant, mis_a_jour: "t1" }, base: base(avant, "t1") });
    expect(r).toEqual({ donnees: { "lrsi-favoris": [] }, envoyer: true, ecrire: false });
  });

  test("les deux ont changé : fusion, envoyée au compte et recopiée ici", () => {
    const r = arbitrer({
      utilisateur: U,
      local: { "lrsi-scores": { a: { score: 1, date: "2026-09-29" } } },
      distant: { donnees: { "lrsi-scores": { b: { score: 2, date: "2026-09-28" } } }, mis_a_jour: "t2" },
      base: base({}, "t1"),
    });
    expect(Object.keys(r.donnees["lrsi-scores"]).sort()).toEqual(["a", "b"]);
    expect(r.envoyer).toBe(true);
    expect(r.ecrire).toBe(true);
  });

  test("première connexion sur un appareil vide : on prend le compte", () => {
    const r = arbitrer({ utilisateur: U, local: {}, distant: { donnees: scores(4), mis_a_jour: "t" }, base: null });
    expect(r).toEqual({ donnees: scores(4), envoyer: false, ecrire: true });
  });

  test("la base d'un autre compte ne compte pas", () => {
    const r = arbitrer({
      utilisateur: U,
      local: { "lrsi-scores": { sql: { score: 3, date: "2026-09-23" } } },
      distant: { donnees: scores(4), mis_a_jour: "t" },
      base: { utilisateur: "autre", maj: "t", empreinte: empreinte({ "lrsi-scores": { sql: { score: 3, date: "2026-09-23" } } }) },
    });
    expect(r.envoyer).toBe(true);
    expect(r.ecrire).toBe(true);
  });
});
