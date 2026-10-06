import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { lireChapitresLus, refChapitre } from "../progression";
import Icon from "../components/Icon";
import { Bouton, EtatVide } from "../components/ui";
import { cx } from "../components/classes";
import SectionVideos from "../components/videos";
import Installation from "../components/Installation";
import { revisionsDues } from "../revisions";
import BoutonFavori from "../components/BoutonFavori";
import { matieres } from "../data/matieres";
import { surCarte, themeMatiere } from "../data/couleurs";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import { site } from "../data/site";

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/* ================================================================== */

export default function Accueil() {
  const [params, setParams] = useSearchParams();
  const recherche = params.get("q") ?? "";
  const matiereActive = params.get("m") ?? "toutes";
  const [lus] = useState(lireChapitresLus);
  const [aRefaire] = useState(() => revisionsDues(qcms).aFaire.length);

  const choisirMatiere = (id) => {
    const suite = {};
    if (recherche) suite.q = recherche;
    if (id !== "toutes") suite.m = id;
    setParams(suite, { replace: true });
  };

  /* ---- Filtrage ---- */

  // Quelques dizaines d'éléments : filtrer à chaque rendu coûte moins que
  // de mémoriser, et laisse le compilateur React optimiser la page.
  const q = normalise(recherche.trim());
  const matieresFiltrees = matieres.filter((m) => {
      if (matiereActive !== "toutes" && m.id !== matiereActive) return false;
      if (!q) return true;
      const corpus = normalise(
        [m.nom, m.nomCourt, m.resume, ...m.chapitres.map((c) => c.titre)].join(
          " "
        )
      );
      return corpus.includes(q);
    });

  /* ---- Prochains chapitres disponibles ---- */

  const prochainsChapitres = (() => {
    const liste = [];
    for (const m of matieresFiltrees) {
      for (const c of m.chapitres) {
        if (c.statut !== "disponible") continue;
        if (q && !normalise(`${c.titre} ${c.resume}`).includes(q) &&
            !normalise(m.nom).includes(q)) continue;
        liste.push({ ...c, matiere: m });
      }
    }
    return liste.slice(0, 5);
  })();

  /* ---- QCM mis en avant ---- */

  const idsFiltres = matieresFiltrees.map((m) => m.id);
  const qcmEnAvant = qcms.find((x) => idsFiltres.includes(x.matiere)) ?? qcms[0];

  const matiereDuQcm = matieres.find((m) => m.id === qcmEnAvant.matiere);

  const filtres = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres.map((m) => ({ value: m.id, label: m.nomCourt })),
  ];

  return (
    <div className="px-4 py-6 sm:px-7 sm:py-8">
      {/* ---------------------------------------------------------- */}
      {/* Titre et filtres                                            */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
            Mes cours
          </h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {site.baseline}
          </p>
        </div>

        {/* Sur téléphone, une seule ligne qui défile au doigt (de bord à
            bord), au lieu de trois lignes de pastilles. */}
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
          role="group"
          aria-label="Filtrer par matière"
        >
          {filtres.map((f) => {
            const actif = f.value === matiereActive;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => choisirMatiere(f.value)}
                aria-pressed={actif}
                className={cx(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  actif
                    ? "bg-brand-600 text-white"
                    : "border border-brand-200 text-brand-700 hover:bg-brand-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Révision espacée : des QCM à refaire aujourd'hui. */}
      {aRefaire > 0 && (
        <Link
          to="/planning"
          className="mt-6 flex items-center gap-3 rounded-2xl bg-sun-100 px-5 py-3.5 text-sm text-sun-900 transition-colors hover:bg-sun-400/30 dark:bg-sun-500/15 dark:text-sun-100"
        >
          <Icon name="clock" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">
            <strong className="font-semibold">
              {aRefaire} QCM à refaire aujourd&apos;hui
            </strong>{" "}
            pour bien retenir ce que tu avais raté.
          </span>
          <span className="font-semibold underline">Mon planning</span>
        </Link>
      )}

      {/* Proposition d'installation, seulement quand elle est possible. */}
      <Installation compacte className="mt-6" />

      {/* ---------------------------------------------------------- */}
      {/* Cartes de matières                                          */}
      {/* ---------------------------------------------------------- */}
      {matieresFiltrees.length === 0 ? (
        <div className="mt-6">
          <EtatVide
            titre="Aucune matière ne correspond"
            texte="Essaie un autre mot-clé, ou reviens à toutes les matières."
          >
            <Bouton variante="secondaire" onClick={() => setParams({}, { replace: true })}>
              Réinitialiser
            </Bouton>
          </EtatVide>
        </div>
      ) : (
        // Sur téléphone, deux matières par ligne en rectangles posés à plat
        // (choix du 6 octobre 2026) : étiquette et favori, titre, puis la
        // barre de progression et un bouton rond « Continuer » sur une même
        // ligne. À partir de `md`, trois cartes par ligne, avec leurs
        // compteurs d'exercices et de QCM.
        // Toute la carte est cliquable : le lien du titre la couvre.
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:gap-5">
          {matieresFiltrees.map((m) => {
            const theme = themeMatiere(m);
            // Progression : les chapitres que l'étudiant a cochés « lu »,
            // parmi ceux qui sont disponibles.
            const disponibles = m.chapitres.filter((c) => c.statut === "disponible");
            const dispo = disponibles.length;
            const nbLus = disponibles.filter((c) => lus[refChapitre(m.id, c.titre)]).length;
            const pourcentage = dispo ? Math.round((nbLus / dispo) * 100) : 0;
            const nbExercices = exercices.filter((e) => e.matiere === m.id).length;
            const nbQcm = qcms.filter((q) => q.matiere === m.id).length;

            return (
              <article
                key={m.id}
                className={cx(
                  "relative flex min-w-0 flex-col rounded-2xl p-3 text-white md:rounded-3xl md:p-5",
                  theme.carte
                )}
              >
                <div className="flex items-start justify-between gap-2 md:gap-3">
                  <span
                    className={cx(
                      "truncate rounded-lg px-2 py-0.5 text-[11px] font-semibold md:px-2.5 md:py-1 md:text-xs",
                      theme.badgeCarte
                    )}
                  >
                    {m.nomCourt}
                  </span>
                  {/* Au-dessus du lien qui couvre la carte. */}
                  <BoutonFavori
                    type="matiere"
                    reference={m.id}
                    libelle={m.nom}
                    variante="surCouleur"
                    taille="sm"
                    className="relative z-10 -m-1 shrink-0 md:size-8"
                  />
                </div>

                <h2 className="mt-2 text-sm leading-snug font-semibold text-balance md:mt-4 md:text-xl">
                  <Link
                    to={`/cours/${m.id}`}
                    className="after:absolute after:inset-0 after:rounded-2xl hover:underline md:after:rounded-3xl"
                  >
                    {m.nom}
                  </Link>
                </h2>

                {/* Téléphone : barre, chapitres lus et « Continuer » sur une ligne. */}
                <div className="mt-auto flex items-center gap-2 pt-3 md:hidden">
                  <div
                    className={cx("h-1.5 min-w-0 flex-1 overflow-hidden rounded-full", surCarte.piste)}
                    role="progressbar"
                    aria-valuenow={pourcentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Chapitres lus en ${m.nom}`}
                  >
                    <div
                      className={cx("h-full rounded-full", surCarte.barre)}
                      style={{ width: `${pourcentage}%` }}
                    />
                  </div>
                  <span className={cx("shrink-0 text-[11px]", surCarte.attenue)}>
                    {nbLus}/{dispo}
                  </span>
                  <Link
                    to={`/cours/${m.id}`}
                    aria-label={`Continuer : ${m.nom}`}
                    className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-lime-400 text-ink-950 transition-colors hover:bg-lime-300"
                  >
                    <Icon name="arrow" className="size-4" />
                  </Link>
                </div>

                {/* Ordinateur et tablette : la carte complète. */}
                <div className="mt-auto hidden pt-8 md:block">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className={surCarte.attenue}>Progression</span>
                    <span className={surCarte.attenue}>
                      {nbLus}/{dispo} chapitre{dispo > 1 ? "s lus" : " lu"}
                    </span>
                  </div>
                  <div
                    className={cx("mt-2 h-1.5 overflow-hidden rounded-full", surCarte.piste)}
                    role="progressbar"
                    aria-valuenow={pourcentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Chapitres lus en ${m.nom}`}
                  >
                    <div
                      className={cx("h-full rounded-full", surCarte.barre)}
                      style={{ width: `${pourcentage}%` }}
                    />
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      <span
                        className={cx(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          surCarte.puce
                        )}
                      >
                        {nbExercices} exercice{nbExercices > 1 ? "s" : ""}
                      </span>
                      <span
                        className={cx(
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          surCarte.puce
                        )}
                      >
                        {nbQcm} QCM
                      </span>
                    </div>
                    <Link
                      to={`/cours/${m.id}`}
                      className="relative z-10 rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-300"
                    >
                      Continuer
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/* Vidéos d'explication                                        */}
      {/* ---------------------------------------------------------- */}
      <div className="mt-5">
        <SectionVideos matiere={matiereActive === "toutes" ? null : matiereActive} />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Prochains chapitres et suggestion                           */}
      {/* ---------------------------------------------------------- */}
      {/* Côte à côte sur toutes les tailles d'écran, comme sur ordinateur.
          Sur téléphone, les textes secondaires (résumé des chapitres,
          matière) laissent la place à l'essentiel. */}
      <div className="mt-5 grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2.5 sm:gap-5 xl:grid-cols-3">
        <section className="min-w-0 rounded-2xl bg-ink-50 p-3 sm:rounded-3xl sm:p-6 xl:col-span-2 dark:bg-ink-950">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 className="text-base font-semibold text-ink-900 sm:text-lg dark:text-white">
              Mes prochains chapitres
            </h2>
            <Link
              to="/cours"
              className="text-xs font-medium text-flame-700 hover:text-flame-800 sm:text-sm dark:text-flame-400"
            >
              Voir tous les cours
            </Link>
          </div>

          {prochainsChapitres.length === 0 ? (
            <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
              Aucun chapitre disponible pour cette sélection.
            </p>
          ) : (
            <table className="mt-3 w-full text-left sm:mt-5">
              <thead>
                <tr className="text-xs text-ink-500 dark:text-ink-400">
                  <th scope="col" className="pb-3 font-medium">
                    Chapitre
                  </th>
                  <th scope="col" className="hidden pb-3 font-medium sm:table-cell">
                    Matière
                  </th>
                  <th scope="col" className="pb-3 text-right font-medium">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {prochainsChapitres.map((c) => (
                  <tr
                    key={`${c.matiere.id}-${c.titre}`}
                    className="border-t border-ink-200 dark:border-ink-800"
                  >
                    <td className="py-2.5 pr-2 sm:py-3.5 sm:pr-4">
                      <Link
                        to={`/cours/${c.matiere.id}`}
                        className="text-sm font-medium text-ink-900 hover:text-brand-600 sm:text-base dark:text-white dark:hover:text-brand-300"
                      >
                        {c.titre}
                      </Link>
                      <span className="mt-0.5 hidden text-xs text-ink-500 sm:block dark:text-ink-400">
                        {c.resume}
                      </span>
                    </td>
                    <td className="hidden py-3.5 pr-4 sm:table-cell">
                      <span className="flex items-center gap-2">
                        <span
                          className={cx(
                            "grid size-8 shrink-0 place-items-center rounded-full",
                            themeMatiere(c.matiere).pastille
                          )}
                        >
                          <Icon name={c.matiere.icone} className="size-4" />
                        </span>
                        <span className="text-sm text-ink-700 dark:text-ink-300">
                          {c.matiere.nomCourt}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-xs whitespace-nowrap text-ink-500 sm:py-3.5 sm:text-sm dark:text-ink-400">
                      {c.duree}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Suggestion */}
        <aside className="flex min-w-0 flex-col rounded-2xl bg-lime-400 p-3 sm:rounded-3xl sm:p-6">
          <p className="text-xs font-medium text-lime-900 sm:text-sm">
            À tester pour vérifier tes acquis
          </p>

          <span className="mt-3 self-start rounded-lg bg-ink-950 px-2 py-0.5 text-[11px] font-semibold text-white sm:mt-4 sm:px-2.5 sm:py-1 sm:text-xs">
            {matiereDuQcm?.nomCourt ?? "QCM"}
          </span>

          <h2 className="mt-2 text-base leading-tight font-bold text-balance text-ink-950 sm:mt-4 sm:text-3xl">
            {qcmEnAvant.titre}
          </h2>

          <p className="mt-2 text-xs/5 text-lime-900 sm:mt-3 sm:text-sm/6">{qcmEnAvant.description}</p>

          <div className="mt-3 mb-4 flex flex-wrap gap-1.5 sm:mt-5 sm:mb-6 sm:gap-2">
            <span className="rounded-full bg-ink-950/10 px-2 py-0.5 text-[11px] font-medium text-ink-950 sm:px-3 sm:py-1 sm:text-xs">
              {qcmEnAvant.questions.length} questions
            </span>
            <span className="rounded-full bg-ink-950/10 px-2 py-0.5 text-[11px] font-medium text-ink-950 sm:px-3 sm:py-1 sm:text-xs">
              {qcmEnAvant.duree}
            </span>
            <span className="rounded-full bg-ink-950/10 px-2 py-0.5 text-[11px] font-medium text-ink-950 sm:px-3 sm:py-1 sm:text-xs">
              Corrigé expliqué
            </span>
          </div>

          <Link
            to={`/qcm/${qcmEnAvant.id}`}
            aria-label="Commencer le QCM"
            className="mt-auto block rounded-xl bg-flame-500 px-3 py-2.5 text-center text-xs font-semibold text-ink-950 transition-colors hover:bg-flame-400 sm:rounded-2xl sm:px-5 sm:py-3.5 sm:text-sm"
          >
            Commencer<span className="hidden sm:inline"> le QCM</span>
          </Link>
        </aside>
      </div>

    </div>
  );
}
