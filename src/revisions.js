import { ajouterJours, aujourdhui } from "./planning";

/* ==================================================================
   Révision espacée des QCM.

   On retient mieux en revoyant une notion à intervalles qui
   s'allongent qu'en la répétant d'affilée. Ici :

   - un QCM raté (sous le seuil de réussite) revient dans 2 jours ;
   - réussi le jour prévu (ou après), il revient de plus en plus tard :
     5 jours, puis 12, puis 30 ;
   - réussi une dernière fois après 30 jours : il est acquis et sort de
     la liste ;
   - raté à nouveau : retour à 2 jours.

   Le refaire avant la date prévue ne change rien : c'est justement
   l'écart qui fait retenir.

   Dans le navigateur, clé `lrsi-revisions` :
     { idQcm: { du: "AAAA-MM-JJ", etape: 0 à 3 } }
   Le planning l'affiche, et les rappels s'en servent.
   ================================================================== */

export const CLE_REVISIONS = "lrsi-revisions";
export const INTERVALLES = [2, 5, 12, 30];

export function lireRevisions() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_REVISIONS) ?? "null");
    return brut && typeof brut === "object" && !Array.isArray(brut) ? brut : {};
  } catch {
    return {};
  }
}

function ecrire(revisions) {
  try {
    localStorage.setItem(CLE_REVISIONS, JSON.stringify(revisions));
  } catch {
    /* stockage indisponible : la révision ne sera pas programmée */
  }
}

/* La règle, sans stockage : l'état suivant d'un QCM après une tentative.
   Renvoie { suivant, action } ; `suivant` null = retiré de la liste.
   action : "programme" (raté), "avance" (réussi à temps), "acquis",
   "inchange" (réussi en avance, ou jamais raté). */
export function suite(actuel, reussi, jour) {
  if (!reussi) return { suivant: { du: ajouterJours(jour, INTERVALLES[0]), etape: 0 }, action: "programme" };
  if (!actuel) return { suivant: null, action: "inchange" };
  if (actuel.du > jour) return { suivant: actuel, action: "inchange" };
  const etape = actuel.etape + 1;
  if (etape >= INTERVALLES.length) return { suivant: null, action: "acquis" };
  return { suivant: { du: ajouterJours(jour, INTERVALLES[etape]), etape }, action: "avance" };
}

/* Après une tentative : met à jour la liste et renvoie ce qui s'est
   passé, pour l'annoncer à l'étudiant. */
export function noterTentative(qcmId, reussi, jour = aujourdhui()) {
  const revisions = lireRevisions();
  const { suivant, action } = suite(revisions[qcmId], reussi, jour);
  if (suivant) revisions[qcmId] = suivant;
  else delete revisions[qcmId];
  if (action !== "inchange" || suivant) ecrire(revisions);
  return { action, du: suivant?.du ?? null, etape: suivant?.etape ?? null };
}

/* Les QCM à refaire, les plus en retard d'abord. `aFaire` : dus
   aujourd'hui ou avant ; `aVenir` : les suivants. Les QCM qui
   n'existent plus sont ignorés. */
export function revisionsDues(qcms, jour = aujourdhui(), revisions = lireRevisions()) {
  const lignes = Object.entries(revisions)
    .map(([id, r]) => ({ ...r, qcm: qcms.find((q) => q.id === id) }))
    .filter((r) => r.qcm)
    .sort((a, b) => a.du.localeCompare(b.du));
  return { aFaire: lignes.filter((r) => r.du <= jour), aVenir: lignes.filter((r) => r.du > jour) };
}
