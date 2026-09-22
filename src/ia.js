import { site } from "./data/site";

/* ==================================================================
   Appel au relais IA (dossier `serveur-ia/`).

   Le navigateur ne parle jamais directement au modèle : il n'a pas la
   clé. Il envoie la conversation et les extraits trouvés par le guide
   au relais, qui ajoute ses consignes et interroge Gemini.

   Ce qui part : les questions de la conversation en cours, les
   réponses déjà reçues, et les titres et résumés des contenus trouvés
   par le guide. Rien d'autre : ni profil, ni progression, ni scores.

   Toute erreur est remontée à l'appelant, qui retombe alors sur la
   réponse du guide : l'assistant ne reste jamais muet.
   ================================================================== */

export const iaActive = Boolean(site.urlIA);

// Le modèle gratuit met souvent 10 à 20 secondes à répondre.
const DELAI_MAXIMUM = 45_000;

export async function demanderIA(historique, liens) {
  if (!iaActive) throw new Error("IA non configurée");

  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MAXIMUM);

  try {
    const reponse = await fetch(site.urlIA, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controle.signal,
      body: JSON.stringify({
        messages: historique,
        extraits: liens.map((l) => ({
          type: l.type,
          titre: l.titre,
          detail: l.indisponible ? `${l.detail ?? ""} (pas encore publié)` : l.detail,
        })),
      }),
    });

    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok || !donnees.texte) {
      throw new Error(donnees.erreur ?? `statut ${reponse.status}`);
    }
    return donnees.texte;
  } finally {
    clearTimeout(minuteur);
  }
}

/* Le modèle écrit parfois en Markdown malgré la consigne. Plutôt que
   d'interpréter du HTML venu de l'extérieur, on retire les marques de
   mise en forme et on découpe en paragraphes et listes simples, que
   React affiche comme du texte. */
export function decouperReponse(texte) {
  const blocs = [];
  for (const ligneBrute of texte.split("\n")) {
    const ligne = ligneBrute
      .replace(/\*\*|__|`/g, "")
      .replace(/\$([^$\n]+)\$/g, "$1")
      .replace(/^#+\s*/, "")
      .trim();
    if (!ligne) continue;

    const puce = ligne.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (puce) {
      const dernier = blocs.at(-1);
      if (dernier?.type === "liste") dernier.elements.push(puce[2]);
      else blocs.push({ type: "liste", elements: [puce[2]] });
    } else {
      blocs.push({ type: "paragraphe", texte: ligne });
    }
  }
  return blocs;
}
