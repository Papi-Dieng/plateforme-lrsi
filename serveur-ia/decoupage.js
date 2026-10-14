/* ==================================================================
   Découper un devoir en parties (demande du 14 octobre 2026).

   Écrire un devoir partie par partie dans l'admin est long : l'auteur a
   déjà son sujet et son corrigé, en un seul bloc ou en PDF. Il les
   colle ici, l'IA retrouve les questions, rapproche chaque question de
   son corrigé, et relève le barème quand le sujet l'indique
   (« (3 points) », « /2 »…). L'auteur n'a plus qu'à vérifier, et à
   remplir les points manquants.

   L'IA ne rédige RIEN : elle recopie le texte de l'auteur en le
   découpant. C'est la même règle que partout ailleurs sur ce relais —
   le contenu pédagogique vient de l'enseignant, jamais du modèle.

   Réservé à l'espace admin : la route /admin/decouper-devoir est
   derrière le mot de passe.
   ================================================================== */

import { interrogerGemini, modelesRapides } from "./gemini.js";

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const CONSIGNES = `Tu découpes le sujet d'un devoir en questions, pour un enseignant.

Règles :
- Recopie le texte de l'enseignant SANS LE RÉÉCRIRE : même formulation, mêmes valeurs, mêmes retours à la ligne. Tu ne fais que le découper et le ranger.
- Une entrée par question (ou par exercice si le sujet est organisé ainsi, en gardant ses sous-questions ensemble dans l'énoncé).
- "titre" : un intitulé court pris dans le sujet (« Exercice 1 », « Question 3 », « Adressage IP »). Jamais une phrase inventée.
- "enonce" : le texte de la question, tel quel.
- "corrige" : la partie du corrigé qui répond à CETTE question, telle quelle. Si le corrigé ne dit rien sur elle, laisse une chaîne vide.
- "points" : le barème écrit dans le sujet pour cette question (« (3 points) », « / 2 », « 1,5 pt »). Si rien n'est écrit pour elle, mets 0.
- N'invente aucune question, aucun corrigé, aucun barème. N'ajoute ni introduction ni commentaire.
- Réponds uniquement en JSON, au format demandé.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    parties: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          titre: { type: "STRING" },
          enonce: { type: "STRING" },
          corrige: { type: "STRING" },
          points: { type: "NUMBER" },
        },
        required: ["titre", "enonce", "corrige", "points"],
      },
    },
  },
  required: ["parties"],
};

const PARTIES_MAX = 40;
const demiPoint = (n) => Math.round(n * 2) / 2;

export async function decouperDevoir(corps, env) {
  const sujet = texte(corps?.sujet, 30000);
  const corrige = texte(corps?.corrige, 30000);
  if (sujet.length < 20) return { erreur: "format", statut: 400 };

  const r = await interrogerGemini(
    {
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `SUJET :\n${sujet}\n\nCORRIGÉ${corrige ? "" : " : aucun"} :\n${corrige}\n\nDécoupe ce sujet en questions.`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    },
    env.GEMINI_API_KEY,
    env,
    { modeles: modelesRapides(env), delaiMax: 45000 }
  );
  if (r.erreur) return r;

  let json;
  try {
    json = JSON.parse(r.texte.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, ""));
  } catch {
    return { erreur: "reponse-illisible", statut: 502 };
  }
  const brutes = Array.isArray(json?.parties) ? json.parties.slice(0, PARTIES_MAX) : [];
  const parties = brutes
    .map((p) => ({
      titre: texte(p?.titre, 150),
      enonce: texte(p?.enonce, 8000),
      corrige: texte(p?.corrige, 8000),
      // Un barème farfelu (négatif, démesuré) vaut 0 : l'auteur le met.
      points: typeof p?.points === "number" && Number.isFinite(p.points) && p.points > 0 && p.points <= 100 ? demiPoint(p.points) : 0,
    }))
    .filter((p) => p.enonce);
  if (parties.length === 0) return { erreur: "decoupage-vide", statut: 422 };
  return { resultat: { parties } };
}
