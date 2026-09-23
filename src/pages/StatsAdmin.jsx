import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, cx } from "../components/ui";
import ConnexionAdmin, {
  champAdmin,
  ecrireSessionAdmin,
  lireSessionAdmin,
  messageErreurAdmin,
} from "../components/ConnexionAdmin";
import { effacerStatsAdmin, lireStatsAdmin } from "../ia";
import { matieres, nomMatiere } from "../data/matieres";

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

function Question({ l }) {
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge ton={l.taux >= 60 ? "flame" : l.taux >= 35 ? "sun" : "accent"}>{l.taux} % d&apos;échec</Badge>
        <span className="text-xs text-ink-500 dark:text-ink-400">
          {l.total} réponse{l.total > 1 ? "s" : ""} · {l.qcm.titre} · {nomMatiere(l.qcm.matiere)}
        </span>
      </div>
      <p className="mt-2 font-medium text-ink-900 dark:text-white">{l.enonce}</p>
      <ul className="mt-3 space-y-1.5">
        {l.options.map((o, i) => {
          const part = Math.round((l.choix[i] / l.total) * 100);
          return (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={cx(
                    "min-w-0 flex-1 truncate",
                    i === l.bonne ? "font-semibold text-accent-700 dark:text-accent-400" : "text-ink-700 dark:text-ink-300"
                  )}
                >
                  {i === l.bonne ? "✓ " : ""}
                  {o}
                  {i === l.piege && <span className="ml-2 text-xs font-semibold text-flame-600 dark:text-flame-400">piège le plus choisi</span>}
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-ink-500">
                  {l.choix[i]} · {part} %
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                <div
                  className={cx("h-full rounded-full", i === l.bonne ? "bg-accent-500" : i === l.piege ? "bg-flame-500" : "bg-ink-300 dark:bg-ink-600")}
                  style={{ width: `${part}%` }}
                />
              </div>
            </li>
          );
        })}
        {l.sansReponse > 0 && (
          <li className="text-xs text-ink-500 dark:text-ink-400">
            Sans réponse (temps écoulé) : {l.sansReponse}
          </li>
        )}
      </ul>
    </li>
  );
}

export default function StatsAdmin() {
  const [motDePasse, setMotDePasse] = useState(lireSessionAdmin);
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
        if (e.message === "mot-de-passe") {
          ecrireSessionAdmin("");
          setMotDePasse("");
        }
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
      <EnTetePage
        surtitre="Coulisses"
        titre="Questions les plus ratées"
        texte="D'après les réponses anonymes des étudiants aux QCM : ce qu'il faut réexpliquer en priorité."
      >
        <Link to="/admin" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
          ← Retour à l&apos;administration
        </Link>
      </EnTetePage>

      <Container className="space-y-6 py-10">
        {etat.texte && (
          <p className={cx("text-sm", etat.type === "erreur" ? "text-flame-600 dark:text-flame-400" : "text-ink-500")}>{etat.texte}</p>
        )}
        {!motDePasse ? (
          <ConnexionAdmin
            onConnecte={(mdp) => {
              setEtat({ type: "", texte: "" });
              setMotDePasse(mdp);
            }}
          />
        ) : !qcms ? (
          <p className="text-sm text-ink-500">Chargement des statistiques…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <select value={matiere} onChange={(e) => setMatiere(e.target.value)} aria-label="Matière" className={cx(champAdmin, "w-auto")}>
                <option value="">Toutes les matières</option>
                {matieres.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom}
                  </option>
                ))}
              </select>
              <span className="text-sm text-ink-500 dark:text-ink-400">
                {sessions} QCM terminé{sessions > 1 ? "s" : ""} · {lignes.length} question{lignes.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={effacer}
                disabled={qcms.length === 0}
                className="ml-auto text-sm font-medium text-flame-600 hover:underline disabled:opacity-40 dark:text-flame-400"
              >
                Remettre à zéro
              </button>
            </div>

            {lignes.length === 0 ? (
              <div className="card flex gap-3 p-5 text-sm/6 text-ink-600 dark:text-ink-400">
                <Icon name="info" className="mt-0.5 size-4.5 shrink-0 text-brand-500" />
                <p>
                  Pas encore de réponses. Elles arrivent à chaque QCM terminé par un étudiant (sauf s&apos;il a
                  refusé dans ses paramètres). Seuls les QCM publiés depuis l&apos;admin sont comptés.
                </p>
              </div>
            ) : (
              <>
                {fiables.length > 0 && (
                  <ol className="space-y-3">
                    {fiables.map((l) => (
                      <Question key={l.cle} l={l} />
                    ))}
                  </ol>
                )}
                {peuDeReponses.length > 0 && (
                  <details className="card p-5">
                    <summary className="cursor-pointer text-sm font-semibold text-brand-600 dark:text-brand-300">
                      Moins de {MINIMUM} réponses : pas encore significatif ({peuDeReponses.length})
                    </summary>
                    <ol className="mt-4 space-y-3">
                      {peuDeReponses.map((l) => (
                        <Question key={l.cle} l={l} />
                      ))}
                    </ol>
                  </details>
                )}
              </>
            )}

            <p className="text-xs text-ink-400">
              Anonyme : pour chaque question, seulement des compteurs de réponses. Ni nom, ni
              identifiant, ni adresse IP, ni date par étudiant ne sont gardés. Les étudiants peuvent refuser l&apos;envoi dans leurs paramètres.
            </p>
          </>
        )}
      </Container>
    </>
  );
}
