/* ==================================================================
   Programme de révision composé par l'IA, pour l'emploi du temps.

   Pour toute une session d'examens : plusieurs matières, chacune avec
   la date de son examen et sa difficulté ressentie. Le site envoie tout
   ce qu'il faut, et l'IA ORGANISE sans rien inventer :
   - les créneaux libres de l'étudiant, datés (jour, début, fin) ;
   - les examens (matière, date, heure, difficulté) ;
   - les tâches possibles de chaque matière, dans l'ordre de priorité
     calculé par le site (compétences faibles d'abord), avec la date
     avant laquelle elles doivent être faites : l'examen de leur matière.

   Elle renvoie des séances : un créneau, une heure de début et de fin
   dans ce créneau, la tâche choisie (ou une révision libre) et un court
   conseil. Tout est revérifié ici : une séance hors de son créneau, qui
   en chevauche une autre, qui vise une tâche inconnue ou qui tombe le
   jour de l'examen de sa matière ou après est écartée.

   Assistant des étudiants : sa clé (GEMINI_API_KEY) et la limite de
   requêtes par visiteur s'appliquent. Rien n'est enregistré.
   ================================================================== */

import { interrogerGemini } from "./gemini.js";

const MAX_CRENEAUX = 120;
const MAX_TACHES = 150;
const MAX_EXAMENS = 12;

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
const DIFFICULTES = ["Facile", "Moyen", "Difficile"];

const CONSIGNES = `Tu organises le programme de révision d'un étudiant de Licence Réseaux et Systèmes Informatiques pour une session d'examens, qui peut compter plusieurs matières.

Règles :
- Place les séances UNIQUEMENT dans les créneaux fournis, sans en dépasser les heures ; plusieurs séances peuvent se suivre dans un même créneau, sans se chevaucher.
- Utilise les tâches fournies, par leur identifiant. Une tâche doit être placée AVANT le jour de l'examen de sa matière (champ « avant ») : jamais ce jour-là ni après.
- Répartis le temps entre les matières : celles dont l'examen arrive en premier passent d'abord, et une matière « Difficile » reçoit nettement plus de séances qu'une matière « Facile ».
- Alterne les matières d'un jour à l'autre plutôt que de faire une matière entière d'un bloc, sauf juste avant son examen.
- Dans chaque matière, respecte à peu près l'ordre de priorité donné : les premières tâches sont les points faibles de l'étudiant.
- Une séance dure de 30 à 90 minutes. Au-delà de 90 minutes de suite dans un créneau, laisse 10 minutes de pause.
- La veille d'un examen, pour cette matière : refaire des QCM, relire, pas de nouvelle notion.
- S'il reste des créneaux, tu peux proposer une séance libre (tache vide) avec un titre court qui nomme la matière, par exemple « Réseaux : reprendre les exercices ratés ».
- Tu n'es pas obligé de remplir tous les créneaux : mieux vaut un programme tenable qu'un programme surchargé.
- « conseil » : une phrase courte et concrète, en français, en tutoyant.
- Réponds uniquement en JSON, au format demandé.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    seances: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          creneau: { type: "STRING" },
          debut: { type: "STRING" },
          fin: { type: "STRING" },
          tache: { type: "STRING" },
          titre: { type: "STRING" },
          conseil: { type: "STRING" },
        },
        required: ["creneau", "debut", "fin", "tache", "conseil"],
      },
    },
    resume: { type: "STRING" },
  },
  required: ["seances", "resume"],
};

export async function composerPlanning(corps, env) {
  const creneaux = liste(corps?.creneaux, MAX_CRENEAUX)
    .map((c) => ({ id: texte(c?.id, 20), jour: texte(c?.jour, 10), debut: texte(c?.debut, 5), fin: texte(c?.fin, 5) }))
    .filter((c) => c.id && JOUR.test(c.jour) && HEURE.test(c.debut) && HEURE.test(c.fin) && minutes(c.fin) - minutes(c.debut) >= 30);
  const examens = liste(corps?.examens, MAX_EXAMENS)
    .map((x) => ({
      matiere: texte(x?.matiere, 120),
      date: texte(x?.date, 10),
      heure: HEURE.test(x?.heure ?? "") ? x.heure : "",
      difficulte: DIFFICULTES.includes(x?.difficulte) ? x.difficulte : "Moyen",
    }))
    .filter((x) => x.matiere && JOUR.test(x.date));
  const taches = liste(corps?.taches, MAX_TACHES)
    .map((t) => ({
      id: texte(t?.id, 20),
      matiere: texte(t?.matiere, 120),
      avant: texte(t?.avant, 10),
      titre: texte(t?.titre, 160),
      detail: texte(t?.detail, 200),
    }))
    .filter((t) => t.id && t.titre && JOUR.test(t.avant));
  if (creneaux.length === 0 || taches.length === 0 || examens.length === 0) return { erreur: "format", statut: 400 };

  const consigne = `Session d'examens : ${texte(corps?.session, 120) || "non précisée"}.

Examens :
${examens.map((x) => `- ${x.matiere} : le ${x.date}${x.heure ? ` à ${x.heure}` : ""}, difficulté ressentie « ${x.difficulte} »`).join("\n")}

Créneaux libres de l'étudiant (identifiant : jour, heures) :
${creneaux.map((c) => `- ${c.id} : ${c.jour}, ${c.debut}–${c.fin}`).join("\n")}

Tâches, par matière et par ordre de priorité (identifiant : [matière, avant le …] tâche — raison) :
${taches.map((t) => `- ${t.id} : [${t.matiere}, avant le ${t.avant}] ${t.titre}${t.detail ? ` — ${t.detail}` : ""}`).join("\n")}

Compose le programme. « resume » : deux phrases au plus, qui expliquent à l'étudiant la logique du programme (ordre des matières, répartition du temps).`;

  const r = await interrogerGemini(
    {
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [{ role: "user", parts: [{ text: consigne }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 16384, responseMimeType: "application/json", responseSchema: SCHEMA },
    },
    env.GEMINI_API_KEY,
    env
  );
  if (r.erreur) return r;

  let json;
  try {
    json = JSON.parse(r.texte.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    return { erreur: "reponse-illisible", statut: 502 };
  }

  // Revérification : dans son créneau, sans chevauchement, tâche connue,
  // et avant l'examen de sa matière.
  const parId = new Map(creneaux.map((c) => [c.id, c]));
  const tacheDe = new Map(taches.map((t) => [t.id, t]));
  const occupe = new Map();
  const seances = [];
  for (const s of liste(json?.seances, 300)) {
    const c = parId.get(s?.creneau);
    const debut = texte(s?.debut, 5);
    const fin = texte(s?.fin, 5);
    if (!c || !HEURE.test(debut) || !HEURE.test(fin)) continue;
    const d = minutes(debut);
    const f = minutes(fin);
    if (d < minutes(c.debut) || f > minutes(c.fin) || f - d < 20) continue;
    const t = tacheDe.get(s?.tache);
    if (t && c.jour >= t.avant) continue;
    const titre = t ? "" : texte(s?.titre, 80);
    if (!t && !titre) continue;
    const pris = occupe.get(c.id) ?? [];
    if (pris.some(([a, b]) => d < b && f > a)) continue;
    pris.push([d, f]);
    occupe.set(c.id, pris);
    seances.push({ jour: c.jour, debut, fin, tache: t ? t.id : "", titre, conseil: texte(s?.conseil, 200) });
  }
  if (seances.length === 0) return { erreur: "reponse-illisible", statut: 502 };
  seances.sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
  return { resultat: { seances, resume: texte(json?.resume, 400) } };
}
