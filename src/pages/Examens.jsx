import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import TexteLibre from "../components/TexteLibre";
import LecteurPdf from "../components/LecteurPdf";
import { Badge, Container, EnTetePage, EtatVide, Filtres, cx } from "../components/ui";
import { annales, examens, getExamen, totalPoints } from "../data/examens";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Examens : examens blancs et annales.

   Un examen blanc se passe en conditions réelles : le sujet complet,
   un minuteur, et le corrigé seulement à la fin. L'étudiant se note
   alors lui-même, partie par partie, en comparant sa copie au
   corrigé : une copie rédigée ne se corrige pas automatiquement, et
   une note inventée par la machine serait pire que pas de note.

   Les annales ne sont que des liens vers des sujets dont la
   publication a été autorisée ; la plateforme n'en héberge aucune.
   ================================================================== */

const formatMinutes = (m) =>
  m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}` : `${m} min`;

const formatChrono = (secondes) => {
  const s = Math.max(secondes, 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* ------------------------------------------------------------------ */
/* Liste                                                               */
/* ------------------------------------------------------------------ */

export function ExamensListe() {
  const [matiere, setMatiere] = useState("toutes");

  const options = [
    { value: "toutes", label: "Toutes" },
    ...matieres
      .filter((m) => examens.some((x) => x.matiere === m.id) || annales.some((a) => a.matiere === m.id))
      .map((m) => ({ value: m.id, label: m.nomCourt })),
  ];
  const garde = (x) => matiere === "toutes" || x.matiere === matiere;
  const blancs = examens.filter(garde);
  const sujets = annales.filter(garde);

  return (
    <>
      <EnTetePage
        surtitre="Préparer les partiels"
        titre="Examens"
        texte="Des examens blancs à passer en conditions réelles, avec minuteur et corrigé à la fin, et les sujets d'annales dont la publication a été autorisée."
      />

      <Container className="space-y-12 py-10">
        {options.length > 2 && (
          <Filtres options={options} actif={matiere} onChange={setMatiere} label="Filtrer par matière" />
        )}

        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
            <Icon name="clock" className="size-5 text-brand-500" />
            Examens blancs
          </h2>
          {blancs.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500 dark:text-ink-400">
              Aucun examen blanc pour le moment.
            </p>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {blancs.map((x) => (
                <Link
                  key={x.id}
                  to={`/examens/${x.id}`}
                  className="card group flex flex-col p-6 transition-shadow hover:shadow-md"
                >
                  <span
                    className={cx(
                      "grid size-11 place-items-center rounded-xl",
                      themeMatiere(getMatiere(x.matiere)).pastille
                    )}
                  >
                    <Icon name="graduation" className="size-5.5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                    {x.titre}
                  </h3>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{nomMatiere(x.matiere)}</p>
                  <div className="mt-auto flex items-center gap-3 border-t border-ink-200 pt-4 text-xs text-ink-500 dark:border-ink-800">
                    <span className="flex items-center gap-1">
                      <Icon name="clock" className="size-3.5" />
                      {formatMinutes(x.dureeMinutes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name={x.format === "pdf" ? "file" : "layers"} className="size-3.5" />
                      {x.format === "pdf" ? "Sujet en PDF" : `${x.parties.length} parties`}
                    </span>
                    <span>Sur {totalPoints(x)} points</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
            <Icon name="file" className="size-5 text-brand-500" />
            Annales
          </h2>
          {sujets.length === 0 ? (
            <div className="mt-4 card p-5 text-sm/6 text-ink-600 dark:text-ink-400">
              Aucune annale publiée pour le moment. Les sujets d'examens
              appartiennent à l'établissement et aux enseignants : ils ne sont
              publiés ici qu'avec leur autorisation écrite.
            </div>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {sujets.map((a) => (
                <li key={a.id} className="card flex items-start gap-4 p-5">
                  <span
                    className={cx(
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      themeMatiere(getMatiere(a.matiere)).pastille
                    )}
                  >
                    <Icon name="file" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink-900 dark:text-white">{a.titre}</p>
                    <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                      {[nomMatiere(a.matiere), a.annee, a.session].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm font-medium">
                      <a
                        href={a.lienSujet}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline dark:text-brand-300"
                      >
                        Sujet ↗
                      </a>
                      {a.lienCorrige && (
                        <a
                          href={a.lienCorrige}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-600 hover:underline dark:text-brand-300"
                        >
                          Corrigé ↗
                        </a>
                      )}
                    </div>
                    {a.autorisation?.detail && (
                      <p className="mt-2 text-[11px] text-ink-400">Publié avec l'accord : {a.autorisation.detail}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Passer un examen blanc                                              */
/* ------------------------------------------------------------------ */

export function ExamenSession() {
  const { id } = useParams();
  const examen = getExamen(id);
  const [etape, setEtape] = useState("consignes"); // consignes → epreuve → corrige
  const [fin, setFin] = useState(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [notes, setNotes] = useState({});

  // Un seul minuteur, qui ne tourne que pendant l'épreuve. Le temps
  // restant se calcule depuis l'heure de fin : il reste juste même si
  // l'onglet a été mis en veille.
  useEffect(() => {
    if (etape !== "epreuve") return;
    const minuteur = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuteur);
  }, [etape]);

  const restant = fin ? Math.round((fin - maintenant) / 1000) : 0;
  const tempsEcoule = etape === "epreuve" && restant <= 0;

  const total = useMemo(() => (examen ? totalPoints(examen) : 0), [examen]);
  const obtenu = Object.values(notes).reduce((n, v) => n + (Number(v) || 0), 0);

  if (!examen) {
    return (
      <Container className="py-16">
        <EtatVide titre="Examen introuvable" texte="Il a peut-être été retiré ou renommé.">
          <Link to="/examens" className="text-sm font-medium text-brand-600 hover:underline">
            Retour aux examens
          </Link>
        </EtatVide>
      </Container>
    );
  }

  const commencer = () => {
    setFin(Date.now() + examen.dureeMinutes * 60 * 1000);
    setMaintenant(Date.now());
    setEtape("epreuve");
    window.scrollTo({ top: 0 });
  };
  const terminer = () => {
    setEtape("corrige");
    window.scrollTo({ top: 0 });
  };

  return (
    <>
      <EnTetePage surtitre={nomMatiere(examen.matiere)} titre={examen.titre}>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/examens"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            Tous les examens
          </Link>
          <Badge icone="clock">{formatMinutes(examen.dureeMinutes)}</Badge>
          <Badge>Sur {total} points</Badge>
        </div>
      </EnTetePage>

      {/* Minuteur, collé en haut pendant l'épreuve */}
      {etape === "epreuve" && (
        <div className="sticky top-0 z-20 border-b border-ink-200 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
          <Container className="flex items-center justify-between gap-4 py-3">
            <p
              aria-live="polite"
              className={cx(
                "flex items-center gap-2 font-mono text-lg font-semibold",
                tempsEcoule
                  ? "text-flame-600 dark:text-flame-400"
                  : restant < 300
                    ? "text-sun-700 dark:text-sun-400"
                    : "text-ink-900 dark:text-white"
              )}
            >
              <Icon name="clock" className="size-5" />
              {tempsEcoule ? "Temps écoulé" : formatChrono(restant)}
            </p>
            <button
              type="button"
              onClick={terminer}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Terminer et voir le corrigé
            </button>
          </Container>
        </div>
      )}

      <Container className="py-10">
        <div className="max-w-3xl space-y-5">
          {etape === "consignes" && (
            <div className="card p-6">
              <h2 className="font-semibold text-ink-900 dark:text-white">Avant de commencer</h2>
              <ul className="mt-3 space-y-1.5 text-sm/6 text-ink-600 dark:text-ink-400">
                <li>Durée : {formatMinutes(examen.dureeMinutes)}. Un minuteur s'affiche en haut de la page.</li>
                <li>
                  {examen.format === "pdf"
                    ? `Sujet en PDF, noté sur ${total} points.`
                    : `${examen.parties.length} parties, ${total} points au total.`}{" "}
                  Rédige tes réponses sur une feuille, comme le jour de l'examen.
                </li>
                <li>
                  Le corrigé ne s'affiche qu'à la fin, et tu te notes toi-même
                  {examen.format === "pdf" ? "." : ", partie par partie."}
                </li>
              </ul>
              {examen.consignes && (
                <div className="mt-4 rounded-xl bg-sun-100/60 p-4 dark:bg-sun-500/10">
                  <p className="text-xs font-semibold uppercase tracking-wide text-sun-800 dark:text-sun-400">
                    Consignes de l'examen
                  </p>
                  <TexteLibre texte={examen.consignes} className="mt-1" />
                </div>
              )}
              <button
                type="button"
                onClick={commencer}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
              >
                <Icon name="clock" className="size-4" />
                Commencer l'examen
              </button>
            </div>
          )}

          {etape !== "consignes" && examen.format === "pdf" && (
            <>
              <section className="card p-6">
                <h2 className="font-semibold text-ink-900 dark:text-white">Sujet</h2>
                <LecteurPdf
                  pdf={examen.pdfEnonce}
                  libelle="Sujet en PDF"
                  titre={`Sujet : ${examen.titre}`}
                  ouvert={etape === "epreuve"}
                  className="mt-3"
                />
              </section>
              {etape === "corrige" && (
                <section className="card p-6">
                  <h2 className="font-semibold text-accent-700 dark:text-accent-400">Corrigé</h2>
                  {examen.pdfCorrige ? (
                    <LecteurPdf
                      pdf={examen.pdfCorrige}
                      libelle="Corrigé en PDF"
                      titre={`Corrigé : ${examen.titre}`}
                      ouvert
                      className="mt-3"
                    />
                  ) : (
                    <p className="mt-2 text-sm text-ink-500">Le corrigé de cet examen n'a pas encore été publié.</p>
                  )}
                  <label className="mt-4 flex items-center gap-3 text-sm text-ink-700 dark:text-ink-300">
                    Mes points
                    <input
                      type="number"
                      min={0}
                      max={total}
                      step={0.5}
                      value={notes[0] ?? ""}
                      onChange={(e) =>
                        setNotes({ 0: Math.min(Math.max(Number(e.target.value), 0), total) })
                      }
                      className="w-20 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-950"
                    />
                    <span className="text-ink-500">/ {total}</span>
                  </label>
                </section>
              )}
            </>
          )}

          {etape !== "consignes" &&
            examen.format !== "pdf" &&
            examen.parties.map((p, i) => (
              <section key={i} className="card p-6">
                <h2 className="flex flex-wrap items-baseline justify-between gap-2 font-semibold text-ink-900 dark:text-white">
                  <span>
                    <span className="mr-2 font-mono text-sm text-ink-400">Partie {i + 1}</span>
                    {p.titre}
                  </span>
                  <span className="text-sm font-medium text-ink-500">{p.points} points</span>
                </h2>
                <TexteLibre texte={p.enonce} className="mt-3" />

                {etape === "corrige" && (
                  <div className="mt-5 rounded-xl border border-accent-400/40 bg-accent-50/60 p-4 dark:bg-accent-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wide text-accent-700 dark:text-accent-400">
                      Corrigé
                    </p>
                    <TexteLibre texte={p.corrige || "Pas de corrigé pour cette partie."} className="mt-1" />
                    <label className="mt-4 flex items-center gap-3 text-sm text-ink-700 dark:text-ink-300">
                      Mes points
                      <input
                        type="number"
                        min={0}
                        max={p.points}
                        step={0.5}
                        value={notes[i] ?? ""}
                        onChange={(e) =>
                          setNotes((n) => ({
                            ...n,
                            [i]: Math.min(Math.max(Number(e.target.value), 0), p.points),
                          }))
                        }
                        className="w-20 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-sm dark:border-ink-700 dark:bg-ink-950"
                      />
                      <span className="text-ink-500">/ {p.points}</span>
                    </label>
                  </div>
                )}
              </section>
            ))}

          {etape === "corrige" && (
            <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400">Ma note, d'après mon auto-correction</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 dark:text-white">
                  {obtenu} <span className="text-lg font-medium text-ink-400">/ {total}</span>
                  {total > 0 && total !== 20 && (
                    <span className="ml-3 text-lg font-medium text-ink-500">
                      soit {Math.round((obtenu / total) * 200) / 10} / 20
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotes({});
                  setEtape("consignes");
                }}
                className="rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
              >
                Recommencer
              </button>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
