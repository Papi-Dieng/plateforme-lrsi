import { site } from "./data/site";
import { ajouterJours, tachesPourEvaluation } from "./planning";
import { enHeure, enMinutes, evenementsDuJour, versDate } from "./emploiDuTemps";

/* ==================================================================
   Programme de révision d'une session d'examens, composé par l'IA et
   placé dans l'emploi du temps.

   Une session : un semestre, une période (début et fin), et plusieurs
   examens — une matière, un jour, une heure, une difficulté ressentie.

   1. `creneauxLibres` : à partir des disponibilités de l'étudiant (jours
      de la semaine et heures) et du jour où il veut commencer, les
      créneaux datés jusqu'au dernier examen, moins ses cours déjà dans
      l'emploi du temps et les heures des examens eux-mêmes.
   2. `tachesDeSession` : pour chaque matière, les tâches du planning
      (points faibles d'abord), à faire avant son examen.
   3. `demanderProgramme` : le relais (serveur-ia/planning-ia.js) fait
      organiser ces tâches par l'IA dans les créneaux. Sans réponse
      (quota, réseau), `repartirSansIA` fait une répartition simple.
   4. `versEvenements` : les séances deviennent des événements de
      l'emploi du temps, marqués `genere` (la session) et `evaluation`
      (la matière), pour pouvoir les retirer ou les refaire.
   ================================================================== */

export const JOURS_SEMAINE = [
  { num: 1, nom: "Lundi" },
  { num: 2, nom: "Mardi" },
  { num: 3, nom: "Mercredi" },
  { num: 4, nom: "Jeudi" },
  { num: 5, nom: "Vendredi" },
  { num: 6, nom: "Samedi" },
  { num: 0, nom: "Dimanche" },
];

export const DIFFICULTES = ["Facile", "Moyen", "Difficile"];
const POIDS = { Facile: 1, Moyen: 1.6, Difficile: 2.4 };
const MAX_TACHES_PAR_MATIERE = 20;
const DUREE_EXAMEN = 120;

export const disponibilitesParDefaut = () => ({
  1: { actif: true, debut: "18:00", fin: "20:00" },
  2: { actif: true, debut: "18:00", fin: "20:00" },
  3: { actif: true, debut: "18:00", fin: "20:00" },
  4: { actif: true, debut: "18:00", fin: "20:00" },
  5: { actif: true, debut: "18:00", fin: "20:00" },
  6: { actif: true, debut: "09:00", fin: "12:00" },
  0: { actif: false, debut: "15:00", fin: "17:00" },
});

/* ---- Semestres ---- */

// « Semestre 3 » → [3] ; « Semestres 1 et 2 » → [1, 2].
export const numerosSemestre = (texte) => (String(texte ?? "").match(/\d+/g) ?? []).map(Number);

export const semestres = (matieres) =>
  [...new Set(matieres.flatMap((m) => numerosSemestre(m.semestre)))].sort((a, b) => a - b);

export const matieresDuSemestre = (matieres, numero) =>
  numero ? matieres.filter((m) => numerosSemestre(m.semestre).includes(numero)) : matieres;

/* ---- Créneaux ---- */

const DUREE_MIN = 30;

/* Retire d'un intervalle [debut, fin] (minutes) les intervalles occupés. */
function soustraire(debut, fin, occupes) {
  let morceaux = [[debut, fin]];
  for (const [a, b] of occupes) {
    morceaux = morceaux.flatMap(([d, f]) => {
      if (b <= d || a >= f) return [[d, f]];
      return [
        [d, Math.min(a, f)],
        [Math.max(b, d), f],
      ].filter(([x, y]) => y - x > 0);
    });
  }
  return morceaux.filter(([d, f]) => f - d >= DUREE_MIN);
}

/* Du jour `depuis` au dernier examen (exclu). `examens` : [{ date, heure }]
   dont l'heure est bloquée. `maintenant` : pour ne pas proposer un
   créneau déjà passé aujourd'hui. */
export function creneauxLibres({ depuis, jusqua, disponibilites, evenements, examens = [], maintenant = new Date() }) {
  const creneaux = [];
  const aujourdhuiTexte = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
  for (let jour = depuis; jour < jusqua; jour = ajouterJours(jour, 1)) {
    const dispo = disponibilites[versDate(jour).getDay()];
    if (!dispo?.actif || dispo.fin <= dispo.debut) continue;
    let debut = enMinutes(dispo.debut);
    if (jour === aujourdhuiTexte) {
      const quart = Math.ceil((maintenant.getHours() * 60 + maintenant.getMinutes()) / 15) * 15;
      debut = Math.max(debut, quart);
    }
    // Les cours déjà prévus (sauf les séances d'un ancien programme) et les examens du jour.
    const occupes = [
      ...evenementsDuJour(evenements.filter((e) => !e.genere), jour).map((e) => [enMinutes(e.debut), enMinutes(e.fin)]),
      ...examens.filter((x) => x.date === jour && x.heure).map((x) => [enMinutes(x.heure), enMinutes(x.heure) + DUREE_EXAMEN]),
    ];
    for (const [d, f] of soustraire(debut, enMinutes(dispo.fin), occupes)) {
      creneaux.push({ id: `c${creneaux.length + 1}`, jour, debut: enHeure(d), fin: enHeure(f) });
    }
  }
  return creneaux;
}

export const heuresTotales = (creneaux) =>
  creneaux.reduce((n, c) => n + enMinutes(c.fin) - enMinutes(c.debut), 0) / 60;

/* ---- Tâches ---- */

/* Les tâches de toutes les matières de la session, chacune rattachée à
   son examen (`evaluation`, `avant`). `evaluations` : celles de la
   session, avec `difficulte`. */
export function tachesDeSession(evaluations, contexte) {
  return evaluations.flatMap((ev) => {
    const nom = contexte.matieres.find((m) => m.id === ev.matiere)?.nom ?? ev.matiere;
    return tachesPourEvaluation(ev, contexte)
      .slice(0, MAX_TACHES_PAR_MATIERE)
      .map((t) => ({ ...t, cle: `${ev.id}|${t.cle}`, evaluation: ev.id, matiere: ev.matiere, nomMatiere: nom, avant: ev.date }));
  });
}

/* ---- Sans IA : une répartition simple ---- */

/* Séance par séance, la matière choisie est celle qui a le moins de
   temps par rapport à son besoin (difficulté), parmi celles dont
   l'examen n'est pas encore passé ; la veille d'un examen, ses QCM.
   Dans chaque matière : points faibles d'abord, devoir blanc, puis un
   second passage « Revoir » sur les premières tâches. */
export function repartirSansIA(creneaux, taches, evaluations) {
  const etat = new Map(
    evaluations.map((ev) => {
      const siennes = taches.filter((t) => t.evaluation === ev.id);
      const autres = siennes.filter((t) => t.type !== "qcm" && t.type !== "devoir");
      const devoir = siennes.find((t) => t.type === "devoir");
      return [
        ev.id,
        {
          ev,
          file: [...autres, ...(devoir ? [devoir] : []), ...autres.map((t) => ({ ...t, revoir: true }))],
          qcms: siennes.filter((t) => t.type === "qcm"),
          seances: 0,
          poids: POIDS[ev.difficulte] ?? POIDS.Moyen,
          nom: siennes[0]?.nomMatiere ?? ev.titre,
        },
      ];
    })
  );

  const seances = [];
  for (const c of creneaux) {
    let d = enMinutes(c.debut);
    const fin = enMinutes(c.fin);
    while (fin - d >= DUREE_MIN) {
      const f = Math.min(d + 60, fin);
      const ouvertes = [...etat.values()].filter((s) => c.jour < s.ev.date);
      if (ouvertes.length === 0) break;
      // La veille d'un examen : ses QCM d'abord.
      const veille = ouvertes.find((s) => ajouterJours(c.jour, 1) === s.ev.date && s.qcms.length);
      let choisie;
      let tache;
      if (veille) {
        choisie = veille;
        tache = veille.qcms.shift();
      } else {
        const joursRestants = (s) => Math.max((versDate(s.ev.date) - versDate(c.jour)) / 86_400_000, 1);
        choisie = ouvertes.reduce((a, b) => (b.seances / b.poids + joursRestants(b) * 0.15 < a.seances / a.poids + joursRestants(a) * 0.15 ? b : a));
        tache = choisie.file.shift();
      }
      choisie.seances++;
      seances.push({
        jour: c.jour,
        debut: enHeure(d),
        fin: enHeure(f),
        tache: tache?.cle ?? "",
        titre: !tache
          ? `${choisie.nom} : reprendre ce qui t'a posé problème`
          : tache.revoir
            ? `Revoir : ${tache.titre.replace(/^[A-ZÀ-Ý][a-zà-ÿ']+ /, "")}`
            : "",
        conseil: !tache
          ? "Refais les exercices et les questions ratés, sans regarder la correction."
          : tache.revoir
            ? "Deuxième passage, quelques jours après : vérifie ce qui est resté."
            : tache.detail,
        evaluation: choisie.ev.id,
      });
      d = f + (f - enMinutes(c.debut) >= 90 ? 10 : 0);
    }
  }
  // Pas de créneau la veille d'un examen : ses QCM remplacent ses
  // dernières séances libres ou « Revoir », avant l'examen.
  for (const s of etat.values()) {
    for (let k = seances.length - 1; k >= 0 && s.qcms.length; k--) {
      const x = seances[k];
      if (x.evaluation !== s.ev.id || x.jour >= s.ev.date) continue;
      if (!x.tache || x.titre.startsWith("Revoir")) {
        const t = s.qcms.shift();
        seances[k] = { ...x, tache: t.cle, titre: "", conseil: t.detail };
      }
    }
  }
  return seances;
}

/* ---- Avec l'IA ---- */

export async function demanderProgramme({ session, examens, creneaux, taches }) {
  if (!site.urlIA) throw new Error("IA non configurée");
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), 90_000);
  try {
    const reponse = await fetch(new URL("/planning-ia", site.urlIA), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controle.signal,
      // Des identifiants courts (t1, t2…) : ceux du planning sont trop
      // longs pour le relais. On les retraduit au retour.
      body: JSON.stringify({
        session,
        examens,
        creneaux,
        taches: taches.map((t, i) => ({ id: `t${i + 1}`, matiere: t.nomMatiere, avant: t.avant, titre: t.titre, detail: t.detail })),
      }),
    });
    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok || !Array.isArray(donnees.seances)) throw new Error(donnees.erreur ?? `statut ${reponse.status}`);
    const tacheDe = (id) => taches[Number(String(id).slice(1)) - 1];
    return {
      ...donnees,
      seances: donnees.seances.map((s) => {
        const t = s.tache ? tacheDe(s.tache) : null;
        return { ...s, tache: t?.cle ?? "", evaluation: t?.evaluation ?? "" };
      }),
    };
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---- Vers l'emploi du temps ---- */

export function versEvenements(seances, taches, sessionId) {
  const parCle = new Map(taches.map((t) => [t.cle, t]));
  return seances.map((s, i) => {
    const t = parCle.get(s.tache);
    return {
      id: `ia-${sessionId}-${i}`,
      // Un titre donné l'emporte (« Revoir : … ») ; sinon celui de la tâche.
      titre: s.titre || t?.titre || "Révision",
      description: s.conseil ?? "",
      jour: s.jour,
      debut: s.debut,
      fin: s.fin,
      categorie: "Révision",
      couleur: "vert",
      matiere: t?.matiere ?? "",
      hebdo: false,
      jusqua: s.jour,
      genere: sessionId,
      evaluation: t?.evaluation ?? s.evaluation ?? "",
      lien: t?.to ?? "",
    };
  });
}

/* Les examens eux-mêmes, dans l'emploi du temps. */
export function evenementsExamens(evaluations, sessionId) {
  return evaluations.map((ev) => ({
    id: `ia-${sessionId}-examen-${ev.id}`,
    titre: ev.titre,
    description: `Examen${ev.difficulte ? ` · difficulté ressentie : ${ev.difficulte.toLowerCase()}` : ""}`,
    jour: ev.date,
    debut: ev.heure,
    fin: enHeure(Math.min(enMinutes(ev.heure) + DUREE_EXAMEN, 23 * 60 + 59)),
    categorie: "Examen",
    couleur: "orange",
    matiere: ev.matiere,
    hebdo: false,
    jusqua: ev.date,
    genere: sessionId,
    evaluation: ev.id,
    lien: "",
  }));
}
