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
   - « generer-qcm » : des questions de QCM écrites à partir du cours des
     chapitres choisis, réponses mélangées.
   - « a-retenir » : pour un exercice, le « À retenir » tiré de son
     énoncé et de sa correction ;
   - « extraire-exercices » : à partir du texte d'un PDF, remplir les
     champs d'un exercice, ou découper un TD entier en exercices.
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

async function demander(consigneTache, schema, env, maxOutputTokens = 8192) {
  const cle = env.GEMINI_API_KEY_ADMIN || env.GEMINI_API_KEY;
  const r = await interrogerGemini(
    {
      systemInstruction: { parts: [{ text: CONSIGNES }] },
      contents: [{ role: "user", parts: [{ text: consigneTache }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens,
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

/* ---- Générer des questions de QCM à partir du cours ---- */

const MAX_QUESTIONS_GENEREES = 15;
const MAX_TEXTE_COURS_QCM = 24000;

const normaliser = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* Mélange de Fisher-Yates, avec un aléa cryptographique. Les modèles
   placent volontiers la bonne réponse en premier : sans ce mélange, un
   étudiant la devinerait. */
function melanger(options, bonne) {
  const ordre = options.map((_, i) => i);
  const alea = crypto.getRandomValues(new Uint32Array(ordre.length));
  for (let i = ordre.length - 1; i > 0; i--) {
    const j = alea[i] % (i + 1);
    [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
  }
  return { options: ordre.map((i) => options[i]), bonne: ordre.indexOf(bonne) };
}

async function genererQcm(donnees, env) {
  const nombre = Math.min(Math.max(Math.round(Number(donnees?.nombre) || 5), 1), MAX_QUESTIONS_GENEREES);
  let budget = MAX_TEXTE_COURS_QCM;
  const chapitres = liste(donnees?.chapitres, MAX_CHAPITRES)
    .map((c) => {
      const t = texte(c?.texte, Math.max(budget, 0));
      budget -= t.length;
      return { titre: texte(c?.titre, 150), texte: t };
    })
    .filter((c) => c.titre);
  if (chapitres.length === 0) return { erreur: "rien-a-traiter", statut: 400 };
  const competences = liste(donnees?.competences, MAX_COMPETENCES)
    .map((c) => ({ id: texte(c?.id, 80), nom: texte(c?.nom, 120) }))
    .filter((c) => c.id && c.nom);
  const existantes = liste(donnees?.existantes, 200).map((e) => texte(e, 300)).filter(Boolean);
  const avecCours = chapitres.some((c) => c.texte);

  const consigne = `Matière : ${texte(donnees?.matiere, 120)}
Niveau visé : ${texte(donnees?.niveau, 30) || "Intermédiaire"}

${avecCours ? "Cours de référence (il fait foi : chaque question et chaque bonne réponse doivent pouvoir s'y vérifier) :" : "Chapitres (aucun cours rédigé : reste sur des notions classiques et sûres du programme LRSI) :"}
${chapitres.map((c) => `### ${c.titre}\n${c.texte || "(pas de cours rédigé)"}`).join("\n\n")}

Compétences de la matière (identifiant : nom) :
${competences.length ? competences.map((c) => `- ${c.id} : ${c.nom}`).join("\n") : "- aucune"}

Questions qui existent déjà (ne les répète pas, même reformulées) :
${existantes.length ? existantes.map((e) => `- ${e}`).join("\n") : "- aucune"}

Écris ${nombre} questions de QCM en français. Pour chacune :
- un énoncé clair, sans ambiguïté, qui n'a qu'une seule bonne réponse ;
- exactement 4 réponses proposées, courtes, de même longueur et de même style ; les mauvaises réponses sont plausibles (erreurs fréquentes des étudiants), jamais absurdes ;
- « bonne » : la position (0 à 3) de la bonne réponse ;
- une explication de 1 à 2 phrases qui justifie la bonne réponse et dit pourquoi le piège principal est faux ;
- l'identifiant de la compétence mesurée, ou une chaîne vide si aucune ne convient.
Varie les types : définitions, calculs (masques, hôtes, ports…), cas pratiques. Pas de « toutes les réponses » ni « aucune réponse ». Pour un calcul, vérifie ton résultat avant de l'écrire.`;

  const schema = {
    type: "OBJECT",
    properties: {
      questions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            enonce: { type: "STRING" },
            options: { type: "ARRAY", items: { type: "STRING" } },
            bonne: { type: "INTEGER" },
            explication: { type: "STRING" },
            competence: { type: "STRING" },
          },
          required: ["enonce", "options", "bonne", "explication", "competence"],
        },
      },
    },
    required: ["questions"],
  };

  const r = await demander(consigne, schema, env);
  if (r.erreur) return r;

  const ids = new Set(competences.map((c) => c.id));
  const dejaLa = new Set(existantes.map(normaliser));
  const vus = new Set();
  const questions = [];
  for (const q of liste(r.json?.questions, MAX_QUESTIONS_GENEREES)) {
    const enonce = texte(q?.enonce, 1000);
    const options = liste(q?.options, 6).map((o) => texte(o, 300));
    const bonne = Number(q?.bonne);
    const cle = normaliser(enonce);
    // Écartées : question vide ou déjà présente, réponses vides ou en
    // double, bonne réponse qui ne désigne aucune des réponses.
    if (!enonce || dejaLa.has(cle) || vus.has(cle)) continue;
    if (options.length < 3 || options.some((o) => !o)) continue;
    if (new Set(options.map(normaliser)).size !== options.length) continue;
    if (!Number.isInteger(bonne) || bonne < 0 || bonne >= options.length) continue;
    vus.add(cle);
    questions.push({
      enonce,
      ...melanger(options, bonne),
      explication: texte(q?.explication, 1500),
      competence: ids.has(q?.competence) ? q.competence : "",
    });
  }
  return { resultat: { questions, avecCours } };
}

/* ---- Proposer le « À retenir » d'un exercice ---- */

const MAX_TEXTE_EXERCICE = 8000;

async function aRetenir(donnees, env) {
  const enonce = texte(donnees?.enonce, MAX_TEXTE_EXERCICE);
  const correction = texte(donnees?.correction, MAX_TEXTE_EXERCICE);
  if (!enonce && !correction) return { erreur: "rien-a-traiter", statut: 400 };

  const consigne = `Matière : ${texte(donnees?.matiere, 120)}
Exercice : ${texte(donnees?.titre, 150)}

Énoncé :
${enonce || "(non fourni)"}

Correction :
${correction || "(non fournie : appuie-toi sur l'énoncé et sur les notions classiques du programme LRSI)"}

Écris le « À retenir » de cet exercice, affiché aux étudiants sous la correction : 1 à 3 phrases en français, qui donnent la notion ou la méthode clé à garder, et le piège le plus fréquent s'il y en a un. Ne recopie pas la correction, ne refais pas le calcul, pas de titre ni de puce. Donne aussi, en une phrase courte, la raison de ce choix.`;

  const schema = {
    type: "OBJECT",
    properties: {
      aRetenir: { type: "STRING" },
      raison: { type: "STRING" },
    },
    required: ["aRetenir", "raison"],
  };

  const r = await demander(consigne, schema, env);
  if (r.erreur) return r;
  const proposition = texte(r.json?.aRetenir, 2000);
  if (!proposition) return { erreur: "reponse-illisible", statut: 502 };
  return { resultat: { aRetenir: proposition, raison: texte(r.json?.raison, 200) } };
}

/* ---- Tirer des exercices du texte d'un PDF ----

   `un` : le texte est celui d'UN exercice (remplir ses champs) ; sinon
   c'est un TD entier, à découper en exercices. Le texte vient du PDF,
   lu dans le navigateur de l'auteur. */

const MAX_TEXTE_TD = 30000;
const MAX_EXERCICES_TD = 15;

async function extraireExercices(donnees, env) {
  const enonce = texte(donnees?.enonce, MAX_TEXTE_TD);
  const corrige = texte(donnees?.corrige, MAX_TEXTE_TD);
  if (!enonce) return { erreur: "rien-a-traiter", statut: 400 };
  const un = donnees?.un === true;

  const consigne = `Matière : ${texte(donnees?.matiere, 120)}
${un ? `Titre de l'exercice : ${texte(donnees?.titre, 150) || "(à proposer)"}` : ""}

Texte lu dans le PDF ${un ? "de l'énoncé" : "du TD (énoncés)"} :
"""
${enonce}
"""

${corrige ? `Texte lu dans le PDF du corrigé :\n"""\n${corrige}\n"""` : "Aucun corrigé fourni."}

${un ? "Ce texte est UN SEUL exercice : renvoie exactement un exercice." : `Découpe ce TD en exercices distincts (au plus ${MAX_EXERCICES_TD}), dans l'ordre du document. Un « Exercice 1 », « Exercice 2 »… donne un exercice chacun.`}

Pour chaque exercice :
- « titre » : court et parlant (le sujet, pas « Exercice 1 ») ;
- « enonce » : l'énoncé RECOPIÉ FIDÈLEMENT, sans le résumer ni changer les données. Remets en forme ce que la lecture du PDF a abîmé (coupures de lignes, espaces) ; mise en forme permise : « - » pour une liste, « 1. » pour une liste numérotée, **gras**, et \`\`\` sur une ligne seule avant et après un programme ;
- « indice » : un coup de pouce en une ou deux phrases, qui aide sans donner la réponse ;
- « etapes » : la méthode, une étape par élément, chaque étape en une phrase ;
- « reponse » : le résultat final (programme complet entre \`\`\`, calcul posé, ou valeur) ;
- « explication » : le « À retenir », 1 à 3 phrases : la notion clé et le piège fréquent ;
- « difficulte » : Facile, Moyen ou Difficile ; « duree » : estimation, par exemple « 20 min » ;
- « correctionParIA » : false si la correction vient du corrigé fourni, true si tu l'as rédigée toi-même.
Si un corrigé est fourni, la correction doit le suivre. Sinon, rédige-la toi-même et vérifie chaque calcul avant de l'écrire.`;

  const schema = {
    type: "OBJECT",
    properties: {
      exercices: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            titre: { type: "STRING" },
            enonce: { type: "STRING" },
            indice: { type: "STRING" },
            etapes: { type: "ARRAY", items: { type: "STRING" } },
            reponse: { type: "STRING" },
            explication: { type: "STRING" },
            difficulte: { type: "STRING", enum: ["Facile", "Moyen", "Difficile"] },
            duree: { type: "STRING" },
            correctionParIA: { type: "BOOLEAN" },
          },
          required: ["titre", "enonce", "indice", "etapes", "reponse", "explication", "difficulte", "duree", "correctionParIA"],
        },
      },
    },
    required: ["exercices"],
  };

  const r = await demander(consigne, schema, env, 32768);
  if (r.erreur) return r;

  const exercices = liste(r.json?.exercices, un ? 1 : MAX_EXERCICES_TD)
    .map((e) => ({
      titre: texte(e?.titre, 150),
      enonce: texte(e?.enonce, 5000),
      indice: texte(e?.indice, 1500),
      etapes: liste(e?.etapes, 20).map((s) => texte(s, 1500)).filter(Boolean),
      reponse: texte(e?.reponse, 5000),
      explication: texte(e?.explication, 2000),
      difficulte: ["Facile", "Moyen", "Difficile"].includes(e?.difficulte) ? e.difficulte : "Moyen",
      duree: texte(e?.duree, 20),
      correctionParIA: e?.correctionParIA !== false || !corrige,
    }))
    .filter((e) => e.enonce);
  if (exercices.length === 0) return { erreur: "reponse-illisible", statut: 502 };
  return { resultat: { exercices } };
}

const TACHES = {
  rattacher,
  "proposer-competences": proposerCompetences,
  "generer-qcm": genererQcm,
  "a-retenir": aRetenir,
  "extraire-exercices": extraireExercices,
};

export async function executerTacheAdmin(corps, env) {
  const tache = TACHES[corps?.tache];
  if (!tache) return { erreur: "tache-inconnue", statut: 400 };
  return tache(corps.donnees, env);
}
