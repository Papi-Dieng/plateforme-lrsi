import { qcms } from "./data/qcm";
import { aujourdhui, joursEntre, lirePlanning } from "./planning";
import { lireRevisions, revisionsDues } from "./revisions";
import { analyserMatieres, chapitresARevoir } from "./analyseMatieres";
import { lireChapitresLus, lireScores } from "./progression";

/* ==================================================================
   Ce que montre la cloche du haut de page : ce qu'il y a à faire
   aujourd'hui, calculé dans le navigateur.

   - les QCM à refaire (révision espacée, src/revisions.js), en retard
     ou prévus aujourd'hui ;
   - les examens de l'emploi du temps dans les 7 prochains jours ;
   - en complément, sans compter dans le point rouge : les chapitres à
     relire dans les matières fragiles, et la prochaine révision quand
     rien n'est dû aujourd'hui. (Ce rappel était un bloc du tableau de
     bord ; il vit dans la cloche depuis le 13 octobre 2026.)

   Rien n'est envoyé nulle part. Le point rouge de la cloche n'apparaît
   que s'il y a au moins une entrée.
   ================================================================== */

export const HORIZON_EXAMENS = 7;

const enRetard = (n) => `En retard de ${n} jour${n > 1 ? "s" : ""} : c'est le moment de le revoir`;

const quand = (n) => (n === 0 ? "Aujourd'hui" : n === 1 ? "Demain" : `Dans ${n} jours`);

/* La règle, sans stockage : [{ cle, icone, titre, detail, lien }]. */
export function notificationsDuJour({ jour, planning, revisions, qcms: liste }) {
  const aRefaire = revisionsDues(liste, jour, revisions).aFaire.map((r) => ({
    cle: `qcm:${r.qcm.id}`,
    icone: "target",
    titre: `Refaire le QCM « ${r.qcm.titre} »`,
    detail: r.du < jour ? enRetard(joursEntre(r.du, jour)) : "Prévu aujourd'hui",
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

/* Le complément, sans point rouge : { aRelire: [...], prochaine } où
   `prochaine` est { jour, titre } de la prochaine révision, ou null. */
export function complementsDuJour({ jour, revisions, qcms: liste, chapitres = [] }) {
  const { aVenir } = revisionsDues(liste, jour, revisions);
  return {
    aRelire: chapitres.slice(0, 3).map((c) => ({
      cle: `chapitre:${c.cle}`,
      icone: "book",
      titre: `Relire « ${c.chapitre} »`,
      detail: `${c.nomMatiere} · ${c.dejaLu ? "à relire" : "pas encore lu"}`,
      lien: `/cours/${c.matiere}`,
    })),
    prochaine: aVenir[0] ? { jour: aVenir[0].du, titre: aVenir[0].qcm.titre } : null,
  };
}

/* Côté navigateur. */
export const lireNotifications = () =>
  notificationsDuJour({ jour: aujourdhui(), planning: lirePlanning(), revisions: lireRevisions(), qcms });

export const lireComplements = () =>
  complementsDuJour({
    jour: aujourdhui(),
    revisions: lireRevisions(),
    qcms,
    chapitres: chapitresARevoir(analyserMatieres(lireScores()), lireChapitresLus()),
  });
