import { qcms } from "./data/qcm";
import { aujourdhui, joursEntre, lirePlanning } from "./planning";
import { lireRevisions, revisionsDues } from "./revisions";

/* ==================================================================
   Ce que montre la cloche du haut de page : ce qu'il y a à faire
   aujourd'hui, calculé dans le navigateur.

   - les QCM à refaire (révision espacée, src/revisions.js), en retard
     ou prévus aujourd'hui ;
   - les examens de l'emploi du temps dans les 7 prochains jours.

   Rien n'est envoyé nulle part. Le point rouge de la cloche n'apparaît
   que s'il y a au moins une entrée.
   ================================================================== */

export const HORIZON_EXAMENS = 7;

const quand = (n) => (n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : `Dans ${n} jours`);

/* La règle, sans stockage : [{ cle, icone, titre, detail, lien }]. */
export function notificationsDuJour({ jour, planning, revisions, qcms: liste }) {
  const aRefaire = revisionsDues(liste, jour, revisions).aFaire.map((r) => ({
    cle: `qcm:${r.qcm.id}`,
    icone: "target",
    titre: `Refaire le QCM « ${r.qcm.titre} »`,
    detail: r.du < jour ? "En retard : c'est le moment de le revoir" : "Prévu aujourd'hui",
    lien: `/qcm/${r.qcm.id}`,
  }));

  // Les examens : ceux du programme de révision, et ceux ajoutés à la
  // main dans l'emploi du temps (catégorie « Examen »), sans doublon.
  const examens = [
    ...(planning.evaluations ?? []).map((ev) => ({ id: ev.id, titre: ev.titre, jour: ev.date })),
    ...(planning.evenements ?? [])
      .filter((e) => e.categorie === "Examen" && !e.evaluation)
      .map((e) => ({ id: e.id, titre: e.titre, jour: e.jour })),
  ]
    .map((x) => ({ ...x, dans: joursEntre(jour, x.jour) }))
    .filter((x) => x.dans >= 0 && x.dans <= HORIZON_EXAMENS)
    .sort((a, b) => a.dans - b.dans)
    .map((x) => ({
      cle: `examen:${x.id}`,
      icone: "clock",
      titre: x.titre,
      detail: quand(x.dans),
      lien: "/planning",
    }));

  return [...examens, ...aRefaire];
}

/* Côté navigateur. */
export const lireNotifications = () =>
  notificationsDuJour({ jour: aujourdhui(), planning: lirePlanning(), revisions: lireRevisions(), qcms });
