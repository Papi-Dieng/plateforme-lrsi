import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { verifierExercice } from "../verification";

/* ==================================================================
   « Vérifier ma réponse », dans un exercice.

   L'étudiant tape ses résultats ; chacun passe au vert ou au rouge,
   sans que la bonne réponse soit montrée. Il peut corriger et
   revérifier autant qu'il veut : c'est chercher qui fait apprendre,
   pas lire la correction. Après deux essais ratés, on lui propose
   l'indice ; tout juste, on l'invite à comparer sa méthode au corrigé.
   ================================================================== */

export default function VerifierReponse({ lignes, onReussi, onBesoinIndice, indiceDisponible }) {
  const [saisies, setSaisies] = useState(() => lignes.map(() => ""));
  const [resultats, setResultats] = useState(null);
  const [essais, setEssais] = useState(0);

  const verifier = (e) => {
    e.preventDefault();
    const r = verifierExercice(lignes, saisies);
    setResultats(r);
    setEssais((n) => n + 1);
    if (r.every((x) => x.juste)) onReussi?.();
  };

  const toutJuste = resultats?.every((x) => x.juste);
  const justes = resultats?.filter((x) => x.juste).length ?? 0;

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
        <Icon name="target" className="size-4.5 text-brand-600 dark:text-brand-400" />
        Vérifier ma réponse
      </h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Tape tes résultats : le site te dit s'ils sont justes, sans te donner la réponse.
      </p>

      <form onSubmit={verifier} className="mt-4 space-y-3">
        {lignes.map((l, i) => {
          const r = resultats?.[i];
          return (
            <label key={l.libelle} className="block">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">{l.libelle}</span>
              <span className="mt-1.5 flex items-center gap-2">
                <input
                  value={saisies[i]}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSaisies((s) => s.map((x, j) => (j === i ? v : x)));
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={r && !r.juste && !r.vide ? true : undefined}
                  className={cx(
                    "w-full max-w-xs rounded-xl border bg-white px-3.5 py-2 font-mono text-sm text-ink-900 focus:outline-none focus:ring-2 dark:bg-ink-950 dark:text-white",
                    !r
                      ? "border-ink-200 focus:border-brand-400 focus:ring-brand-500/20 dark:border-ink-700"
                      : r.juste
                        ? "border-accent-500 focus:ring-accent-500/20"
                        : r.vide
                          ? "border-ink-300 dark:border-ink-600"
                          : "border-flame-500 focus:ring-flame-500/20"
                  )}
                />
                {r && !r.vide && (
                  <span
                    className={cx(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      r.juste
                        ? "bg-accent-100 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400"
                        : "bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400"
                    )}
                    aria-label={r.juste ? "juste" : "à revoir"}
                  >
                    <Icon name={r.juste ? "check" : "close"} className="size-4" />
                  </span>
                )}
              </span>
            </label>
          );
        })}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saisies.every((s) => !s.trim())}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vérifier
          </button>
          {resultats && (
            <p
              role="status"
              className={cx(
                "text-sm font-medium",
                toutJuste ? "text-accent-700 dark:text-accent-400" : "text-ink-600 dark:text-ink-300"
              )}
            >
              {toutJuste
                ? "Tout est juste, bravo ! Compare maintenant ta méthode à la correction."
                : `${justes} sur ${lignes.length} juste${justes > 1 ? "s" : ""}. Corrige ce qui est en rouge et revérifie.`}
            </p>
          )}
        </div>

        {!toutJuste && essais >= 2 && indiceDisponible && (
          <p className="text-sm text-sun-800 dark:text-sun-400">
            Tu bloques ?{" "}
            <button type="button" onClick={onBesoinIndice} className="font-semibold underline">
              Affiche l'indice
            </button>{" "}
            avant d'ouvrir la correction.
          </p>
        )}
      </form>
    </section>
  );
}
