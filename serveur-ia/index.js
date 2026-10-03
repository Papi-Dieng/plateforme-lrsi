/* ==================================================================
   Relais entre le site et le modèle de langage (Google Gemini).

   Le site est statique : il ne peut pas garder de secret. Ce petit
   serveur, hébergé gratuitement chez Cloudflare, détient la clé
   d'accès et appelle le modèle à la place du navigateur. La clé ne
   quitte jamais ce serveur.

   Il ne stocke aucune question posée à l'assistant, ni adresse IP. Il
   garde ce que l'espace admin publie, protégé par un mot de passe : le
   contenu pédagogique (`contenu.js`) et l'éducation de l'IA
   (`education.js`) ; et des compteurs anonymes par question de QCM
   (`stats.js`), que l'étudiant peut refuser dans ses paramètres.

   Deux agents : l'assistant des étudiants (clé GEMINI_API_KEY), et
   l'agent de l'espace admin (`agent-admin.js`, clé GEMINI_API_KEY_ADMIN),
   joignable seulement avec le mot de passe.

   Garde-fous, tous appliqués ici et non dans le site, puisque le
   site peut être contourné :
   - seuls les domaines listés dans ORIGINES peuvent l'appeler ;
   - taille des questions et de l'historique bornée ; une image jointe
     n'est acceptée qu'en JPEG, PNG ou WebP, et de 3 Mo au plus ;
   - nombre de requêtes par minute limité pour chaque visiteur ;
   - les consignes données au modèle sont écrites côté serveur, dans
     `consignes.js` : un visiteur ne peut pas les remplacer.
   ================================================================== */

import { CONSIGNES } from "./consignes.js";
import {
  ID_MATIERE,
  ecrireFiche,
  educationPour,
  lireFiche,
  motDePasseValide,
} from "./education.js";
import {
  lireContenu,
  publierContenu,
  restaurerContenu,
  versionPublique,
} from "./contenu.js";
import { menagePdfs, servirPdf, televerserPdf } from "./fichiers.js";
import { API_GEMINI, interrogerGemini, listeModeles } from "./gemini.js";
import { executerTacheAdmin } from "./agent-admin.js";
import { avisRedaction } from "./avis.js";
import { effacerStats, enregistrerStats, lireStats } from "./stats.js";
import { composerPlanning } from "./planning-ia.js";
import { inscrireTelephone } from "./comptes.js";
import { routeSecours } from "./secours.js";

const MAX_MESSAGES = 10;
const MAX_CARACTERES = 1500;
const MAX_EXTRAITS = 8;
const MAX_CARACTERES_DETAIL = 400;
// Le contenu complet d'un exercice ou d'un chapitre, et le total envoyé
// au modèle : de quoi s'appuyer sur la plateforme sans exploser le quota.
const MAX_CARACTERES_CONTENU = 3000;
const MAX_CARACTERES_CONTENUS = 9000;
// Une image jointe par l'étudiant (photo d'exercice, schéma) : le site la
// réduit avant l'envoi, le relais vérifie son type et sa taille.
const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
const MAX_CARACTERES_IMAGE = 4_000_000; // environ 3 Mo une fois décodée
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

function entetesCors(origine, env) {
  const autorisees = (env.ORIGINES ?? "").split(",").map((o) => o.trim());
  if (!autorisees.includes(origine)) return null;
  return {
    "Access-Control-Allow-Origin": origine,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin, X-Nom-Fichier",
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

  let budget = MAX_CARACTERES_CONTENUS;
  const extraits = (Array.isArray(corps?.extraits) ? corps.extraits : [])
    .slice(0, MAX_EXTRAITS)
    .map((e) => {
      const contenu = texte(e?.contenu, Math.min(MAX_CARACTERES_CONTENU, budget));
      budget -= contenu.length;
      return {
        type: texte(e?.type, 20),
        matiere: texte(e?.matiere, 40),
        titre: texte(e?.titre, 200),
        detail: texte(e?.detail, MAX_CARACTERES_DETAIL),
        contenu,
      };
    })
    .filter((e) => e.titre);

  // Une image invalide fait refuser la demande plutôt que d'être ignorée
  // en silence : l'étudiant croirait qu'elle a été lue.
  let image = null;
  if (corps?.image !== undefined) {
    const { type, donnees } = corps.image ?? {};
    if (!TYPES_IMAGE.includes(type) || typeof donnees !== "string" || donnees.length > MAX_CARACTERES_IMAGE || !BASE64.test(donnees)) {
      return { invalide: "image" };
    }
    image = { type, donnees };
  }

  return { messages, extraits, image };
}

function construireConsignes(extraits, education, avecImage) {
  const parties = [CONSIGNES];
  if (education) parties.push(education);
  if (avecImage) {
    parties.push(
      "L'étudiant a joint une image à sa dernière question (photo d'un exercice, d'un schéma, d'une capture). Dis en une phrase ce que tu y lis avant de répondre. Si elle est illisible ou sans rapport avec ses révisions, dis-le simplement au lieu de deviner."
    );
  }

  if (extraits.length === 0) {
    parties.push(
      "Aucun contenu de la plateforme ne correspond à cette question : réponds avec tes connaissances, en restant prudent."
    );
  } else {
    const liste = extraits
      .map((e) => {
        const entete = `### [${e.type}] ${e.titre}${e.detail ? ` : ${e.detail}` : ""}`;
        return e.contenu ? `${entete}\n${e.contenu}` : entete;
      })
      .join("\n\n");
    parties.push(
      `Contenu de la plateforme lié à la question (il fait foi ; les corrections d'exercices ne se donnent pas d'emblée) :\n\n${liste}`
    );
  }
  return parties.join("\n\n");
}

async function appelerGemini({ messages, extraits, image }, env) {
  const education = await educationPour(env, extraits).catch((e) => {
    // Une fiche illisible ne doit pas priver l'étudiant de réponse.
    console.log("Éducation illisible, consignes générales seules", e);
    return "";
  });
  return interrogerGemini(
    {
      systemInstruction: { parts: [{ text: construireConsignes(extraits, education, Boolean(image)) }] },
      // L'image accompagne la dernière question seulement.
      contents: messages.map((m, i) => ({
        role: m.role,
        parts: [
          ...(image && i === messages.length - 1 ? [{ inlineData: { mimeType: image.type, data: image.donnees } }] : []),
          { text: m.texte },
        ],
      })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    },
    env.GEMINI_API_KEY,
    env
  );
}

export default {
  async fetch(requete, env, ctx) {
    // Un PDF de cours s'ouvre par un simple lien, sans en-tête d'origine :
    // il est servi avant le contrôle des origines. Lecture seule.
    const cheminBrut = new URL(requete.url).pathname;
    if (requete.method === "GET" && cheminBrut.startsWith("/fichiers/")) {
      return servirPdf(cheminBrut.slice("/fichiers/".length), env);
    }

    const origine = requete.headers.get("Origin") ?? "";
    const chemin0 = new URL(requete.url).pathname;
    // La version hors ligne, ouverte depuis un fichier, envoie l'origine
    // « null ». Elle peut LIRE le contenu publié, déjà public, et rien
    // d'autre : ni l'IA, ni l'espace admin, ni les comptes.
    if (origine === "null" && requete.method === "GET" && chemin0 === "/contenu") {
      const contenu = env.EDUCATION ? await lireContenu(env) : null;
      return new Response(JSON.stringify(contenu ? versionPublique(contenu) : null), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "null",
        },
      });
    }

    const cors = entetesCors(origine, env);
    if (!cors) return new Response("Origine non autorisée", { status: 403 });

    if (requete.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!env.GEMINI_API_KEY) return json({ erreur: "configuration" }, 500, cors);

    // Entretien : les noms des modèles que la clé peut utiliser, pour
    // choisir MODELE et MODELES_SECOURS. Seulement des noms, jamais la clé.
    if (requete.method === "GET" && new URL(requete.url).pathname === "/modeles") {
      const r = await fetch(`${API_GEMINI}/models?pageSize=200`, {
        headers: { "x-goog-api-key": env.GEMINI_API_KEY },
      });
      const { models = [] } = await r.json();
      return json(
        {
          utilises: listeModeles(env),
          disponibles: models
            .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
            .map((m) => m.name.replace("models/", "")),
        },
        r.ok ? 200 : 502,
        cors
      );
    }

    const chemin = new URL(requete.url).pathname;

    // Le contenu publié, lu par chaque visiteur à l'ouverture du site :
    // public, et hors de la limite par visiteur (tout un campus peut
    // partager la même adresse IP). Pas de cache navigateur : une
    // publication doit se voir au rechargement suivant.
    if (chemin === "/contenu" && requete.method === "GET") {
      const contenu = env.EDUCATION ? await lireContenu(env) : null;
      return new Response(JSON.stringify(contenu ? versionPublique(contenu) : null), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          ...cors,
        },
      });
    }

    // Limite par visiteur, si elle est déclarée dans wrangler.toml. Elle
    // s'applique aussi aux essais de mot de passe : 10 par minute au
    // plus. Seul l'admin authentifié en est dispensé, pour lancer ses
    // tests d'un coup.
    const motDePasse = requete.headers.get("X-Admin");
    const admin = await motDePasseValide(motDePasse, env);
    if (env.LIMITEUR && !admin) {
      const ip = requete.headers.get("CF-Connecting-IP") ?? "inconnu";
      const { success } = await env.LIMITEUR.limit({ key: ip });
      if (!success) return json({ erreur: "trop-de-requetes" }, 429, cors);
    }

    /* ---- Espace admin : contenu publié et éducation de l'IA ---- */
    if (chemin.startsWith("/admin/") || chemin.startsWith("/education/")) {
      if (!env.ADMIN_MOT_DE_PASSE || !env.EDUCATION) {
        return json({ erreur: "admin-non-configure" }, 503, cors);
      }
      if (!admin) return json({ erreur: "mot-de-passe" }, 401, cors);
      if (chemin === "/admin/verifier") return json({ ok: true }, 200, cors);

      if (chemin === "/admin/contenu") {
        // L'admin voit tout, y compris les annales en attente d'autorisation.
        if (requete.method === "GET") return json(await lireContenu(env), 200, cors);
        if (requete.method === "PUT") {
          const brut = await requete.text();
          if (brut.length > 2 * 3_000_000) return json({ erreur: "trop-gros" }, 413, cors);
          let donnees;
          try {
            donnees = JSON.parse(brut);
          } catch {
            return json({ erreur: "format" }, 400, cors);
          }
          const r = await publierContenu(env, donnees);
          if (r.erreur) return json(r, 413, cors);
          // Ménage des PDF qui ne servent plus, après la réponse.
          ctx?.waitUntil(menagePdfs(env, r.versions).catch((e) => console.log("Ménage des PDF", e)));
          return json(r.contenu, 200, cors);
        }
        return json({ erreur: "methode" }, 405, cors);
      }
      if (chemin === "/admin/ia" && requete.method === "POST") {
        let corps;
        try {
          corps = await requete.json();
        } catch {
          return json({ erreur: "format" }, 400, cors);
        }
        try {
          const r = await executerTacheAdmin(corps, env);
          return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
        } catch (e) {
          console.log("Agent admin", e);
          return json({ erreur: "reseau" }, 502, cors);
        }
      }
      if (chemin === "/admin/fichiers" && requete.method === "PUT") {
        const r = await televerserPdf(requete, env);
        return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.fichier, 200, cors);
      }
      if (chemin === "/admin/contenu/restaurer" && requete.method === "POST") {
        const r = await restaurerContenu(env);
        return r.erreur ? json(r, 404, cors) : json(r.contenu, 200, cors);
      }
      if (chemin === "/admin/stats" && requete.method === "GET") return json(await lireStats(env), 200, cors);
      if (chemin === "/admin/stats/effacer" && requete.method === "POST") {
        return json(await effacerStats(env), 200, cors);
      }
      if (!chemin.startsWith("/education/")) return json({ erreur: "introuvable" }, 404, cors);

      const id = chemin.slice("/education/".length);
      if (!ID_MATIERE.test(id)) return json({ erreur: "matiere" }, 400, cors);

      if (requete.method === "GET") return json(await lireFiche(env, id), 200, cors);
      if (requete.method === "PUT") {
        let fiche;
        try {
          fiche = await requete.json();
        } catch {
          return json({ erreur: "format" }, 400, cors);
        }
        return json(await ecrireFiche(env, id, fiche), 200, cors);
      }
      return json({ erreur: "methode" }, 405, cors);
    }

    // Récupération des comptes téléphone (`secours.js`) : code et email
    // de secours. Soumise à la limite par visiteur, en plus du blocage
    // du numéro après cinq codes faux.
    if (chemin.startsWith("/comptes/secours")) {
      try {
        const r = await routeSecours(chemin, requete, env);
        return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
      } catch (e) {
        console.log("Secours du compte", e);
        return json({ erreur: "reseau" }, 502, cors);
      }
    }

    if (requete.method !== "POST") return json({ erreur: "methode" }, 405, cors);

    // Le programme de révision composé par l'IA (`planning-ia.js`) :
    // soumis, comme l'assistant, à la limite par visiteur.
    if (chemin === "/planning-ia") {
      let corps;
      try {
        corps = await requete.json();
      } catch {
        return json({ erreur: "format" }, 400, cors);
      }
      try {
        const r = await composerPlanning(corps, env);
        return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
      } catch (e) {
        console.log("Programme de révision", e);
        return json({ erreur: "reseau" }, 502, cors);
      }
    }

    // Les réponses anonymes d'un QCM terminé (`stats.js`) : soumises à la
    // limite par visiteur, comme le reste.
    if (chemin === "/stats") {
      let corps;
      try {
        corps = await requete.json();
      } catch {
        return json({ erreur: "format" }, 400, cors);
      }
      const r = await enregistrerStats(corps, env);
      return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
    }

    // Inscription par téléphone (`comptes.js`) : soumise à la limite par
    // visiteur, contre les inscriptions en rafale.
    if (chemin === "/comptes/telephone") {
      let corps;
      try {
        corps = await requete.json();
      } catch {
        return json({ erreur: "format" }, 400, cors);
      }
      try {
        const r = await inscrireTelephone(corps, env);
        return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
      } catch (e) {
        console.log("Inscription par téléphone", e);
        return json({ erreur: "reseau" }, 502, cors);
      }
    }

    // L'avis de l'IA sur une réponse rédigée dans un devoir : soumis,
    // comme l'assistant, à la limite de requêtes par visiteur.
    if (chemin === "/avis-redaction") {
      let corps;
      try {
        corps = await requete.json();
      } catch {
        return json({ erreur: "format" }, 400, cors);
      }
      try {
        const r = await avisRedaction(corps, env);
        return r.erreur ? json({ erreur: r.erreur }, r.statut, cors) : json(r.resultat, 200, cors);
      } catch (e) {
        console.log("Avis sur une rédaction", e);
        return json({ erreur: "reseau" }, 502, cors);
      }
    }

    let corps;
    try {
      corps = await requete.json();
    } catch {
      return json({ erreur: "format" }, 400, cors);
    }

    const demande = lireDemande(corps);
    if (!demande) return json({ erreur: "format" }, 400, cors);
    if (demande.invalide) return json({ erreur: demande.invalide }, 400, cors);

    try {
      const resultat = await appelerGemini(demande, env);
      // `image: "lue"` dit au site que l'image a bien été transmise.
      return resultat.erreur
        ? json({ erreur: resultat.erreur }, resultat.statut, cors)
        : json({ texte: resultat.texte, ...(demande.image && { image: "lue" }) }, 200, cors);
    } catch (e) {
      console.log("Appel au modèle impossible", e);
      return json({ erreur: "reseau" }, 502, cors);
    }
  },
};
