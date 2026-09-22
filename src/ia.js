import { site } from "./data/site";
import { getExercice } from "./data/exercices";
import { getMatiere } from "./data/matieres";

/* ==================================================================
   Appel au relais IA (dossier `serveur-ia/`).

   Le navigateur ne parle jamais directement au modèle : il n'a pas la
   clé. Il envoie la conversation et les extraits trouvés par le guide
   au relais, qui ajoute ses consignes et interroge Gemini.

   Ce qui part : les questions de la conversation en cours, les
   réponses déjà reçues, et le contenu de la plateforme trouvé par le
   guide. Rien d'autre : ni profil, ni progression, ni scores.

   Toute erreur est remontée à l'appelant, qui retombe alors sur la
   réponse du guide : l'assistant ne reste jamais muet.
   ================================================================== */

export const iaActive = Boolean(site.urlIA);

// Le modèle gratuit met souvent 10 à 20 secondes à répondre.
const DELAI_MAXIMUM = 45_000;

/* Le contenu complet d'un lien trouvé par le guide, pour que l'IA
   s'appuie sur ce que la plateforme enseigne plutôt que sur sa seule
   mémoire. Ce contenu est déjà public : il est dans le site.

   - un exercice part avec son énoncé, son indice, sa méthode et sa
     correction ; les consignes du relais interdisent au modèle de
     livrer la correction d'emblée ;
   - un chapitre part avec son texte (`contenu`) dès qu'il sera
     rédigé dans `src/data/matieres.js`, sinon avec son résumé. */
function contenuDe(lien) {
  if (lien.type === "exercice") {
    const e = getExercice(lien.to.split("/").pop());
    if (!e) return "";
    return [
      `Énoncé : ${e.enonce}`,
      `Indice : ${e.indice}`,
      `Méthode : ${(e.etapes ?? []).join(" ")}`,
      `Correction : ${e.reponse}`,
      e.explication ? `À retenir : ${e.explication}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (lien.type === "chapitre") {
    const chapitre = getMatiere(lien.matiere)?.chapitres.find(
      (c) => c.titre === lien.titre
    );
    return chapitre?.contenu ?? "";
  }
  return "";
}

export const construireExtraits = (liens) =>
  liens.map((l) => ({
    type: l.type,
    titre: l.titre,
    detail: l.indisponible ? `${l.detail ?? ""} (pas encore publié)` : l.detail,
    contenu: contenuDe(l),
  }));

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
        extraits: construireExtraits(liens),
      }),
    });

    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok || !donnees.texte) {
      throw new Error(donnees.erreur ?? `statut ${reponse.status}`);
    }
    return donnees.texte;
  } catch (e) {
    throw new Error(controle.signal.aborted ? "delai" : e.message, { cause: e });
  } finally {
    clearTimeout(minuteur);
  }
}

/* Ce qu'on dit à l'étudiant quand l'IA n'a pas répondu, selon la
   raison renvoyée par le relais. */
export function raisonEchec(code) {
  switch (code) {
    case "surcharge":
      return "Le service d'IA gratuit est saturé en ce moment. Réessaie dans quelques secondes.";
    case "quota":
      return "Le quota gratuit de l'IA est atteint pour le moment. Réessaie un peu plus tard.";
    case "trop-de-requetes":
      return "Tu as posé beaucoup de questions d'un coup. Attends une minute avant de réessayer.";
    case "delai":
      return "L'IA a mis trop de temps à répondre. Réessaie.";
    default:
      return "L'IA n'a pas pu répondre (connexion ou service indisponible). Réessaie.";
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
