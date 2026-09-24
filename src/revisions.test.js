import { describe, expect, test } from "vitest";
import { INTERVALLES, revisionsDues, suite } from "./revisions";

const JOUR = "2026-09-24";

describe("suite : la règle de la révision espacée", () => {
  test("les intervalles sont 2, 5, 12 puis 30 jours", () => {
    expect(INTERVALLES).toEqual([2, 5, 12, 30]);
  });

  test("un QCM raté revient dans 2 jours", () => {
    expect(suite(undefined, false, JOUR)).toEqual({ suivant: { du: "2026-09-26", etape: 0 }, action: "programme" });
  });

  test("raté à nouveau, il repart à 2 jours, quelle que soit l'étape", () => {
    expect(suite({ du: JOUR, etape: 3 }, false, JOUR).suivant).toEqual({ du: "2026-09-26", etape: 0 });
  });

  test("réussi sans avoir jamais été raté : rien ne change", () => {
    expect(suite(undefined, true, JOUR)).toEqual({ suivant: null, action: "inchange" });
  });

  test("réussi avant la date prévue : rien ne change", () => {
    const actuel = { du: "2026-09-30", etape: 1 };
    expect(suite(actuel, true, JOUR)).toEqual({ suivant: actuel, action: "inchange" });
  });

  test("réussi le jour prévu ou après, il revient de plus en plus tard", () => {
    expect(suite({ du: JOUR, etape: 0 }, true, JOUR)).toEqual({ suivant: { du: "2026-09-29", etape: 1 }, action: "avance" });
    expect(suite({ du: "2026-09-20", etape: 1 }, true, JOUR).suivant).toEqual({ du: "2026-10-06", etape: 2 });
    expect(suite({ du: JOUR, etape: 2 }, true, JOUR).suivant).toEqual({ du: "2026-10-24", etape: 3 });
  });

  test("réussi une dernière fois après 30 jours : acquis, il sort de la liste", () => {
    expect(suite({ du: JOUR, etape: 3 }, true, JOUR)).toEqual({ suivant: null, action: "acquis" });
  });

  test("le parcours complet, d'un échec jusqu'à l'acquis", () => {
    let etat = suite(undefined, false, "2026-01-01").suivant;
    const dates = [etat.du];
    for (;;) {
      const r = suite(etat, true, etat.du);
      if (!r.suivant) {
        expect(r.action).toBe("acquis");
        break;
      }
      etat = r.suivant;
      dates.push(etat.du);
    }
    expect(dates).toEqual(["2026-01-03", "2026-01-08", "2026-01-20", "2026-02-19"]);
  });

  test("les dates passent correctement les fins de mois et d'année", () => {
    expect(suite(undefined, false, "2026-12-31").suivant.du).toBe("2027-01-02");
    expect(suite(undefined, false, "2028-02-28").suivant.du).toBe("2028-03-01");
  });
});

describe("revisionsDues", () => {
  const qcms = [
    { id: "osi", titre: "OSI" },
    { id: "ipv4", titre: "IPv4" },
    { id: "sql", titre: "SQL" },
  ];

  test("sépare ce qui est dû de ce qui vient, les plus en retard d'abord", () => {
    const revisions = {
      sql: { du: "2026-09-30", etape: 1 },
      osi: { du: JOUR, etape: 0 },
      ipv4: { du: "2026-09-20", etape: 2 },
    };
    const { aFaire, aVenir } = revisionsDues(qcms, JOUR, revisions);
    expect(aFaire.map((r) => r.qcm.id)).toEqual(["ipv4", "osi"]);
    expect(aVenir.map((r) => r.qcm.id)).toEqual(["sql"]);
  });

  test("ignore un QCM qui n'existe plus", () => {
    const { aFaire, aVenir } = revisionsDues(qcms, JOUR, { supprime: { du: JOUR, etape: 0 } });
    expect(aFaire).toEqual([]);
    expect(aVenir).toEqual([]);
  });
});
