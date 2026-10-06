/* ==================================================================
   Appel à Google Gemini, partagé par les deux agents :
   - l'assistant des étudiants (clé GEMINI_API_KEY) ;
   - l'agent de l'espace admin (clé GEMINI_API_KEY_ADMIN, créée dans un
     autre projet Google : son quota gratuit est séparé, et un gros
     traitement admin ne prive pas les étudiants de réponses).

   L'offre gratuite renvoie souvent « modèle surchargé » (503) pendant
   quelques secondes. On réessaie une fois le même modèle, puis on
   passe aux modèles de secours (MODELES_SECOURS dans wrangler.toml),
   dans l'ordre. Chaque modèle a son propre quota gratuit : un secours
   sert donc aussi quand le principal a épuisé le sien (429).
   ================================================================== */

export const API_GEMINI = "https://generativelanguage.googleapis.com/v1beta";

const ATTENTE_AVANT_NOUVEL_ESSAI = 1500;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const passerAuSuivant = (statut) => [404, 429, 500, 503, 504].includes(statut);

export const listeModeles = (env) =>
  [env.MODELE || "gemini-3.6-flash", ...(env.MODELES_SECOURS ?? "").split(",")]
    .map((m) => m.trim())
    .filter((m, i, t) => m && t.indexOf(m) === i);

/* Les modèles pour une tâche courte (corriger un exercice) : le modèle
   rapide d'abord (MODELE_RAPIDE dans wrangler.toml), puis les autres.
   Mesuré le 6 octobre 2026 : le modèle principal saturé faisait attendre
   jusqu'à 100 s, le modèle léger répondait en 3,6 s. */
// Le principal, le plus lent quand il est saturé, passe en dernier.
export const modelesRapides = (env) =>
  [env.MODELE_RAPIDE, ...(env.MODELES_SECOURS ?? "").split(","), env.MODELE || "gemini-3.6-flash"]
    .map((m) => m?.trim())
    .filter((m, i, t) => m && t.indexOf(m) === i);

/* `requete` : le corps envoyé à generateContent (systemInstruction,
   contents, generationConfig). Renvoie { texte } ou { erreur, statut }.
   Options : `modeles`, l'ordre des modèles à essayer ; `delaiMax`, en
   millisecondes, au-delà duquel un modèle qui ne répond pas est
   abandonné pour le suivant (sans limite par défaut). */
export async function interrogerGemini(requete, cle, env, { modeles = listeModeles(env), delaiMax } = {}) {
  const corps = JSON.stringify(requete);
  // Chaque appel note son modèle, son statut et sa durée dans le journal
  // (`npx wrangler tail`) : c'est ce qui dit où passe le temps d'attente.
  const envoyer = async (modele) => {
    const debut = Date.now();
    const arret = new AbortController();
    const minuteur = delaiMax ? setTimeout(() => arret.abort(), delaiMax) : null;
    let r;
    try {
      r = await fetch(`${API_GEMINI}/models/${encodeURIComponent(modele)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
        body: corps,
        signal: arret.signal,
      });
    } catch (e) {
      if (!arret.signal.aborted) throw e;
      // Trop long : traité comme un modèle saturé, on passe au suivant.
      r = new Response(null, { status: 504 });
    } finally {
      clearTimeout(minuteur);
    }
    console.log(`Gemini ${modele} : ${r.status} en ${((Date.now() - debut) / 1000).toFixed(1)} s`);
    return r;
  };

  let reponse;
  for (const modele of modeles) {
    reponse = await envoyer(modele);
    // Pour une tâche courte (`delaiMax`), un modèle saturé n'est pas
    // réessayé : passer au suivant est plus rapide qu'attendre.
    if (!delaiMax && (reponse.status === 503 || reponse.status === 500)) {
      await pause(ATTENTE_AVANT_NOUVEL_ESSAI);
      reponse = await envoyer(modele);
    }
    if (reponse.ok || !passerAuSuivant(reponse.status)) break;
    console.log(`Modèle ${modele} indisponible (${reponse.status}), passage au suivant`);
  }

  // Tâche courte : si tous étaient saturés, la saturation de l'offre
  // gratuite ne dure souvent que quelques secondes. Un dernier essai du
  // premier modèle, après une courte pause, plutôt qu'une erreur.
  if (delaiMax && reponse.status === 503) {
    await pause(ATTENTE_AVANT_NOUVEL_ESSAI);
    reponse = await envoyer(modeles[0]);
  }

  if (reponse.status === 429) return { erreur: "quota", statut: 429 };
  if (reponse.status === 503) return { erreur: "surcharge", statut: 503 };
  if (reponse.status === 504) return { erreur: "delai", statut: 504 };
  if (!reponse.ok) {
    console.log("Gemini a refusé la requête", reponse.status, await reponse.text());
    return { erreur: "modele", statut: 502 };
  }

  const donnees = await reponse.json();
  const texte = (donnees.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  return texte ? { texte } : { erreur: "vide", statut: 502 };
}
