import { useEffect, useMemo, useState } from "react";
import Icon from "../components/Icon";
import { EnTeteAdmin } from "../components/LayoutAdmin";
import { mono } from "../components/styleAdmin";
import { cx } from "../components/classes";
import ConnexionAdmin, {
  champAdmin,
} from "../components/ConnexionAdmin";
import { ecrireSessionAdmin, messageErreurAdmin, useSessionAdmin } from "../sessionAdmin";
import { effacerStatsAdmin, lireStatsAdmin } from "../ia";
import { matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Les questions de QCM les plus ratées, d'après les réponses anonymes
   des étudiants (`serveur-ia/stats.js`).

   Pour chaque question : le taux d'échec, le nombre de réponses, et la
   répartition des réponses choisies. La mauvaise réponse la plus
   choisie dit souvent quelle confusion réexpliquer.
   ================================================================== */

// En dessous, un taux d'échec ne veut pas dire grand-chose.
const MINIMUM = 5;

function analyser(qcms) {
  const lignes = [];
  for (const q of qcms) {
    for (const [cle, s] of Object.entries(q.questions ?? {})) {
      const choix = s.options.map((_, i) => s.choix?.[i] ?? 0);
      const repondu = choix.reduce((a, b) => a + b, 0);
      const total = repondu + (s.sansReponse ?? 0);
      if (total === 0) continue;
      const justes = choix[s.bonne] ?? 0;
      let piege = -1;
      choix.forEach((n, i) => {
        if (i !== s.bonne && n > 0 && (piege < 0 || n > choix[piege])) piege = i;
      });
      lignes.push({
        cle: `${q.id}:${cle}`,
        qcm: q,
        ...s,
        choix,
        total,
        taux: Math.round(((total - justes) / total) * 100),
        piege,
      });
    }
  }
  return lignes.sort((a, b) => b.taux - a.taux || b.total - a.total);
}

// Le niveau d'alerte d'un taux d'échec : couleur du chiffre et étiquette.
const niveau = (taux) =>
  taux >= 60
    ? { classe: "text-flame-600 dark:text-flame-400", pastille: "bg-flame-100 text-flame-800 dark:bg-flame-500/15 dark:text-flame-300", label: "À réexpliquer en priorité" }
    : taux >= 35
      ? { classe: "text-sun-900 dark:text-sun-400", pastille: "bg-sun-100 text-sun-900 dark:bg-sun-500/15 dark:text-sun-100", label: "À surveiller" }
      : { classe: "text-lime-800 dark:text-lime-400", pastille: "bg-lime-100 text-lime-900 dark:bg-lime-400/15 dark:text-lime-200", label: "Bien comprise" };

function Question({ l, rang }) {
  const n = niveau(l.taux);
  const matiere = matieres.find((m) => m.id === l.qcm.matiere);
  return (
    <li className="flex flex-col gap-6 rounded-[28px] border border-ink-200 bg-white p-6 sm:flex-row sm:gap-10 sm:p-8 dark:border-ink-800 dark:bg-ink-900">
      <div className="shrink-0 sm:w-44">
        <p className={cx("text-xs text-ink-500 dark:text-ink-400", mono)}>N° {String(rang).padStart(2, "0")}</p>
        <p className={cx("mt-2 text-[64px] leading-none font-extrabold tracking-[-0.05em]", n.classe)}>
          {l.taux}
          <span className="ml-1 text-2xl">%</span>
        </p>
        <p className="sr-only">d&apos;échec</p>
        <span className={cx("mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold", n.pastille)}>{n.label}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-500 dark:text-ink-400">
          <span className="inline-flex items-center gap-1.5 font-bold text-ink-950 dark:text-white">
            {matiere && <i className={cx("size-2 rounded-full", themeMatiere(matiere).point)} aria-hidden="true" />}
            {matiere?.nomCourt ?? nomMatiere(l.qcm.matiere)}
          </span>
          <span>{l.qcm.titre}</span>
          <span>
            · {l.total} réponse{l.total > 1 ? "s" : ""}
          </span>
        </p>
        <p className="mt-2 text-lg/snug font-extrabold text-ink-950 dark:text-white">{l.enonce}</p>
        <ul className="mt-4 space-y-3">
          {l.options.map((o, i) => {
            const part = Math.round((l.choix[i] / l.total) * 100);
            return (
              <li key={i}>
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="min-w-0 truncate font-mono text-ink-800 dark:text-ink-200">{o}</span>
                  {i === l.bonne && (
                    <span className="shrink-0 rounded-full bg-lime-100 px-2.5 py-0.5 text-xs font-bold text-lime-900 dark:bg-lime-400/15 dark:text-lime-200">
                      Bonne réponse
                    </span>
                  )}
                  {i === l.piege && (
                    <span className="shrink-0 rounded-full bg-flame-100 px-2.5 py-0.5 text-xs font-bold text-flame-800 dark:bg-flame-500/15 dark:text-flame-300">
                      Piège le plus choisi
                    </span>
                  )}
                  <span className="ml-auto shrink-0 font-mono text-xs text-ink-500 dark:text-ink-400">
                    {l.choix[i]} · {part} %
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                  <div
                    className={cx("h-full rounded-full", i === l.bonne ? "bg-lime-600" : i === l.piege ? "bg-flame-500" : "bg-ink-300 dark:bg-ink-600")}
                    style={{ width: `${part}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        {l.sansReponse > 0 && (
          <p className="mt-4 text-[13px] text-ink-500 dark:text-ink-400">Sans réponse (temps écoulé) : {l.sansReponse}</p>
        )}
      </div>
    </li>
  );
}

export default function StatsAdmin() {
  const motDePasse = useSessionAdmin();
  const [qcms, setQcms] = useState(null);
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [matiere, setMatiere] = useState("");

  useEffect(() => {
    if (!motDePasse) return;
    let actif = true;
    lireStatsAdmin(motDePasse)
      .then((r) => actif && setQcms(r.qcms))
      .catch((e) => {
        if (!actif) return;
        if (e.message === "mot-de-passe") ecrireSessionAdmin("");
        setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
      });
    return () => {
      actif = false;
    };
  }, [motDePasse]);

  const lignes = useMemo(() => (qcms ? analyser(qcms.filter((q) => !matiere || q.matiere === matiere)) : []), [qcms, matiere]);
  const fiables = lignes.filter((l) => l.total >= MINIMUM);
  const peuDeReponses = lignes.filter((l) => l.total < MINIMUM);
  const sessions = (qcms ?? []).filter((q) => !matiere || q.matiere === matiere).reduce((n, q) => n + (q.sessions ?? 0), 0);

  const effacer = async () => {
    if (!window.confirm("Remettre toutes les statistiques à zéro ? C'est définitif.")) return;
    try {
      await effacerStatsAdmin(motDePasse);
      setQcms([]);
      setEtat({ type: "", texte: "Statistiques remises à zéro." });
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  return (
    <>
      <EnTeteAdmin
        titre="Questions les plus ratées"
        texte="D'après les réponses anonymes des étudiants aux QCM : ce qu'il faut réexpliquer en priorité."
      />

      <div className="space-y-5">
        {!motDePasse ? (
          <ConnexionAdmin
            message={etat.type === "erreur" ? etat.texte : ""}
            onConnecte={() => setEtat({ type: "", texte: "" })}
          />
        ) : !qcms ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">{etat.texte || "Chargement des statistiques…"}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-[24px] border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
              <select value={matiere} onChange={(e) => setMatiere(e.target.value)} aria-label="Matière" className={cx(champAdmin, "sm:w-80!")}>
                <option value="">Toutes les matières</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              <span className="text-sm text-ink-600 dark:text-ink-300">
                <b className="text-ink-950 dark:text-white">{sessions}</b> QCM terminé{sessions > 1 ? "s" : ""} ·{" "}
                <b className="text-ink-950 dark:text-white">{lignes.length}</b> question{lignes.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={effacer}
                disabled={qcms.length === 0}
                className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-flame-200 px-4 text-sm font-bold text-flame-600 transition-colors hover:bg-flame-50 disabled:opacity-40 dark:border-flame-500/30 dark:text-flame-400 dark:hover:bg-flame-500/10"
              >
                <Icon name="trash" className="size-4" />
                Remettre à zéro
              </button>
            </div>

            {etat.texte && (
              <p role="status" className={cx("text-sm", etat.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-ink-500 dark:text-ink-400")}>
                {etat.texte}
              </p>
            )}

            {lignes.length === 0 ? (
              <div className="flex gap-3 rounded-[20px] border border-brand-200 bg-brand-50 px-5 py-4 text-sm/6 text-ink-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-ink-200">
                <Icon name="info" className="mt-0.5 size-4.5 shrink-0 text-brand-600 dark:text-brand-400" />
                <p>
                  <strong className="font-bold text-ink-950 dark:text-white">Pas encore de réponses.</strong> Elles arrivent à
                  chaque QCM terminé par un étudiant (sauf s&apos;il a refusé dans ses paramètres). Seuls les QCM publiés depuis
                  l&apos;admin sont comptés.
                </p>
              </div>
            ) : (
              <>
                {fiables.length > 0 && (
                  <ol className="space-y-4">
                    {fiables.map((l, i) => (
                      <Question key={l.cle} l={l} rang={i + 1} />
                    ))}
                  </ol>
                )}
                {peuDeReponses.length > 0 && (
                  <details className="group rounded-[24px] border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-5 text-[15px] font-extrabold text-ink-950 dark:text-white">
                      Moins de {MINIMUM} réponses : pas encore significatif ({peuDeReponses.length})
                      <Icon name="chevron" className="size-5 transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="space-y-4 px-4 pb-4">
                      {peuDeReponses.map((l, i) => (
                        <Question key={l.cle} l={l} rang={fiables.length + i + 1} />
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}

            <p className="flex gap-2.5 text-[13px]/5 text-ink-500 dark:text-ink-400">
              <Icon name="shield" className="mt-0.5 size-4 shrink-0" />
              Anonyme : pour chaque question, seulement des compteurs de réponses. Ni nom, ni identifiant, ni adresse IP, ni
              date par étudiant ne sont gardés. Les étudiants peuvent refuser l&apos;envoi dans leurs paramètres.
            </p>
          </>
        )}
      </div>
    </>
  );
}
