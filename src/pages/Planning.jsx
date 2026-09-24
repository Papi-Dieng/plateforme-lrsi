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
import { INTERVALLES, revisionsDues } from "../revisions";
import EmploiDuTemps from "../components/EmploiDuTemps";
import {
  activerRappels,
  desactiverRappels,
  notificationsPossibles,
  rappelsActifs,
} from "../rappels";

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

/* Rappels par notification (src/rappels.js). */
function Rappels() {
  const [etat, setEtat] = useState(() =>
    !notificationsPossibles()
      ? "impossibles"
      : rappelsActifs()
        ? "actifs"
        : Notification.permission === "denied"
          ? "refuses"
          : "inactifs"
  );
  const [occupe, setOccupe] = useState(false);

  const activer = async () => {
    setOccupe(true);
    setEtat(await activerRappels());
    setOccupe(false);
  };

  const textes = {
    inactifs: "Reçois chaque jour une notification avec ton programme : évaluation qui approche, chapitre à relire, QCM à refaire.",
    actifs: "Rappels activés. Tu reçois ton programme du jour en ouvrant le site ; installé sur Android, il peut aussi arriver sans ouvrir l'application.",
    refuses: "Les notifications sont bloquées pour ce site. Autorise-les dans les réglages du navigateur (le cadenas à gauche de l'adresse), puis réessaie.",
    impossibles: "Ce navigateur ne permet pas les notifications. Sur iPhone, installe d'abord le site sur l'écran d'accueil (voir Paramètres).",
  };

  return (
    <section className="card flex flex-wrap items-center gap-4 p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
        <Icon name="bell" className="size-5" />
      </span>
      <div className="min-w-60 flex-1">
        <h2 className="font-semibold text-ink-900 dark:text-white">Rappels de révision</h2>
        <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">{textes[etat]}</p>
      </div>
      {etat === "actifs" ? (
        <button
          type="button"
          onClick={async () => {
            await desactiverRappels();
            setEtat("inactifs");
          }}
          className="text-sm font-medium text-ink-500 hover:underline"
        >
          Désactiver
        </button>
      ) : (
        etat !== "impossibles" && (
          <button
            type="button"
            onClick={activer}
            disabled={occupe}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            Activer les rappels
          </button>
        )
      )}
    </section>
  );
}

/* Révision espacée : les QCM ratés reviennent à intervalles croissants
   (src/revisions.js). */
function Revisions() {
  const [{ aFaire, aVenir }] = useState(() => revisionsDues(qcms));
  if (aFaire.length === 0 && aVenir.length === 0) return null;

  const ligne = (r, du) => (
    <li key={r.qcm.id} className="flex flex-wrap items-center gap-3">
      <Icon name="target" className="size-4 shrink-0 text-ink-400" />
      <span className="min-w-0 flex-1">
        <Link to={`/qcm/${r.qcm.id}`} className="text-sm font-medium text-ink-900 hover:underline dark:text-white">
          {r.qcm.titre}
        </Link>
        <span className="block text-xs text-ink-500 dark:text-ink-400">
          {nomMatiere(r.qcm.matiere)} · révision {r.etape + 1} sur {INTERVALLES.length}
        </span>
      </span>
      {du ? (
        <Badge ton="sun" icone="clock">
          {r.du < aujourdhui() ? "en retard" : "aujourd'hui"}
        </Badge>
      ) : (
        <span className="text-xs text-ink-500 dark:text-ink-400">{majuscule(formatJour(r.du))}</span>
      )}
    </li>
  );

  return (
    <section className="card p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
        <Icon name="clock" className="size-4.5 text-brand-600 dark:text-brand-400" />
        QCM à refaire
      </h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Un QCM raté revient dans 2 jours, puis de plus en plus tard à chaque réussite (5, 12, puis 30
        jours) : revoir au bon moment fait retenir durablement.
      </p>
      {aFaire.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold tracking-wide text-ink-500 uppercase">À faire maintenant</p>
          <ul className="mt-2 space-y-2.5">{aFaire.map((r) => ligne(r, true))}</ul>
        </>
      )}
      {aVenir.length > 0 && (
        <>
          <p className="mt-4 text-xs font-semibold tracking-wide text-ink-500 uppercase">Prochainement</p>
          <ul className="mt-2 space-y-2.5">{aVenir.map((r) => ligne(r, false))}</ul>
        </>
      )}
    </section>
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
  const plans = useMemo(
    () => evaluations.map((ev) => ({ ev, plan: construirePlan(ev, contexte) })),
    [evaluations, contexte]
  );

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
    modifier({ ...planning, evaluations: planning.evaluations.filter((e) => e.id !== evaluation.id), faites });
  };

  /* Le programme calculé, jour par jour, pour l'emploi du temps :
     évaluations, tâches de révision, QCM à refaire. */
  const programme = useMemo(() => {
    const parJour = new Map();
    const ajouter = (jour, element) => parJour.set(jour, [...(parJour.get(jour) ?? []), element]);
    for (const { ev, plan } of plans) {
      ajouter(ev.date, {
        cle: `eval:${ev.id}`,
        type: "evaluation",
        titre: ev.titre,
        detail: `Évaluation de ${nomMatiere(ev.matiere)}, le ${formatJour(ev.date)}.`,
      });
      for (const j of plan.jours) {
        for (const t of j.taches) {
          ajouter(j.jour, { cle: `${ev.id}|${t.cle}`, type: "tache", titre: t.titre, detail: t.detail, to: t.to, ev, tache: t });
        }
      }
    }
    const { aFaire, aVenir } = revisionsDues(qcms);
    for (const r of [...aFaire, ...aVenir]) {
      ajouter(r.du < auj ? auj : r.du, {
        cle: `rev:${r.qcm.id}`,
        type: "revision",
        titre: `QCM à refaire : ${r.qcm.titre}`,
        detail: `Révision espacée ${r.etape + 1} sur ${INTERVALLES.length} : refaire ce QCM au bon moment aide à le retenir durablement.`,
        to: `/qcm/${r.qcm.id}`,
      });
    }
    return parJour;
  }, [plans, auj]);

  const elementsDuJour = (jour) =>
    (programme.get(jour) ?? []).map((p) =>
      p.type === "tache"
        ? { ...p, fait: Boolean(planning.faites[p.cle]), onBasculer: () => basculer(p.ev, p.tache) }
        : p
    );

  return (
    <>
      <EnTetePage
        surtitre="Emploi du temps et révisions"
        titre="Mon planning"
        texte="Tes cours et tes séances de la semaine, avec ton programme de révision : évaluations à venir, chapitres à relire et QCM à refaire, calculés d'après tes résultats."
      />

      <Container className="space-y-8 py-10">
        <Rappels />

        <section className="card p-4 sm:p-6">
          <EmploiDuTemps
            evenements={planning.evenements}
            onChange={(evenements) => modifier({ ...planning, evenements })}
            elementsDuJour={elementsDuJour}
            matieres={matieres}
          />
        </section>

        <div>
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Mes évaluations</h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Note tes partiels et contrôles : le site prépare un programme jour par jour jusqu'à la veille,
            en commençant par tes points faibles. Il apparaît aussi dans l'emploi du temps.
          </p>
        </div>
        <Formulaire onAjouter={(e) => modifier({ ...planning, evaluations: [...planning.evaluations, e] })} />

        {evaluations.length === 0 && (
          <EtatVide
            titre="Aucune évaluation pour le moment"
            texte="Ajoute ton prochain partiel ou ton prochain contrôle ci-dessus pour obtenir ton programme."
          />
        )}

        {plans.map(({ ev, plan }) => {
          const toutes = [...plan.jours.flatMap((j) => j.taches), ...plan.enPlus];
          const faites = toutes.filter((t) => planning.faites[cleFaite(ev, t)]).length;
          const restant = joursEntre(auj, ev.date);
          return (
            <details key={ev.id} className="card group overflow-hidden">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4">
                <Icon name="chevron" className="size-4 shrink-0 -rotate-90 text-ink-400 transition-transform group-open:rotate-0" />
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
                  onClick={(e) => {
                    e.preventDefault();
                    supprimer(ev);
                  }}
                  className="text-xs text-ink-500 hover:text-flame-600 hover:underline"
                >
                  Retirer
                </button>
              </summary>

              {plan.message ? (
                <p className="border-t border-ink-200 px-5 py-4 text-sm text-ink-600 dark:border-ink-800 dark:text-ink-400">{plan.message}</p>
              ) : (
                <div className="divide-y divide-ink-200 border-t border-ink-200 dark:divide-ink-800 dark:border-ink-800">
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
            </details>
          );
        })}

        <Revisions />

        <p className="text-xs text-ink-400">
          Le programme se recalcule à chaque visite : fais un QCM, et tes nouveaux résultats changent
          les priorités. Ton emploi du temps et ton planning restent dans ce navigateur ; pense à{" "}
          <Link to="/parametres" className="underline">
            télécharger ta sauvegarde
          </Link>{" "}
          pour les garder.
        </p>
      </Container>
    </>
  );
}
