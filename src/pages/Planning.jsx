import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, EtatVide, cx } from "../components/ui";
import { matieres, nomMatiere } from "../data/matieres";
import { competences } from "../data/competences";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import { examens as devoirs } from "../data/examens";
import { analyserCompetences } from "../competences";
import { lireChapitresLus, lireExercicesTravailles, lireScores } from "../progression";
import {
  ajouterJours,
  aujourdhui,
  construirePlan,
  ecrirePlanning,
  joursEntre,
  lirePlanning,
} from "../planning";

/* ==================================================================
   Mon planning de révision.

   L'étudiant note ses évaluations ; pour chacune, un programme jour
   par jour jusqu'à la veille, construit à partir de ses résultats
   (`src/planning.js`). Il coche ce qu'il a fait. Tout reste dans son
   navigateur, et part dans sa sauvegarde.
   ================================================================== */

const ICONES = { chapitre: "book", exercice: "pencil", qcm: "target", devoir: "graduation" };

const formatJour = (jour) => {
  const [a, m, j] = jour.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(a, m - 1, j));
};
// « Jeudi 24 septembre » : seule la première lettre en majuscule.
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const dans = (n) => (n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n < 0 ? "passée" : `dans ${n} jours`);

function Formulaire({ onAjouter }) {
  const demain = ajouterJours(aujourdhui(), 1);
  const [titre, setTitre] = useState("");
  const [matiere, setMatiere] = useState(matieres[0]?.id ?? "");
  const [date, setDate] = useState(ajouterJours(aujourdhui(), 7));
  const [parJour, setParJour] = useState(2);

  const champ =
    "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAjouter({
          id: `eval-${Date.now().toString(36)}`,
          titre: titre.trim() || `Évaluation de ${nomMatiere(matiere)}`,
          matiere,
          date,
          parJour,
        });
        setTitre("");
      }}
      className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto_auto] lg:items-end"
    >
      <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
        Évaluation
        <input value={titre} maxLength={80} onChange={(e) => setTitre(e.target.value)} placeholder="Partiel de réseaux" className={champ} />
      </label>
      <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
        Matière
        <select value={matiere} onChange={(e) => setMatiere(e.target.value)} className={champ}>
          {matieres.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
        Date
        <input type="date" required min={demain} value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
      </label>
      <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
        Tâches par jour
        <select value={parJour} onChange={(e) => setParJour(Number(e.target.value))} className={champ}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={!matiere || !date || date < demain}
        className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        Construire mon planning
      </button>
    </form>
  );
}

function Tache({ tache, faite, onBasculer }) {
  return (
    <li className="flex items-start gap-3">
      <input
        type="checkbox"
        checked={faite}
        onChange={onBasculer}
        aria-label={`Fait : ${tache.titre}`}
        className="mt-1 size-4 shrink-0 accent-brand-600"
      />
      <Icon name={ICONES[tache.type] ?? "file"} className="mt-0.5 size-4 shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1">
        <Link
          to={tache.to}
          className={cx(
            "text-sm font-medium hover:underline",
            faite ? "text-ink-400 line-through" : "text-ink-900 dark:text-white"
          )}
        >
          {tache.titre}
        </Link>
        <span className="block text-xs text-ink-500 dark:text-ink-400">{tache.detail}</span>
      </span>
    </li>
  );
}

export default function Planning() {
  const [planning, setPlanning] = useState(lirePlanning);
  // La progression se lit à l'ouverture de la page : elle change quand
  // l'étudiant fait un QCM ou ouvre une correction, puis revient ici.
  const [contexte] = useState(() => ({
    matieres,
    competences,
    exercices,
    qcms,
    devoirs,
    analyse: analyserCompetences(lireScores()),
    exercicesTravailles: lireExercicesTravailles(),
    chapitresLus: lireChapitresLus(),
  }));

  const modifier = (suite) => {
    setPlanning(suite);
    ecrirePlanning(suite);
  };

  const evaluations = useMemo(
    () => [...planning.evaluations].sort((a, b) => a.date.localeCompare(b.date)),
    [planning.evaluations]
  );
  const auj = aujourdhui();

  // Une tâche cochée l'est pour CETTE évaluation : le même chapitre peut
  // revenir dans le planning d'une autre.
  const cleFaite = (evaluation, tache) => `${evaluation.id}|${tache.cle}`;
  const basculer = (evaluation, tache) => {
    const cle = cleFaite(evaluation, tache);
    const faites = { ...planning.faites };
    if (faites[cle]) delete faites[cle];
    else faites[cle] = new Date().toISOString();
    modifier({ ...planning, faites });
  };
  const supprimer = (evaluation) => {
    if (!window.confirm(`Retirer « ${evaluation.titre} » et son planning ?`)) return;
    const faites = Object.fromEntries(Object.entries(planning.faites).filter(([k]) => !k.startsWith(`${evaluation.id}|`)));
    modifier({ evaluations: planning.evaluations.filter((e) => e.id !== evaluation.id), faites });
  };

  return (
    <>
      <EnTetePage
        surtitre="S'organiser"
        titre="Mon planning de révision"
        texte="Note tes évaluations : le site te prépare un programme jour par jour jusqu'à la veille, en commençant par tes points faibles d'après tes QCM."
      />

      <Container className="space-y-8 py-10">
        <Formulaire onAjouter={(e) => modifier({ ...planning, evaluations: [...planning.evaluations, e] })} />

        {evaluations.length === 0 && (
          <EtatVide
            titre="Aucune évaluation pour le moment"
            texte="Ajoute ton prochain partiel ou ton prochain contrôle ci-dessus pour obtenir ton programme."
          />
        )}

        {contexte &&
          evaluations.map((ev) => {
            const plan = construirePlan(ev, contexte);
            const toutes = [...plan.jours.flatMap((j) => j.taches), ...plan.enPlus];
            const faites = toutes.filter((t) => planning.faites[cleFaite(ev, t)]).length;
            const restant = joursEntre(auj, ev.date);
            return (
              <section key={ev.id} className="card overflow-hidden">
                <header className="flex flex-wrap items-center gap-3 border-b border-ink-200 px-5 py-4 dark:border-ink-800">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-ink-900 dark:text-white">{ev.titre}</h2>
                    <p className="text-sm text-ink-500 dark:text-ink-400">
                      {nomMatiere(ev.matiere)} · {formatJour(ev.date)}
                    </p>
                  </div>
                  <Badge ton={restant <= 2 && restant >= 0 ? "sun" : "brand"} icone="clock">
                    {dans(restant)}
                  </Badge>
                  {toutes.length > 0 && (
                    <Badge ton={faites === toutes.length ? "accent" : "neutre"}>
                      {faites} / {toutes.length} fait{faites > 1 ? "s" : ""}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => supprimer(ev)}
                    className="text-xs text-ink-500 hover:text-flame-600 hover:underline"
                  >
                    Retirer
                  </button>
                </header>

                {plan.message ? (
                  <p className="px-5 py-4 text-sm text-ink-600 dark:text-ink-400">{plan.message}</p>
                ) : (
                  <div className="divide-y divide-ink-200 dark:divide-ink-800">
                    {plan.jours.map((j) => (
                      <div key={j.jour} className={cx("grid gap-3 px-5 py-4 sm:grid-cols-[180px_1fr]", j.jour === auj && "bg-brand-50/40 dark:bg-brand-500/5")}>
                        <p className="text-sm font-semibold text-ink-900 dark:text-white">
                          {j.jour === auj ? "Aujourd'hui" : majuscule(formatJour(j.jour))}
                        </p>
                        {j.taches.length ? (
                          <ul className="space-y-2.5">
                            {j.taches.map((t) => (
                              <Tache key={t.cle} tache={t} faite={Boolean(planning.faites[cleFaite(ev, t)])} onBasculer={() => basculer(ev, t)} />
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-ink-400">Repos, ou reprends ce qui t'a posé problème.</p>
                        )}
                      </div>
                    ))}
                    {plan.enPlus.length > 0 && (
                      <details className="px-5 py-4">
                        <summary className="cursor-pointer text-sm font-semibold text-brand-600 dark:text-brand-300">
                          En plus, si tu as le temps ({plan.enPlus.length})
                        </summary>
                        <ul className="mt-3 space-y-2.5">
                          {plan.enPlus.map((t) => (
                            <Tache key={t.cle} tache={t} faite={Boolean(planning.faites[cleFaite(ev, t)])} onBasculer={() => basculer(ev, t)} />
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </section>
            );
          })}

        <p className="text-xs text-ink-400">
          Le programme se recalcule à chaque visite : fais un QCM, et tes nouveaux résultats changent
          les priorités. Ton planning reste dans ce navigateur ; pense à{" "}
          <Link to="/parametres" className="underline">
            télécharger ta sauvegarde
          </Link>{" "}
          pour le garder.
        </p>
      </Container>
    </>
  );
}
