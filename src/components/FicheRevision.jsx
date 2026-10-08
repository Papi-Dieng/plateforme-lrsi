import { useState } from "react";
import Icon from "./Icon";
import { ficheRevision, iaActive, raisonEchec } from "../ia";

/* ==================================================================
   La fiche de révision d'un chapitre : au clic, l'IA en tire les points
   clés et les définitions, à partir du SEUL texte du cours (le texte
   écrit dans l'admin, sinon celui lu dans son PDF). La fiche est gardée
   dans le navigateur : la rouvrir ne redemande rien à l'IA, tant que le
   cours n'a pas changé.
   ================================================================== */

const CLE = "lrsi-fiches";

// Une empreinte courte du texte : un cours modifié donne une autre fiche.
const empreinte = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return `${s.length}-${h >>> 0}`;
};

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) ?? {};
  } catch {
    return {};
  }
}

function garder(cle, fiche) {
  try {
    const toutes = lire();
    toutes[cle] = fiche;
    // Les 40 dernières fiches suffisent.
    const cles = Object.keys(toutes);
    if (cles.length > 40) delete toutes[cles[0]];
    localStorage.setItem(CLE, JSON.stringify(toutes));
  } catch {
    /* stockage indisponible : la fiche sera redemandée la prochaine fois */
  }
}

export default function FicheRevision({ reference, titre, texte, couleur = "#1f2937", className }) {
  const cle = `${reference}@${empreinte(texte ?? "")}`;
  const [fiche, setFiche] = useState(() => lire()[cle] ?? null);
  const [ouverte, setOuverte] = useState(false);
  const [etat, setEtat] = useState({ attente: false, erreur: "" });

  if (!iaActive || !texte || texte.trim().length < 80) return null;

  const demander = async () => {
    setOuverte(true);
    if (fiche) return;
    setEtat({ attente: true, erreur: "" });
    try {
      const f = await ficheRevision({ titre, texte });
      setFiche(f);
      garder(cle, f);
      setEtat({ attente: false, erreur: "" });
    } catch (e) {
      setEtat({ attente: false, erreur: raisonEchec(e.message) });
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={ouverte ? () => setOuverte(false) : demander}
        aria-expanded={ouverte}
        className="inline-flex min-h-10 items-center gap-2 rounded-full border border-ink-200 bg-white px-4 text-sm font-bold text-ink-900 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:bg-ink-800"
      >
        <Icon name="sparkles" className="size-4" style={{ color: couleur }} />
        {ouverte ? "Masquer la fiche de révision" : "Fiche de révision"}
      </button>

      {ouverte && (
        <section aria-label={`Fiche de révision : ${titre}`} aria-live="polite" className="apparition mt-3 rounded-[20px] border border-ink-200 bg-ink-50 p-5 dark:border-ink-700 dark:bg-ink-950">
          {etat.attente ? (
            <p className="flex items-center gap-2 text-sm font-bold text-ink-700 dark:text-ink-200">
              <span aria-hidden="true" className="size-3 animate-ping rounded-full" style={{ background: couleur }} />
              L&apos;IA lit le cours et prépare ta fiche…
            </p>
          ) : etat.erreur ? (
            <div className="space-y-3">
              <p role="alert" className="text-sm text-flame-700 dark:text-flame-400">
                {etat.erreur}
              </p>
              <button type="button" onClick={demander} className="text-sm font-bold underline">
                Réessayer
              </button>
            </div>
          ) : (
            fiche && (
              <>
                <p className="text-xs font-extrabold tracking-wide text-ink-600 uppercase dark:text-ink-300">Points clés</p>
                <ol className="mt-2 space-y-2">
                  {fiche.points.map((p, i) => (
                    <li key={i} className="flex gap-3 text-[15px]/6 text-ink-900 dark:text-ink-100">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white" style={{ background: couleur }}>
                        {i + 1}
                      </span>
                      {p}
                    </li>
                  ))}
                </ol>
                {fiche.definitions?.length > 0 && (
                  <>
                    <p className="mt-5 text-xs font-extrabold tracking-wide text-ink-600 uppercase dark:text-ink-300">À retenir</p>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      {fiche.definitions.map((d) => (
                        <div key={d.terme} className="rounded-xl bg-white p-3 dark:bg-ink-900">
                          <dt className="text-sm font-extrabold text-ink-950 dark:text-white">{d.terme}</dt>
                          <dd className="mt-0.5 text-sm/6 text-ink-700 dark:text-ink-300">{d.sens}</dd>
                        </div>
                      ))}
                    </dl>
                  </>
                )}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-ink-600 dark:text-ink-300">
                  <Icon name="info" className="size-3.5" />
                  Rédigée par une IA à partir du cours : elle peut se tromper, le cours fait foi.
                </p>
              </>
            )
          )}
        </section>
      )}
    </div>
  );
}
