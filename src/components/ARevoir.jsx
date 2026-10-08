import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { cx } from "./classes";
import { revisionsDues } from "../revisions";
import { analyserMatieres, chapitresARevoir } from "../analyseMatieres";
import { lireChapitresLus, lireScores } from "../progression";
import { nomMatiere } from "../data/matieres";
import { qcms } from "../data/qcm";

/* ==================================================================
   « À revoir aujourd'hui », en haut du tableau de bord.

   Ce que la révision espacée demande ce jour (src/revisions.js) : les
   QCM ratés à refaire, du plus en retard au moins en retard, chacun
   avec son bouton. En dessous, les chapitres à relire dans les
   matières fragiles (src/analyseMatieres.js). Rien n'est dû : la date
   de la prochaine révision. Rien du tout : le bloc ne s'affiche pas.
   Tout est calculé dans le navigateur, depuis les scores gardés.
   ================================================================== */

const jourCourt = (iso) => {
  const [a, m, j] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(a, m - 1, j));
};

const retardEnJours = (iso) => {
  const [a, m, j] = iso.split("-").map(Number);
  const du = new Date(a, m - 1, j);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  return Math.round((aujourdhui - du) / 86400000);
};

export default function ARevoir({ className }) {
  const [{ aFaire, aVenir }] = useState(() => revisionsDues(qcms));
  const [chapitres] = useState(() => chapitresARevoir(analyserMatieres(lireScores()), lireChapitresLus()).slice(0, 3));

  if (aFaire.length === 0 && aVenir.length === 0 && chapitres.length === 0) return null;

  return (
    <section aria-labelledby="titre-a-revoir" className={cx("rounded-3xl border border-sun-400/40 bg-sun-100/70 p-5 sm:p-6 dark:border-sun-500/30 dark:bg-sun-500/10", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titre-a-revoir" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink-950 dark:text-white">
          <Icon name="clock" className="size-5 text-sun-700 dark:text-sun-300" />
          À revoir aujourd&apos;hui
          {aFaire.length > 0 && (
            <span className="rounded-full bg-ink-950 px-2 py-0.5 text-xs text-white dark:bg-white dark:text-ink-950">{aFaire.length}</span>
          )}
        </h2>
        <Link to="/planning" className="text-sm font-bold text-ink-800 underline-offset-2 hover:underline dark:text-ink-100">
          Mon planning
        </Link>
      </div>

      {aFaire.length > 0 ? (
        <>
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">
            {aFaire.length} QCM à refaire aujourd&apos;hui pour bien retenir ce que tu avais raté.
          </p>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {aFaire.map((r) => {
              const retard = retardEnJours(r.du);
              return (
                <li key={r.qcm.id}>
                  <Link
                    to={`/qcm/${r.qcm.id}`}
                    aria-label={`Refaire le QCM « ${r.qcm.titre} »`}
                    className="group flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md dark:bg-ink-900"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun-400 text-ink-950">
                      <Icon name="target" className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-ink-950 dark:text-white">{r.qcm.titre}</span>
                      <span className="block text-xs text-ink-600 dark:text-ink-300">
                        {nomMatiere(r.qcm.matiere)} · {retard > 0 ? `en retard de ${retard} jour${retard > 1 ? "s" : ""}` : "prévu aujourd'hui"}
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-950 px-3 py-1.5 text-xs font-bold text-white transition-transform group-hover:translate-x-0.5 dark:bg-white dark:text-ink-950">
                      Refaire
                      <Icon name="arrow" className="size-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        aVenir.length > 0 && (
          <p className="mt-1 text-sm text-ink-700 dark:text-ink-200">
            Rien à refaire aujourd&apos;hui. Prochaine révision le {jourCourt(aVenir[0].du)} : « {aVenir[0].qcm.titre} ».
          </p>
        )
      )}

      {chapitres.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-extrabold tracking-wide text-ink-700 uppercase dark:text-ink-200">À relire avant</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {chapitres.map((c) => (
              <li key={c.cle}>
                <Link
                  to={`/cours/${c.matiere}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink-950/10 bg-white/70 px-3 py-1.5 text-xs font-bold text-ink-900 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-ink-100"
                >
                  <Icon name="book" className="size-3.5" />
                  {c.chapitre}
                  <span className="font-normal text-ink-600 dark:text-ink-300">· {c.nomMatiere}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
