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
const passerAuSuivant = (statut) => [404, 429, 500, 503].includes(statut);

export const listeModeles = (env) =>
  [env.MODELE || "gemini-3.6-flash", ...(env.MODELES_SECOURS ?? "").split(",")]
    .map((m) => m.trim())
    .filter((m, i, t) => m && t.indexOf(m) === i);

/* `requete` : le corps envoyé à generateContent (systemInstruction,
   contents, generationConfig). Renvoie { texte } ou { erreur, statut }. */
export async function interrogerGemini(requete, cle, env) {
  const corps = JSON.stringify(requete);
  const envoyer = (modele) =>
    fetch(`${API_GEMINI}/models/${encodeURIComponent(modele)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": cle },
      body: corps,
    });

  let reponse;
  for (const modele of listeModeles(env)) {
    reponse = await envoyer(modele);
    if (reponse.status === 503 || reponse.status === 500) {
      await pause(ATTENTE_AVANT_NOUVEL_ESSAI);
      reponse = await envoyer(modele);
    }
    if (reponse.ok || !passerAuSuivant(reponse.status)) break;
    console.log(`Modèle ${modele} indisponible (${reponse.status}), passage au suivant`);
  }

  if (reponse.status === 429) return { erreur: "quota", statut: 429 };
  if (reponse.status === 503) return { erreur: "surcharge", statut: 503 };
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
