import { describe, expect, test } from "vitest";
import { notificationsDuJour } from "./notifications";

const JOUR = "2026-09-29";
const qcms = [
  { id: "osi", titre: "OSI" },
  { id: "sql", titre: "SQL" },
];
const vide = { evaluations: [], evenements: [], faites: {} };
const notifs = (planning = vide, revisions = {}) => notificationsDuJour({ jour: JOUR, planning, revisions, qcms });

describe("la cloche", () => {
  test("rien à faire : aucune entrée (et donc pas de point rouge)", () => {
    expect(notifs()).toEqual([]);
  });

  test("les QCM à refaire, en retard ou prévus aujourd'hui, mais pas ceux à venir", () => {
    const n = notifs(vide, {
      osi: { du: "2026-09-27", etape: 0 },
      sql: { du: "2026-10-03", etape: 1 },
    });
    expect(n).toEqual([
      { cle: "qcm:osi", icone: "target", titre: "Refaire le QCM « OSI »", detail: "En retard : c'est le moment de le revoir", lien: "/qcm/osi" },
    ]);
  });

  test("les examens des 7 prochains jours, les plus proches d'abord", () => {
    const planning = {
      ...vide,
      evaluations: [
        { id: "loin", titre: "Examen de BDD", date: "2026-10-20" },
        { id: "demain", titre: "Examen de Réseaux", date: "2026-09-30" },
        { id: "passe", titre: "Examen passé", date: "2026-09-20" },
      ],
      evenements: [
        { id: "main", titre: "Partiel d'algo", categorie: "Examen", jour: "2026-10-02" },
        // Un examen du programme a aussi son événement : pas de doublon.
        { id: "ia-demain", titre: "Examen de Réseaux", categorie: "Examen", jour: "2026-09-30", evaluation: "demain" },
        { id: "cours", titre: "Cours", categorie: "Cours", jour: "2026-09-30" },
      ],
    };
    expect(notifs(planning).map((x) => `${x.titre} · ${x.detail}`)).toEqual([
      "Examen de Réseaux · Demain",
      "Partiel d'algo · Dans 3 jours",
    ]);
  });

  test("un examen aujourd'hui compte encore", () => {
    const planning = { ...vide, evaluations: [{ id: "x", titre: "Examen de Systèmes", date: JOUR }] };
    expect(notifs(planning)[0].detail).toBe("Aujourd'hui");
  });
});
