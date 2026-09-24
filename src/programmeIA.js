import { site } from "./data/site";
import { ajouterJours } from "./planning";
import { enHeure, enMinutes, evenementsDuJour, versDate } from "./emploiDuTemps";

/* ==================================================================
   Programme de révision composé par l'IA, placé dans l'emploi du temps.

   1. `creneauxLibres` : à partir des disponibilités de l'étudiant (jours
      de la semaine et heures) et du jour où il veut commencer, les
      créneaux datés jusqu'à la veille de l'examen, moins ses cours déjà
      dans l'emploi du temps.
   2. `demanderProgramme` : le relais (serveur-ia/planning-ia.js) fait
      organiser par l'IA les tâches du planning dans ces créneaux.
      Sans réponse de l'IA (quota, réseau), `repartirSansIA` fait une
      répartition simple, dans le même ordre de priorité.
   3. `versEvenements` : les séances deviennent des événements de
      l'emploi du temps, marqués `genere` pour pouvoir les retirer.
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

export const disponibilitesParDefaut = () => ({
  1: { actif: true, debut: "18:00", fin: "20:00" },
  2: { actif: true, debut: "18:00", fin: "20:00" },
  3: { actif: true, debut: "18:00", fin: "20:00" },
  4: { actif: true, debut: "18:00", fin: "20:00" },
  5: { actif: true, debut: "18:00", fin: "20:00" },
  6: { actif: true, debut: "09:00", fin: "12:00" },
  0: { actif: false, debut: "15:00", fin: "17:00" },
});

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

/* `maintenant` (Date) : pour ne pas proposer un créneau déjà passé aujourd'hui. */
export function creneauxLibres({ depuis, examen, disponibilites, evenements, maintenant = new Date() }) {
  const creneaux = [];
  const aujourdhuiTexte = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, "0")}-${String(maintenant.getDate()).padStart(2, "0")}`;
  for (let jour = depuis; jour < examen; jour = ajouterJours(jour, 1)) {
    const dispo = disponibilites[versDate(jour).getDay()];
    if (!dispo?.actif || dispo.fin <= dispo.debut) continue;
    let debut = enMinutes(dispo.debut);
    if (jour === aujourdhuiTexte) {
      const quart = Math.ceil((maintenant.getHours() * 60 + maintenant.getMinutes()) / 15) * 15;
      debut = Math.max(debut, quart);
    }
    // Les cours déjà prévus (sauf les séances d'un ancien programme IA).
    const occupes = evenementsDuJour(evenements.filter((e) => !e.genere), jour).map((e) => [enMinutes(e.debut), enMinutes(e.fin)]);
    for (const [d, f] of soustraire(debut, enMinutes(dispo.fin), occupes)) {
      creneaux.push({ id: `c${creneaux.length + 1}`, jour, debut: enHeure(d), fin: enHeure(f) });
    }
  }
  return creneaux;
}

export const heuresTotales = (creneaux) =>
  creneaux.reduce((n, c) => n + enMinutes(c.fin) - enMinutes(c.debut), 0) / 60;

/* ---- Sans IA : une répartition simple, dans l'ordre de priorité ---- */

/* Premier passage sur toutes les tâches (points faibles d'abord), puis un
   second passage « Revoir » sur les premières : revoir plus tard fait
   retenir. Les QCM sont gardés pour la veille ; sans créneau la veille,
   ils prennent les dernières séances. */
export function repartirSansIA(creneaux, taches, examen) {
  const veille = ajouterJours(examen, -1);
  const qcms = taches.filter((t) => t.type === "qcm");
  const autres = taches.filter((t) => t.type !== "qcm" && t.type !== "devoir");
  const devoir = taches.find((t) => t.type === "devoir");
  const file = [...autres, ...(devoir ? [devoir] : []), ...autres.map((t) => ({ ...t, revoir: true }))];
  const libre = { cle: "", titre: "Reprendre ce qui t'a posé problème", detail: "Refais les exercices et les questions ratés, sans regarder la correction." };

  const seances = [];
  let i = 0;
  let q = 0;
  for (const c of creneaux) {
    let d = enMinutes(c.debut);
    const fin = enMinutes(c.fin);
    while (fin - d >= DUREE_MIN) {
      const f = Math.min(d + 60, fin);
      const tache = c.jour === veille ? (q < qcms.length ? qcms[q++] : libre) : i < file.length ? file[i++] : libre;
      seances.push({
        jour: c.jour,
        debut: enHeure(d),
        fin: enHeure(f),
        tache: tache.cle,
        titre: tache.cle ? (tache.revoir ? `Revoir : ${tache.titre.replace(/^[A-ZÀ-Ý][a-zà-ÿ']+ /, "")}` : "") : tache.titre,
        conseil: tache.revoir ? "Deuxième passage, quelques jours après : vérifie ce qui est resté." : tache.detail,
      });
      d = f + (f - enMinutes(c.debut) >= 90 ? 10 : 0);
    }
  }
  // Pas de créneau la veille : les QCM remplacent les dernières séances libres ou « Revoir ».
  for (let k = seances.length - 1; k >= 0 && q < qcms.length; k--) {
    if (!seances[k].tache || seances[k].titre.startsWith("Revoir")) {
      const t = qcms[q++];
      seances[k] = { ...seances[k], tache: t.cle, titre: "", conseil: t.detail };
    }
  }
  return seances;
}

/* ---- Avec l'IA ---- */

export async function demanderProgramme({ matiere, examen, creneaux, taches }) {
  if (!site.urlIA) throw new Error("IA non configurée");
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), 60_000);
  try {
    const reponse = await fetch(new URL("/planning-ia", site.urlIA), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controle.signal,
      // Des identifiants courts (t1, t2…) : ceux du planning sont trop
      // longs pour le relais. On les retraduit au retour.
      body: JSON.stringify({
        matiere,
        examen,
        creneaux,
        taches: taches.map((t, i) => ({ id: `t${i + 1}`, titre: t.titre, detail: t.detail })),
      }),
    });
    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok || !Array.isArray(donnees.seances)) throw new Error(donnees.erreur ?? `statut ${reponse.status}`);
    const cleDe = (id) => taches[Number(String(id).slice(1)) - 1]?.cle ?? "";
    return { ...donnees, seances: donnees.seances.map((s) => ({ ...s, tache: s.tache ? cleDe(s.tache) : "" })) };
  } finally {
    clearTimeout(minuteur);
  }
}

/* ---- Vers l'emploi du temps ---- */

export function versEvenements(seances, taches, evaluation) {
  const parCle = new Map(taches.map((t) => [t.cle, t]));
  return seances.map((s, i) => {
    const t = parCle.get(s.tache);
    return {
      id: `ia-${evaluation.id}-${i}`,
      // Un titre donné l'emporte (« Revoir : … ») ; sinon celui de la tâche.
      titre: s.titre || t?.titre || "Révision",
      description: s.conseil ?? "",
      jour: s.jour,
      debut: s.debut,
      fin: s.fin,
      categorie: "Révision",
      couleur: "vert",
      matiere: evaluation.matiere,
      hebdo: false,
      jusqua: s.jour,
      genere: evaluation.id,
      lien: t?.to ?? "",
    };
  });
}

/* L'examen lui-même, dans l'emploi du temps. */
export function evenementExamen(evaluation, heure) {
  return {
    id: `ia-${evaluation.id}-examen`,
    titre: evaluation.titre,
    description: "Examen",
    jour: evaluation.date,
    debut: heure,
    fin: enHeure(Math.min(enMinutes(heure) + 120, 23 * 60 + 59)),
    categorie: "Examen",
    couleur: "orange",
    matiere: evaluation.matiere,
    hebdo: false,
    jusqua: evaluation.date,
    genere: evaluation.id,
    lien: "",
  };
}
