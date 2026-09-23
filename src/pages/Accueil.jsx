import { Link, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import { Bouton, EtatVide, NoteDemo, cx } from "../components/ui";
import SectionVideos from "../components/videos";
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

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par matière">
          {filtres.map((f) => {
            const actif = f.value === matiereActive;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => choisirMatiere(f.value)}
                aria-pressed={actif}
                className={cx(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
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
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {matieresFiltrees.map((m) => {
            const theme = themeMatiere(m);
            const total = m.chapitres.length;
            const dispo = m.chapitres.filter((c) => c.statut === "disponible").length;
            const pourcentage = Math.round((dispo / total) * 100);
            const nbExercices = exercices.filter((e) => e.matiere === m.id).length;
            const nbQcm = qcms.filter((q) => q.matiere === m.id).length;

            return (
              <article
                key={m.id}
                className={cx(
                  "flex flex-col rounded-3xl p-5 text-white",
                  theme.carte
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cx(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold",
                      theme.badgeCarte
                    )}
                  >
                    {m.nomCourt}
                  </span>
                  <BoutonFavori
                    type="matiere"
                    reference={m.id}
                    libelle={m.nom}
                    variante="surCouleur"
                    className="-m-1"
                  />
                </div>

                <h2 className="mt-4 text-xl leading-snug font-semibold text-balance">
                  <Link to={`/cours/${m.id}`} className="hover:underline">
                    {m.nom}
                  </Link>
                </h2>

                <div className="mt-auto pt-8">
                  <div className="flex items-center justify-between text-xs">
                    <span className={surCarte.attenue}>Progression</span>
                    <span className={surCarte.attenue}>
                      {dispo}/{total} chapitres
                    </span>
                  </div>
                  <div
                    className={cx("mt-2 h-1.5 overflow-hidden rounded-full", surCarte.piste)}
                    role="progressbar"
                    aria-valuenow={pourcentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Chapitres disponibles en ${m.nom}`}
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
                      className="rounded-full bg-lime-400 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-300"
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
        <SectionVideos />
      </div>

      {/* ---------------------------------------------------------- */}
      {/* Prochains chapitres et suggestion                           */}
      {/* ---------------------------------------------------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-3xl bg-ink-50 p-5 sm:p-6 xl:col-span-2 dark:bg-ink-950">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
              Mes prochains chapitres
            </h2>
            <Link
              to="/cours"
              className="text-sm font-medium text-flame-600 hover:text-flame-700 dark:text-flame-400"
            >
              Voir tous les cours
            </Link>
          </div>

          {prochainsChapitres.length === 0 ? (
            <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
              Aucun chapitre disponible pour cette sélection.
            </p>
          ) : (
            <table className="mt-5 w-full text-left">
              <thead>
                <tr className="text-xs text-ink-400 dark:text-ink-500">
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
                    <td className="py-3.5 pr-4">
                      <Link
                        to={`/cours/${c.matiere.id}`}
                        className="font-medium text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                      >
                        {c.titre}
                      </Link>
                      <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">
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
                    <td className="py-3.5 text-right text-sm whitespace-nowrap text-ink-500 dark:text-ink-400">
                      {c.duree}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Suggestion */}
        <aside className="flex flex-col rounded-3xl bg-lime-400 p-6">
          <p className="text-sm font-medium text-lime-900">
            À tester pour vérifier tes acquis
          </p>

          <span className="mt-4 self-start rounded-lg bg-ink-950 px-2.5 py-1 text-xs font-semibold text-white">
            {matiereDuQcm?.nomCourt ?? "QCM"}
          </span>

          <h2 className="mt-4 text-3xl leading-tight font-bold text-balance text-ink-950">
            {qcmEnAvant.titre}
          </h2>

          <p className="mt-3 text-sm/6 text-lime-900">{qcmEnAvant.description}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-ink-950/10 px-3 py-1 text-xs font-medium text-ink-950">
              {qcmEnAvant.questions.length} questions
            </span>
            <span className="rounded-full bg-ink-950/10 px-3 py-1 text-xs font-medium text-ink-950">
              {qcmEnAvant.duree}
            </span>
            <span className="rounded-full bg-ink-950/10 px-3 py-1 text-xs font-medium text-ink-950">
              Corrigé expliqué
            </span>
          </div>

          <Link
            to={`/qcm/${qcmEnAvant.id}`}
            className="mt-auto block rounded-2xl bg-flame-500 px-5 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-flame-600"
          >
            Commencer le QCM
          </Link>
        </aside>
      </div>

      <div className="mt-5">
        <NoteDemo>
          Contenu de démonstration. La progression affichée correspond aux
          chapitres déjà rédigés, et les favoris restent dans ton navigateur.
          Le suivi par compte arrivera en version 3.
        </NoteDemo>
      </div>
    </div>
  );
}
