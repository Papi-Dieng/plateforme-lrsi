import { describe, expect, test } from "vitest";
import { ajouterJours, construirePlan, joursEntre, tachesPourEvaluation, versJour } from "./planning";

/* Un petit contenu de test, indépendant de celui du site. */
const contexte = {
  aujourdhui: "2026-09-24",
  matieres: [
    {
      id: "reseaux",
      nom: "Réseaux",
      chapitres: [
        { titre: "OSI", statut: "disponible" },
        { titre: "IPv4", statut: "disponible" },
        { titre: "IPv6", statut: "bientot" },
      ],
    },
    { id: "bdd", nom: "Bases de données", chapitres: [{ titre: "SQL", statut: "disponible" }] },
  ],
  exercices: [
    { id: "ex-osi", titre: "Couches", matiere: "reseaux" },
    { id: "ex-ip", titre: "Sous-réseaux", matiere: "reseaux" },
    { id: "ex-sql", titre: "Jointures", matiere: "bdd" },
  ],
  qcms: [
    { id: "q-osi", titre: "OSI", matiere: "reseaux", questions: [{}] },
    { id: "q-ip", titre: "IPv4", matiere: "reseaux", questions: [{}] },
  ],
  devoirs: [{ id: "d-res", titre: "Devoir réseaux", matiere: "reseaux" }],
  // Réseaux fragile, Bases de données solide (src/analyseMatieres.js).
  analyse: [
    { id: "reseaux", nom: "Réseaux", niveau: "faiblesse", taux: 30 },
    { id: "bdd", nom: "Bases de données", niveau: "force", taux: 90 },
  ],
  exercicesTravailles: {},
};

const evaluation = { id: "ev1", matiere: "reseaux", date: "2026-10-01", parJour: 2 };

describe("dates", () => {
  test("ajouterJours passe les mois, les années et les années bissextiles", () => {
    expect(ajouterJours("2026-09-30", 1)).toBe("2026-10-01");
    expect(ajouterJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouterJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouterJours("2026-03-01", -1)).toBe("2026-02-28");
  });

  test("joursEntre compte les jours, changement d'heure compris", () => {
    expect(joursEntre("2026-09-24", "2026-10-01")).toBe(7);
    expect(joursEntre("2026-03-20", "2026-04-05")).toBe(16);
    expect(joursEntre("2026-10-01", "2026-09-24")).toBe(-7);
  });

  test("versJour écrit une date en jour local AAAA-MM-JJ", () => {
    expect(versJour(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("tachesPourEvaluation", () => {
  const taches = tachesPourEvaluation(evaluation, contexte);
  const cles = taches.map((t) => t.cle);

  test("une matière fragile : tout le cours et ses exercices en premier, avec la raison", () => {
    expect(cles.slice(0, 4)).toEqual(["chapitre:reseaux:OSI", "chapitre:reseaux:IPv4", "exercice:ex-osi", "exercice:ex-ip"]);
    expect(taches[0].detail).toContain("Réseaux à 30 %");
  });

  test("un chapitre « bientôt » n'est jamais proposé", () => {
    expect(cles).not.toContain("chapitre:reseaux:IPv6");
  });

  test("une matière solide : seulement ce qui n'est pas encore lu ou fait", () => {
    const solide = tachesPourEvaluation({ ...evaluation, matiere: "bdd" }, contexte).map((t) => t.cle);
    expect(solide.slice(0, 2)).toEqual(["chapitre:bdd:SQL", "exercice:ex-sql"]);
    const relu = tachesPourEvaluation({ ...evaluation, matiere: "bdd" }, { ...contexte, chapitresLus: { "bdd::SQL": "2026-09-20" } });
    expect(relu.map((t) => t.cle)).not.toContain("chapitre:bdd:SQL");
  });

  test("rien d'une autre matière", () => {
    expect(cles).not.toContain("exercice:ex-sql");
    expect(cles).not.toContain("chapitre:bdd:SQL");
  });

  test("le devoir et tous les QCM de la matière sont ajoutés, sans doublon", () => {
    expect(cles).toContain("devoir:d-res");
    expect(cles).toContain("qcm:q-osi");
    expect(new Set(cles).size).toBe(cles.length);
  });

  test("chaque tâche renvoie vers une page du site", () => {
    for (const t of taches) expect(t.to).toMatch(/^\/(cours|exercices|qcm|examens)\//);
  });

  test("un exercice déjà fait et un chapitre déjà lu ne reviennent pas (matière non jugée)", () => {
    const autres = tachesPourEvaluation(evaluation, {
      ...contexte,
      analyse: [],
      exercicesTravailles: { "ex-osi": { date: "2026-09-20" } },
      chapitresLus: { "reseaux::OSI": "2026-09-20" },
    }).map((t) => t.cle);
    expect(autres).not.toContain("exercice:ex-osi");
    expect(autres).not.toContain("chapitre:reseaux:OSI");
  });

  test("une matière inconnue ne donne que rien", () => {
    expect(tachesPourEvaluation({ ...evaluation, matiere: "inconnue" }, contexte)).toEqual([]);
  });
});

describe("construirePlan", () => {
  test("un jour par jour jusqu'à la veille", () => {
    const { jours, message } = construirePlan(evaluation, contexte);
    expect(message).toBe("");
    expect(jours.map((j) => j.jour)).toEqual([
      "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30",
    ]);
  });

  test("la veille : les QCM ; l'avant-veille : le devoir", () => {
    const { jours } = construirePlan(evaluation, contexte);
    expect(jours.at(-1).taches[0]).toMatchObject({ type: "qcm", to: "/qcm" });
    expect(jours.at(-2).taches[0]).toMatchObject({ type: "devoir", cle: "devoir:d-res" });
  });

  test("jamais plus de tâches par jour que demandé ; le surplus va « en plus »", () => {
    const { jours, enPlus } = construirePlan({ ...evaluation, date: "2026-09-26", parJour: 1 }, contexte);
    for (const j of jours) expect(j.taches.length).toBeLessThanOrEqual(2);
    expect(enPlus.length).toBeGreaterThan(0);
    const toutes = [...jours.flatMap((j) => j.taches), ...enPlus].map((t) => t.cle);
    expect(new Set(toutes).size).toBe(toutes.length);
  });

  test("le nombre de tâches par jour est borné entre 1 et 4", () => {
    const beaucoup = construirePlan({ ...evaluation, parJour: 99 }, contexte);
    expect(Math.max(...beaucoup.jours.map((j) => j.taches.length))).toBeLessThanOrEqual(4);
  });

  test("le jour même, ou après : un message, pas de programme", () => {
    expect(construirePlan({ ...evaluation, date: "2026-09-24" }, contexte)).toMatchObject({ jours: [], message: expect.stringContaining("aujourd'hui") });
    expect(construirePlan({ ...evaluation, date: "2026-09-01" }, contexte)).toMatchObject({ jours: [], message: expect.stringContaining("passée") });
  });

  test("la veille seule : QCM et devoir le même jour", () => {
    const { jours } = construirePlan({ ...evaluation, date: "2026-09-25" }, contexte);
    expect(jours).toHaveLength(1);
    expect(jours[0].taches.map((t) => t.type).slice(0, 2)).toEqual(["qcm", "devoir"]);
  });
});
