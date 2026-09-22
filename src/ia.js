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
   - un chapitre part avec son cours : le texte écrit dans l'admin, ou
     celui extrait de son PDF. */
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
    // Cours écrit, ou texte extrait du PDF téléversé.
    return chapitre?.contenu || chapitre?.texteIA || "";
  }
  return "";
}

export const construireExtraits = (liens) =>
  liens.map((l) => ({
    type: l.type,
    // Le relais y ajoute la fiche de la matière saisie dans l'espace admin.
    matiere: l.matiere,
    titre: l.titre,
    detail: l.indisponible ? `${l.detail ?? ""} (pas encore publié)` : l.detail,
    contenu: contenuDe(l),
  }));

// `motDePasse` : seulement depuis l'espace admin, pour que les tests
// ne soient pas freinés par la limite de questions par minute.
export async function demanderIA(historique, liens, motDePasse) {
  if (!iaActive) throw new Error("IA non configurée");

  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_MAXIMUM);

  try {
    const reponse = await fetch(site.urlIA, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(motDePasse ? { "X-Admin": motDePasse } : {}),
      },
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

/* ---------------------------------------------------------------- */
/* Espace admin : l'éducation de l'IA, une fiche par matière          */
/* ---------------------------------------------------------------- */

/* Le mot de passe n'est vérifié que par le relais : le site n'en
   connaît aucun. Une erreur renvoie son code (`mot-de-passe`,
   `admin-non-configure`, `trop-de-requetes`…). */
async function appelAdmin(chemin, motDePasse, options = {}) {
  const reponse = await fetch(new URL(chemin, site.urlIA), {
    ...options,
    headers: { "Content-Type": "application/json", "X-Admin": motDePasse },
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new Error(donnees.erreur ?? `statut ${reponse.status}`);
  return donnees;
}

export const verifierAdmin = (motDePasse) => appelAdmin("/admin/verifier", motDePasse);

export const lireFiche = (matiere, motDePasse) =>
  appelAdmin(`/education/${matiere}`, motDePasse);

export const enregistrerFiche = (matiere, fiche, motDePasse) =>
  appelAdmin(`/education/${matiere}`, motDePasse, {
    method: "PUT",
    body: JSON.stringify(fiche),
  });

/* ---------------------------------------------------------------- */
/* Vérification d'une réponse, pour les tests                         */
/* ---------------------------------------------------------------- */

const normaliserPourTest = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");

/* `contient` : groupes de mots ; chaque groupe doit être présent, un
   seul de ses mots suffit. `exclut` : aucun de ces mots. Renvoie la
   liste des problèmes, vide si la réponse passe. Partagée par l'espace
   admin et le banc de test (`npm run banc-ia`). */
export function verifierReponse(reponse, { contient = [], exclut = [] }) {
  const t = normaliserPourTest(reponse);
  const problemes = [];
  for (const groupe of contient) {
    if (!groupe.some((mot) => t.includes(normaliserPourTest(mot)))) {
      problemes.push(`devrait contenir : ${groupe.join(" ou ")}`);
    }
  }
  for (const mot of exclut) {
    if (t.includes(normaliserPourTest(mot))) {
      problemes.push(`ne devrait pas contenir : ${mot}`);
    }
  }
  return problemes;
}
