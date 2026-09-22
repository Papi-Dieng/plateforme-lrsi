/* ==================================================================
   Relais entre le site et le modèle de langage (Google Gemini).

   Le site est statique : il ne peut pas garder de secret. Ce petit
   serveur, hébergé gratuitement chez Cloudflare, détient la clé
   d'accès et appelle le modèle à la place du navigateur. La clé ne
   quitte jamais ce serveur.

   Il ne stocke rien : ni question, ni réponse, ni adresse IP.

   Garde-fous, tous appliqués ici et non dans le site, puisque le
   site peut être contourné :
   - seuls les domaines listés dans ORIGINES peuvent l'appeler ;
   - taille des questions et de l'historique bornée ;
   - nombre de requêtes par minute limité pour chaque visiteur ;
   - les consignes données au modèle sont écrites ici, un visiteur
     ne peut pas les remplacer.
   ================================================================== */

const MAX_MESSAGES = 10;
const MAX_CARACTERES = 1500;
const MAX_EXTRAITS = 8;
const MAX_CARACTERES_EXTRAIT = 400;

const CONSIGNES = `Tu es l'assistant de révision d'une plateforme gratuite pour les étudiants de Licence Réseaux et Systèmes Informatiques (LRSI).

Ton rôle :
- Expliquer les notions de réseaux, systèmes, programmation et cybersécurité, simplement, avec un petit exemple quand c'est utile.
- Répondre en français, tutoyer l'étudiant, rester court : 150 mots au maximum sauf si on te demande plus.
- Écrire en texte simple, sans titres, tableaux ni formules LaTeX (écris 2^8 - 2, pas $2^8 - 2$). Des listes courtes commençant par « - » sont permises.

Règles :
- Un extrait du contenu de la plateforme peut t'être fourni. S'il traite la question, appuie-toi dessus en priorité et invite l'étudiant à ouvrir le chapitre, l'exercice ou le QCM correspondant : les liens s'affichent sous ta réponse.
- Ne cite jamais un chapitre, un exercice ou un QCM qui n'est pas dans l'extrait : il n'existe peut-être pas.
- Si tu n'es pas sûr d'une information, dis-le franchement et renvoie vers le cours ou l'enseignant, qui font foi.
- Pour un exercice, ne donne pas la réponse finale d'emblée : donne la méthode et un indice, puis la réponse seulement si l'étudiant la redemande.
- Refuse poliment ce qui n'a rien à voir avec les études, et ne rédige pas de devoir à rendre à la place de l'étudiant.
- Ne demande jamais d'information personnelle.`;

function entetesCors(origine, env) {
  const autorisees = (env.ORIGINES ?? "").split(",").map((o) => o.trim());
  if (!autorisees.includes(origine)) return null;
  return {
    "Access-Control-Allow-Origin": origine,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (corps, statut, cors) =>
  new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });

const texte = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/* Le site envoie l'historique et les extraits trouvés par le guide.
   Tout est revalidé ici : ce qui ne ressemble pas à ce qu'on attend
   est écarté, et rien ne dépasse les bornes. */
function lireDemande(corps) {
  const messages = (Array.isArray(corps?.messages) ? corps.messages : [])
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m?.role === "assistant" ? "model" : "user",
      texte: texte(m?.texte, MAX_CARACTERES),
    }))
    .filter((m) => m.texte);

  // Gemini exige que la conversation commence et finisse par l'étudiant.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (messages.length === 0 || messages.at(-1).role !== "user") return null;

  const extraits = (Array.isArray(corps?.extraits) ? corps.extraits : [])
    .slice(0, MAX_EXTRAITS)
    .map((e) => ({
      type: texte(e?.type, 20),
      titre: texte(e?.titre, 200),
      detail: texte(e?.detail, MAX_CARACTERES_EXTRAIT),
    }))
    .filter((e) => e.titre);

  return { messages, extraits };
}

function construireConsignes(extraits) {
  if (extraits.length === 0) {
    return `${CONSIGNES}\n\nAucun contenu de la plateforme ne correspond à cette question.`;
  }
  const liste = extraits
    .map((e) => `- [${e.type}] ${e.titre}${e.detail ? ` : ${e.detail}` : ""}`)
    .join("\n");
  return `${CONSIGNES}\n\nContenu de la plateforme lié à la question :\n${liste}`;
}

/* L'offre gratuite renvoie souvent « modèle surchargé » (503) pendant
   quelques secondes. On réessaie donc, en espaçant les tentatives,
   avant d'abandonner. */
const ATTENTES_AVANT_NOUVEL_ESSAI = [1500, 3000];
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function appelerGemini({ messages, extraits }, env) {
  const modele = env.MODELE || "gemini-3.6-flash";
  const envoyer = () =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modele)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: construireConsignes(extraits) }] },
          contents: messages.map((m) => ({ role: m.role, parts: [{ text: m.texte }] })),
          generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
        }),
      }
    );

  let reponse = await envoyer();
  for (const attente of ATTENTES_AVANT_NOUVEL_ESSAI) {
    if (reponse.status !== 503 && reponse.status !== 500) break;
    await pause(attente);
    reponse = await envoyer();
  }

  if (reponse.status === 429) return { erreur: "quota", statut: 429 };
  if (reponse.status === 503) return { erreur: "surcharge", statut: 503 };
  if (!reponse.ok) {
    console.log("Gemini a refusé la requête", reponse.status, await reponse.text());
    return { erreur: "modele", statut: 502 };
  }

  const donnees = await reponse.json();
  const resultat = (donnees.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  return resultat ? { texte: resultat } : { erreur: "vide", statut: 502 };
}

export default {
  async fetch(requete, env) {
    const cors = entetesCors(requete.headers.get("Origin") ?? "", env);
    if (!cors) return new Response("Origine non autorisée", { status: 403 });

    if (requete.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (requete.method !== "POST") return json({ erreur: "methode" }, 405, cors);

    if (!env.GEMINI_API_KEY) return json({ erreur: "configuration" }, 500, cors);

    // Limite par visiteur, si elle est déclarée dans wrangler.toml.
    if (env.LIMITEUR) {
      const ip = requete.headers.get("CF-Connecting-IP") ?? "inconnu";
      const { success } = await env.LIMITEUR.limit({ key: ip });
      if (!success) return json({ erreur: "trop-de-requetes" }, 429, cors);
    }

    let corps;
    try {
      corps = await requete.json();
    } catch {
      return json({ erreur: "format" }, 400, cors);
    }

    const demande = lireDemande(corps);
    if (!demande) return json({ erreur: "format" }, 400, cors);

    try {
      const resultat = await appelerGemini(demande, env);
      return resultat.erreur
        ? json({ erreur: resultat.erreur }, resultat.statut, cors)
        : json({ texte: resultat.texte }, 200, cors);
    } catch (e) {
      console.log("Appel au modèle impossible", e);
      return json({ erreur: "reseau" }, 502, cors);
    }
  },
};
