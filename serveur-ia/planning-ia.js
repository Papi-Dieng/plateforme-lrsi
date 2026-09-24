/* ==================================================================
   Programme de révision composé par l'IA, pour l'emploi du temps.

   Le site envoie tout ce qu'il faut, et l'IA ORGANISE sans rien
   inventer :
   - les créneaux libres de l'étudiant, datés (jour, début, fin) ;
   - les tâches possibles, dans l'ordre de priorité calculé par le site
     (compétences faibles d'abord) : chapitres à relire, exercices,
     QCM, devoir blanc — chacune avec un identifiant.

   Elle renvoie des séances : un créneau, une heure de début et de fin
   dans ce créneau, la tâche choisie (ou une révision libre) et un court
   conseil. Tout est revérifié ici : une séance hors de son créneau, qui
   en chevauche une autre ou qui vise une tâche inconnue est écartée.

   Assistant des étudiants : sa clé (GEMINI_API_KEY) et la limite de
   requêtes par visiteur s'appliquent. Rien n'est enregistré.
   ================================================================== */

import { interrogerGemini } from "./gemini.js";

const MAX_CRENEAUX = 80;
const MAX_TACHES = 60;

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
const JOUR = /^\d{4}-\d{2}-\d{2}$/;
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const minutes = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));

const CONSIGNES = `Tu organises le programme de révision d'un étudiant de Licence Réseaux et Systèmes Informatiques avant un examen.

Règles :
- Place les séances UNIQUEMENT dans les créneaux fournis, sans en dépasser les heures ; plusieurs séances peuvent se suivre dans un même créneau, sans se chevaucher.
- Utilise les tâches fournies, par leur identifiant. Respecte à peu près l'ordre de priorité donné : les premières tâches sont les points faibles de l'étudiant.
- Une séance dure de 30 à 90 minutes. Au-delà de 90 minutes de suite dans un créneau, laisse 10 minutes de pause.
- Espace les révisions : revois un point faible une deuxième fois quelques jours plus tard, plutôt que deux fois le même jour.
- Le dernier jour avant l'examen reste léger : refaire des QCM, relire, pas de nouvelle notion.
- S'il reste des créneaux une fois toutes les tâches placées, tu peux proposer une séance libre (tache vide) avec un titre court, par exemple « Reprendre les exercices ratés ».
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
  const taches = liste(corps?.taches, MAX_TACHES)
    .map((t) => ({ id: texte(t?.id, 20), titre: texte(t?.titre, 160), detail: texte(t?.detail, 200) }))
    .filter((t) => t.id && t.titre);
  const examen = { titre: texte(corps?.examen?.titre, 100), date: texte(corps?.examen?.date, 10) };
  if (creneaux.length === 0 || taches.length === 0 || !JOUR.test(examen.date)) return { erreur: "format", statut: 400 };

  const consigne = `Matière : ${texte(corps?.matiere, 120)}
Examen : « ${examen.titre} », le ${examen.date}.

Créneaux libres de l'étudiant (identifiant : jour, heures) :
${creneaux.map((c) => `- ${c.id} : ${c.jour}, ${c.debut}–${c.fin}`).join("\n")}

Tâches, par ordre de priorité (identifiant : tâche — raison) :
${taches.map((t) => `- ${t.id} : ${t.titre}${t.detail ? ` — ${t.detail}` : ""}`).join("\n")}

Compose le programme. « resume » : une ou deux phrases qui expliquent la logique du programme à l'étudiant.`;

  const r = await interrogerGemini(
    {
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [{ role: "user", parts: [{ text: consigne }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: "application/json", responseSchema: SCHEMA },
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

  // Revérification : dans son créneau, sans chevauchement, tâche connue.
  const parId = new Map(creneaux.map((c) => [c.id, c]));
  const idsTaches = new Set(taches.map((t) => t.id));
  const occupe = new Map();
  const seances = [];
  for (const s of liste(json?.seances, 200)) {
    const c = parId.get(s?.creneau);
    const debut = texte(s?.debut, 5);
    const fin = texte(s?.fin, 5);
    if (!c || !HEURE.test(debut) || !HEURE.test(fin)) continue;
    const d = minutes(debut);
    const f = minutes(fin);
    if (d < minutes(c.debut) || f > minutes(c.fin) || f - d < 20) continue;
    const tache = idsTaches.has(s?.tache) ? s.tache : "";
    const titre = tache ? "" : texte(s?.titre, 80);
    if (!tache && !titre) continue;
    const pris = occupe.get(c.id) ?? [];
    if (pris.some(([a, b]) => d < b && f > a)) continue;
    pris.push([d, f]);
    occupe.set(c.id, pris);
    seances.push({ jour: c.jour, debut, fin, tache, titre, conseil: texte(s?.conseil, 200) });
  }
  if (seances.length === 0) return { erreur: "reponse-illisible", statut: 502 };
  seances.sort((a, b) => (a.jour + a.debut).localeCompare(b.jour + b.debut));
  return { resultat: { seances, resume: texte(json?.resume, 400) } };
}
