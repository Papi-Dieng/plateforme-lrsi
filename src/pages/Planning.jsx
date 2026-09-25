import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, EtatVide } from "../components/ui";
import { cx } from "../components/classes";
import { matieres, nomMatiere } from "../data/matieres";
import { competences } from "../data/competences";
import { exercices } from "../data/exercices";
import { qcms } from "../data/qcm";
import { examens as devoirs } from "../data/examens";
import { analyserCompetences } from "../competences";
import { lireChapitresLus, lireExercicesTravailles, lireScores } from "../progression";
import {
  aujourdhui,
  construirePlan,
  ecrirePlanning,
  joursEntre,
  lirePlanning,
} from "../planning";
import { INTERVALLES, revisionsDues } from "../revisions";
import EmploiDuTemps from "../components/EmploiDuTemps";
import AssistantProgramme from "../components/AssistantProgramme";
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
    modifier({
      ...planning,
      evaluations: planning.evaluations.filter((e) => e.id !== evaluation.id),
      faites,
      evenements: planning.evenements.filter((e) => e.evaluation !== evaluation.id && e.genere !== evaluation.id),
    });
  };

  /* L'assistant IA a composé un programme : l'évaluation est ajoutée (ou
     mise à jour), et ses séances remplacent celles d'un programme précédent. */
  const [assistant, setAssistant] = useState(null); // null, ou { session }
  const validerProgramme = ({ sessionId, evaluations: nouvelles, evenements }) => {
    const ids = new Set(nouvelles.map((e) => e.id));
    modifier({
      ...planning,
      evaluations: [...planning.evaluations.filter((e) => e.session !== sessionId && !ids.has(e.id)), ...nouvelles],
      evenements: [
        ...planning.evenements.filter((e) => e.genere !== sessionId && !ids.has(e.genere) && !ids.has(e.evaluation)),
        ...evenements,
      ],
    });
    setAssistant(null);
  };

  /* Rouvrir l'assistant sur la session d'une évaluation, pour refaire son programme. */
  const sessionDe = (ev) => {
    const soeurs = ev.session ? planning.evaluations.filter((e) => e.session === ev.session) : [ev];
    return {
      id: ev.session,
      semestre: ev.semestre ?? 0,
      debut: ev.sessionDebut ?? soeurs.reduce((m, e) => (e.date < m ? e.date : m), ev.date),
      fin: ev.sessionFin ?? soeurs.reduce((m, e) => (e.date > m ? e.date : m), ev.date),
      evaluations: soeurs,
    };
  };
  const aUnProgramme = (ev) => planning.evenements.some((x) => x.evaluation === ev.id || x.genere === ev.id);

  /* Réinitialiser : seulement les programmes de l'IA, ou tout. */
  const reinitialiser = (tout) => {
    const message = tout
      ? "Tout effacer : tes cours, tes évaluations et tes programmes de révision ? C'est définitif."
      : "Effacer les séances créées par l'IA ? Tes cours et tes évaluations restent.";
    if (!window.confirm(message)) return;
    modifier(
      tout
        ? { evaluations: [], faites: {}, evenements: [] }
        : { ...planning, evenements: planning.evenements.filter((e) => !e.genere) }
    );
  };

  /* Le programme calculé, jour par jour, pour l'emploi du temps :
     évaluations, tâches de révision, QCM à refaire. */
  const programme = useMemo(() => {
    const parJour = new Map();
    const ajouter = (jour, element) => parJour.set(jour, [...(parJour.get(jour) ?? []), element]);
    const programmees = new Set(planning.evenements.filter((e) => e.genere).map((e) => e.evaluation || e.genere));
    for (const { ev, plan } of plans) {
      if (programmees.has(ev.id)) continue;
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
  }, [plans, auj, planning.evenements]);

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

        <section className="card flex flex-wrap items-center gap-4 bg-gradient-to-br from-brand-600 to-violet-600 p-5 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15">
            <Icon name="sparkles" className="size-5.5" />
          </span>
          <div className="min-w-60 flex-1">
            <h2 className="font-semibold">Des examens approchent ?</h2>
            <p className="mt-0.5 text-sm text-white/85">
              Donne ton semestre, les dates de ta session, tes matières et tes heures libres : l&apos;IA place
              tes séances de révision dans ton emploi du temps, matière par matière, avant chaque examen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssistant({ session: null })}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Créer mon programme avec l&apos;IA
          </button>
        </section>

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
            Chaque examen ajouté avec l&apos;IA, et le détail de ce qu&apos;il faut revoir. Tu peux refaire son
            programme si tes disponibilités changent.
          </p>
        </div>

        {evaluations.length === 0 && (
          <EtatVide
            titre="Aucune évaluation pour le moment"
            texte="Clique sur « Créer mon programme avec l'IA » pour ajouter ton prochain examen."
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
                    {ev.heure ? ` à ${ev.heure}` : ""}
                    {ev.semestre ? ` · semestre ${ev.semestre}` : ""}
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
                    setAssistant({ session: sessionDe(ev) });
                  }}
                  className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                >
                  {aUnProgramme(ev) ? "Refaire le programme" : "Programme avec l'IA"}
                </button>
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

        <section className="card flex flex-wrap items-center gap-3 p-5">
          <div className="min-w-60 flex-1">
            <h2 className="font-semibold text-ink-900 dark:text-white">Réinitialiser le planning</h2>
            <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
              Repartir de zéro : effacer seulement les séances créées par l&apos;IA, ou tout ton planning.
            </p>
          </div>
          <button
            type="button"
            onClick={() => reinitialiser(false)}
            disabled={!planning.evenements.some((e) => e.genere)}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 disabled:opacity-40 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800"
          >
            Effacer les séances de l&apos;IA
          </button>
          <button
            type="button"
            onClick={() => reinitialiser(true)}
            disabled={!planning.evenements.length && !planning.evaluations.length}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-flame-600 ring-1 ring-flame-300 ring-inset hover:bg-flame-50 disabled:opacity-40 dark:text-flame-400 dark:ring-flame-500/40 dark:hover:bg-flame-500/10"
          >
            Tout effacer
          </button>
        </section>

        {assistant && (
          <AssistantProgramme
            contexte={contexte}
            evenements={planning.evenements}
            session={assistant.session}
            onValider={validerProgramme}
            onFermer={() => setAssistant(null)}
          />
        )}

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
