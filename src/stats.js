import { site } from "./data/site";

/* ==================================================================
   Statistiques anonymes des QCM, côté étudiant.

   À la fin d'un QCM, le site envoie au relais, pour chaque question,
   la réponse choisie (ou « pas de réponse »). Rien d'autre : ni nom,
   ni identifiant, ni score global. L'admin y voit quelles questions
   sont le plus ratées, pour savoir quoi réexpliquer.

   L'étudiant peut refuser dans ses paramètres : le refus est gardé
   dans ce navigateur, et plus rien n'est envoyé.
   ================================================================== */

const CLE_REFUS = "lrsi-stats-refus";

export function statsRefusees() {
  try {
    return localStorage.getItem(CLE_REFUS) === "1";
  } catch {
    return false;
  }
}

export function choisirStats(accepter) {
  try {
    if (accepter) localStorage.removeItem(CLE_REFUS);
    else localStorage.setItem(CLE_REFUS, "1");
  } catch {
    /* stockage indisponible : le choix vaut pour cette visite */
  }
}

/* `choix[i]` : l'indice de la réponse choisie à la question i, ou
   undefined. Envoi silencieux : un échec ne gêne jamais l'étudiant. */
export function envoyerStats(qcm, choix) {
  if (statsRefusees() || !site.urlIA || !qcm?.questions?.length) return;
  const corps = {
    qcm: qcm.id,
    reponses: qcm.questions.map((q, i) => ({
      enonce: q.enonce,
      choix: Number.isInteger(choix[i]) ? choix[i] : null,
    })),
  };
  try {
    fetch(new URL("/stats", site.urlIA), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* adresse du relais invalide : rien à envoyer */
  }
}
