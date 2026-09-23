/* ==================================================================
   L'agent de l'espace admin.

   Un second agent, distinct de l'assistant des étudiants : il aide
   l'auteur à RANGER le contenu, il ne s'adresse jamais aux étudiants.
   Il n'est joignable qu'avec le mot de passe admin, et utilise sa propre
   clé (GEMINI_API_KEY_ADMIN), créée dans un autre projet Google : son
   quota gratuit est séparé de celui des étudiants.

   Il PROPOSE, l'auteur DÉCIDE : rien de ce qu'il renvoie n'est
   enregistré ici. La page admin affiche ses propositions, et seules
   celles que l'auteur accepte entrent dans le brouillon.

   Ses réponses sont demandées en JSON, puis revérifiées : une
   compétence ou un chapitre qu'il inventerait est écarté.

   Tâches :
   - « rattacher » : pour des questions de QCM et des exercices, la
     compétence la plus adaptée parmi celles de la matière ;
   - « proposer-competences » : à partir des chapitres et de leur cours,
     une liste de compétences à créer, avec les chapitres à relire.
   ================================================================== */

import { interrogerGemini } from "./gemini.js";

const MAX_ELEMENTS = 40;
const MAX_TEXTE_ELEMENT = 1200;
const MAX_COMPETENCES = 80;
const MAX_CHAPITRES = 40;
const MAX_TEXTE_CHAPITRE = 3000;
const MAX_PROPOSITIONS = 12;

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const liste = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);

const CONSIGNES = `Tu es l'assistant de l'auteur d'une plateforme de révision pour la Licence Réseaux et Systèmes Informatiques (LRSI). Tu ne parles jamais aux étudiants : tu aides l'auteur à organiser le contenu.

Une compétence est un savoir-faire précis et mesurable dans une matière (par exemple « Adressage et sous-réseaux », « Modèles en couches », « Routage »). Les questions de QCM et les exercices y sont rattachés pour mesurer le niveau des étudiants, compétence par compétence.

Règles :
- Réponds uniquement en JSON, au format demandé.
- N'utilise que les identifiants et les titres fournis. N'invente jamais une compétence ni un chapitre.
- En cas de doute réel, dis-le : laisse la compétence vide plutôt que de choisir au hasard.
- Tes raisons sont en français, en une phrase courte (20 mots au plus).`;

/* Le modèle renvoie du JSON ; on tolère qu'il l'entoure de ```json. */
function lireJson(t) {
  const nettoye = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(nettoye);
}

async function demander(consigneTache, schema, env) {
  const cle = env.GEMINI_API_KEY_ADMIN || env.GEMINI_API_KEY;
  const r = await interrogerGemini(
    {
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [{ role: "user", parts: [{ text: consigneTache }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
    cle,
    env
  );
  if (r.erreur) return r;
  try {
    return { json: lireJson(r.texte) };
  } catch {
    console.log("Réponse de l'agent admin illisible", r.texte.slice(0, 500));
    return { erreur: "reponse-illisible", statut: 502 };
  }
}

/* ---- Rattacher des questions et des exercices à une compétence ---- */

async function rattacher(donnees, env) {
  const competences = liste(donnees?.competences, MAX_COMPETENCES)
    .map((c) => ({
      id: texte(c?.id, 80),
      nom: texte(c?.nom, 120),
      chapitres: liste(c?.chapitres, 20).map((t) => texte(t, 150)).filter(Boolean),
    }))
    .filter((c) => c.id && c.nom);
  const elements = liste(donnees?.elements, MAX_ELEMENTS)
    .map((e) => ({ ref: texte(e?.ref, 120), texte: texte(e?.texte, MAX_TEXTE_ELEMENT) }))
    .filter((e) => e.ref && e.texte);
  if (competences.length === 0 || elements.length === 0) return { erreur: "rien-a-traiter", statut: 400 };

  const consigne = `Matière : ${texte(donnees?.matiere, 120)}

Compétences disponibles (identifiant : nom — chapitres liés) :
${competences.map((c) => `- ${c.id} : ${c.nom}${c.chapitres.length ? ` — ${c.chapitres.join(", ")}` : ""}`).join("\n")}

Pour chacun des éléments suivants (questions de QCM ou exercices), choisis l'identifiant de LA compétence qu'il mesure le mieux, ou une chaîne vide si aucune ne convient vraiment. Donne une raison courte.

Éléments :
${elements.map((e) => `[${e.ref}]\n${e.texte}`).join("\n\n")}`;

  const schema = {
    type: "OBJECT",
    properties: {
      propositions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            ref: { type: "STRING" },
            competence: { type: "STRING" },
            raison: { type: "STRING" },
          },
          required: ["ref", "competence", "raison"],
        },
      },
    },
    required: ["propositions"],
  };

  const r = await demander(consigne, schema, env);
  if (r.erreur) return r;

  const ids = new Set(competences.map((c) => c.id));
  const refs = new Set(elements.map((e) => e.ref));
  const vus = new Set();
  const propositions = liste(r.json?.propositions, MAX_ELEMENTS)
    .map((p) => ({
      ref: texte(p?.ref, 120),
      // Une compétence inventée devient « aucune ».
      competence: ids.has(p?.competence) ? p.competence : "",
      raison: texte(p?.raison, 200),
    }))
    .filter((p) => refs.has(p.ref) && !vus.has(p.ref) && vus.add(p.ref));
  return { resultat: { propositions } };
}

/* ---- Proposer des compétences à partir des chapitres ---- */

async function proposerCompetences(donnees, env) {
  const chapitres = liste(donnees?.chapitres, MAX_CHAPITRES)
    .map((c) => ({ titre: texte(c?.titre, 150), texte: texte(c?.texte, MAX_TEXTE_CHAPITRE) }))
    .filter((c) => c.titre);
  if (chapitres.length === 0) return { erreur: "rien-a-traiter", statut: 400 };
  const existantes = liste(donnees?.existantes, MAX_COMPETENCES).map((n) => texte(n, 120)).filter(Boolean);

  const consigne = `Matière : ${texte(donnees?.matiere, 120)}

Compétences qui existent déjà (ne les propose pas à nouveau) :
${existantes.length ? existantes.map((n) => `- ${n}`).join("\n") : "- aucune"}

Chapitres de la matière, avec leur cours quand il existe :
${chapitres.map((c) => `### ${c.titre}\n${c.texte || "(pas de cours rédigé)"}`).join("\n\n")}

Propose au plus ${MAX_PROPOSITIONS} nouvelles compétences utiles pour mesurer le niveau des étudiants dans cette matière. Pour chacune : un nom court et précis, les titres EXACTS des chapitres à relire quand elle est faible, et une raison courte. Préfère peu de compétences bien distinctes à beaucoup de compétences qui se recoupent.`;

  const schema = {
    type: "OBJECT",
    properties: {
      competences: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            nom: { type: "STRING" },
            chapitres: { type: "ARRAY", items: { type: "STRING" } },
            raison: { type: "STRING" },
          },
          required: ["nom", "chapitres", "raison"],
        },
      },
    },
    required: ["competences"],
  };

  const r = await demander(consigne, schema, env);
  if (r.erreur) return r;

  const titres = new Set(chapitres.map((c) => c.titre));
  const dejaLa = new Set(existantes.map((n) => n.toLowerCase()));
  const vus = new Set();
  const competences = liste(r.json?.competences, MAX_PROPOSITIONS)
    .map((c) => ({
      nom: texte(c?.nom, 120),
      // Un chapitre inventé ou mal recopié est écarté.
      chapitres: [...new Set(liste(c?.chapitres, 20).filter((t) => titres.has(t)))],
      raison: texte(c?.raison, 200),
    }))
    .filter((c) => {
      const cle = c.nom.toLowerCase();
      return c.nom && !dejaLa.has(cle) && !vus.has(cle) && vus.add(cle);
    });
  return { resultat: { competences } };
}

const TACHES = {
  rattacher,
  "proposer-competences": proposerCompetences,
};

export async function executerTacheAdmin(corps, env) {
  const tache = TACHES[corps?.tache];
  if (!tache) return { erreur: "tache-inconnue", statut: 400 };
  return tache(corps.donnees, env);
}
