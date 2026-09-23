/* ==================================================================
   Statistiques anonymes des QCM.

   Quand un étudiant termine un QCM, le site envoie, pour chaque
   question, la réponse choisie (ou « pas de réponse »). Rien d'autre :
   ni identifiant, ni adresse IP, ni date par étudiant. Le relais n'en
   garde que des compteurs, question par question :

     stats:<id du QCM> → { questions: { <clé>: { enonce, bonne,
                           options, choix: [n, n, …], sansReponse } },
                           sessions, titre, matiere }

   L'admin y voit les questions les plus ratées, et la mauvaise réponse
   la plus choisie : de quoi savoir quoi réexpliquer.

   Une question est reconnue par son énoncé, comparé au contenu publié :
   un envoi qui ne correspond à rien est ignoré, et renuméroter les
   questions dans l'admin ne mélange pas leurs compteurs.

   Deux envois exactement simultanés peuvent faire perdre une unité
   (KV n'a pas d'incrément atomique) : sans importance pour des
   tendances.
   ================================================================== */

import { lireContenu } from "./contenu.js";

const PREFIXE = "stats:";
const ID_QCM = /^[a-z0-9-]{1,80}$/;
const MAX_QUESTIONS = 60;

const normaliser = (t) =>
  String(t ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function cleDe(enonce) {
  const octets = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normaliser(enonce)));
  return [...new Uint8Array(octets).slice(0, 8)].map((o) => o.toString(16).padStart(2, "0")).join("");
}

/* Envoi d'un étudiant : { qcm, reponses: [{ enonce, choix }] }, où
   `choix` est l'indice de la réponse choisie, ou null. */
export async function enregistrerStats(corps, env) {
  if (!env.EDUCATION) return { erreur: "indisponible", statut: 503 };
  const id = corps?.qcm;
  if (typeof id !== "string" || !ID_QCM.test(id)) return { erreur: "format", statut: 400 };
  const reponses = Array.isArray(corps?.reponses) ? corps.reponses.slice(0, MAX_QUESTIONS) : [];
  if (reponses.length === 0) return { erreur: "format", statut: 400 };

  const contenu = await lireContenu(env);
  const qcm = contenu?.qcms?.find((q) => q.id === id);
  if (!qcm) return { erreur: "introuvable", statut: 404 };
  const parEnonce = new Map(qcm.questions.map((q) => [normaliser(q.enonce), q]));

  const cle = PREFIXE + id;
  const stats = (await env.EDUCATION.get(cle, "json")) ?? { questions: {}, sessions: 0 };
  let comptees = 0;
  const vues = new Set();

  for (const r of reponses) {
    const question = parEnonce.get(normaliser(r?.enonce));
    if (!question) continue;
    const k = await cleDe(question.enonce);
    if (vues.has(k)) continue;
    vues.add(k);

    const s = stats.questions[k] ?? { choix: [], sansReponse: 0 };
    // L'énoncé, les réponses et la bonne réponse suivent le contenu
    // publié : l'admin lit toujours la version actuelle.
    s.enonce = question.enonce.slice(0, 300);
    s.options = question.options.map((o) => o.slice(0, 120));
    s.bonne = question.bonne;
    const choix = r?.choix;
    if (Number.isInteger(choix) && choix >= 0 && choix < question.options.length) {
      s.choix = question.options.map((_, i) => (s.choix[i] ?? 0) + (i === choix ? 1 : 0));
    } else {
      s.sansReponse = (s.sansReponse ?? 0) + 1;
    }
    stats.questions[k] = s;
    comptees++;
  }
  if (comptees === 0) return { erreur: "introuvable", statut: 404 };

  stats.sessions = (stats.sessions ?? 0) + 1;
  stats.titre = qcm.titre.slice(0, 150);
  stats.matiere = qcm.matiere;
  await env.EDUCATION.put(cle, JSON.stringify(stats));
  return { resultat: { ok: true } };
}

/* Pour l'admin : toutes les statistiques, QCM par QCM. */
export async function lireStats(env) {
  const qcms = [];
  let curseur;
  do {
    const page = await env.EDUCATION.list({ prefix: PREFIXE, cursor: curseur });
    for (const { name } of page.keys) {
      const s = await env.EDUCATION.get(name, "json");
      if (s) qcms.push({ id: name.slice(PREFIXE.length), ...s });
    }
    curseur = page.list_complete ? undefined : page.cursor;
  } while (curseur);
  return { qcms };
}

/* Remettre les compteurs à zéro (après avoir réécrit un QCM, par exemple). */
export async function effacerStats(env) {
  let curseur;
  let n = 0;
  do {
    const page = await env.EDUCATION.list({ prefix: PREFIXE, cursor: curseur });
    for (const { name } of page.keys) {
      await env.EDUCATION.delete(name);
      n++;
    }
    curseur = page.list_complete ? undefined : page.cursor;
  } while (curseur);
  return { effaces: n };
}
