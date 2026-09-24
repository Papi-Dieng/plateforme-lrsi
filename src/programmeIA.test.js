import { describe, expect, test } from "vitest";
import { enMinutes } from "./emploiDuTemps";
import {
  creneauxLibres,
  disponibilitesParDefaut,
  evenementsExamens,
  heuresTotales,
  matieresDuSemestre,
  numerosSemestre,
  repartirSansIA,
  semestres,
  versEvenements,
} from "./programmeIA";

// Le 24 septembre 2026 est un jeudi.
const JEUDI = "2026-09-24";
const matin = new Date(2026, 8, 24, 7, 0);

describe("semestres", () => {
  test("lit les numéros dans le texte du semestre", () => {
    expect(numerosSemestre("Semestre 3")).toEqual([3]);
    expect(numerosSemestre("Semestres 1 et 2")).toEqual([1, 2]);
    expect(numerosSemestre(undefined)).toEqual([]);
  });

  const matieres = [
    { id: "a", semestre: "Semestre 2" },
    { id: "b", semestre: "Semestres 1 et 2" },
    { id: "c", semestre: "Semestre 1" },
  ];

  test("liste les semestres sans doublon, dans l'ordre", () => {
    expect(semestres(matieres)).toEqual([1, 2]);
  });

  test("filtre les matières d'un semestre ; sans semestre, toutes", () => {
    expect(matieresDuSemestre(matieres, 1).map((m) => m.id)).toEqual(["b", "c"]);
    expect(matieresDuSemestre(matieres, 0)).toHaveLength(3);
  });
});

describe("creneauxLibres", () => {
  const dispos = disponibilitesParDefaut();

  test("suit les disponibilités de chaque jour de la semaine", () => {
    // jeudi, vendredi 18 h – 20 h ; samedi 9 h – 12 h ; dimanche désactivé.
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-28", disponibilites: dispos, evenements: [], maintenant: matin });
    expect(c.map(({ jour, debut, fin }) => `${jour} ${debut}-${fin}`)).toEqual([
      "2026-09-24 18:00-20:00",
      "2026-09-25 18:00-20:00",
      "2026-09-26 09:00-12:00",
    ]);
    expect(heuresTotales(c)).toBe(7);
  });

  test("s'arrête la veille du dernier examen", () => {
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-25", disponibilites: dispos, evenements: [], maintenant: matin });
    expect(c.every((x) => x.jour < "2026-09-25")).toBe(true);
  });

  test("retire les cours déjà prévus, même répétés chaque semaine", () => {
    const cours = { jour: "2026-09-17", debut: "18:30", fin: "19:00", hebdo: true };
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-25", disponibilites: dispos, evenements: [cours], maintenant: matin });
    expect(c.map((x) => `${x.debut}-${x.fin}`)).toEqual(["18:00-18:30", "19:00-20:00"]);
  });

  test("ignore les séances d'un ancien programme, qui seront remplacées", () => {
    const ancienne = { jour: JEUDI, debut: "18:00", fin: "20:00", genere: "vieille-session" };
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-25", disponibilites: dispos, evenements: [ancienne], maintenant: matin });
    expect(c).toHaveLength(1);
  });

  test("bloque les deux heures d'un examen", () => {
    const c = creneauxLibres({
      depuis: "2026-09-26",
      jusqua: "2026-09-27",
      disponibilites: dispos,
      evenements: [],
      examens: [{ date: "2026-09-26", heure: "09:00" }],
      maintenant: matin,
    });
    // Samedi 9 h – 12 h, examen de 9 h à 11 h : il reste 11 h – 12 h.
    expect(c.map((x) => `${x.debut}-${x.fin}`)).toEqual(["11:00-12:00"]);
  });

  test("aujourd'hui, ne propose pas un créneau déjà passé", () => {
    const soir = new Date(2026, 8, 24, 18, 50);
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-25", disponibilites: dispos, evenements: [], maintenant: soir });
    expect(c.map((x) => `${x.debut}-${x.fin}`)).toEqual(["19:00-20:00"]);
  });

  test("écarte les restes de moins de 30 minutes", () => {
    const cours = { jour: JEUDI, debut: "18:00", fin: "19:40" };
    // Il resterait 19 h 40 – 20 h : trop court pour une séance.
    const c = creneauxLibres({ depuis: JEUDI, jusqua: "2026-09-25", disponibilites: dispos, evenements: [cours], maintenant: matin });
    expect(c).toEqual([]);
  });
});

describe("repartirSansIA", () => {
  const ev = (id, date) => ({ id, titre: `Examen ${id}`, date });
  const tache = (evaluation, n, type = "chapitre") => ({
    cle: `${evaluation}|${type}:${n}`,
    type,
    titre: `Relire le chapitre ${n}`,
    detail: "motif",
    evaluation,
    nomMatiere: evaluation,
  });
  const evaluations = [ev("res", "2026-09-28"), ev("bdd", "2026-10-02")];
  const taches = [
    tache("res", 1), tache("res", 2), tache("res", "q", "qcm"),
    tache("bdd", 1), tache("bdd", "q", "qcm"),
  ];
  const creneaux = Array.from({ length: 8 }, (_, i) => {
    const jour = `2026-09-${24 + i}`;
    return { id: `c${i}`, jour, debut: "18:00", fin: "20:00" };
  });
  const seances = repartirSansIA(creneaux, taches, evaluations);

  test("des séances d'une heure au plus, dans les créneaux", () => {
    for (const s of seances) {
      const duree = enMinutes(s.fin) - enMinutes(s.debut);
      expect(duree).toBeGreaterThan(0);
      expect(duree).toBeLessThanOrEqual(60);
      expect(s.debut >= "18:00" && s.fin <= "20:00").toBe(true);
    }
  });

  test("aucune séance d'une matière le jour de son examen ou après", () => {
    for (const s of seances) {
      const examen = evaluations.find((e) => e.id === s.evaluation);
      expect(s.jour < examen.date).toBe(true);
    }
  });

  test("la veille d'un examen, ses QCM passent en premier", () => {
    const veilleRes = seances.filter((s) => s.jour === "2026-09-27");
    expect(veilleRes[0]).toMatchObject({ evaluation: "res", tache: "res|qcm:q" });
  });

  test("chaque tâche de la matière est placée", () => {
    const placees = new Set(seances.map((s) => s.tache));
    for (const t of taches) expect(placees).toContain(t.cle);
  });

  test("sans créneau, pas de séance", () => {
    expect(repartirSansIA([], taches, evaluations)).toEqual([]);
  });
});

describe("vers l'emploi du temps", () => {
  test("les séances deviennent des événements marqués par leur session", () => {
    const taches = [{ cle: "t1", titre: "Relire OSI", matiere: "reseaux", evaluation: "res", to: "/cours/reseaux" }];
    const [e] = versEvenements([{ jour: JEUDI, debut: "18:00", fin: "19:00", tache: "t1", titre: "", conseil: "Lis." }], taches, "s1");
    expect(e).toMatchObject({
      id: "ia-s1-0",
      titre: "Relire OSI",
      description: "Lis.",
      categorie: "Révision",
      genere: "s1",
      evaluation: "res",
      lien: "/cours/reseaux",
      hebdo: false,
    });
  });

  test("un examen dure deux heures, sans dépasser minuit", () => {
    const [a, b] = evenementsExamens(
      [
        { id: "res", titre: "Réseaux", date: JEUDI, heure: "08:00", matiere: "reseaux" },
        { id: "bdd", titre: "BDD", date: JEUDI, heure: "23:00", matiere: "bdd" },
      ],
      "s1"
    );
    expect(a).toMatchObject({ debut: "08:00", fin: "10:00", categorie: "Examen", genere: "s1" });
    expect(b.fin).toBe("23:59");
  });
});
