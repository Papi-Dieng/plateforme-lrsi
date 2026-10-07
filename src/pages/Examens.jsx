import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Icon from "../components/Icon";
import TexteLibre from "../components/TexteLibre";
import LecteurPdf from "../components/LecteurPdf";
import { ChoixReponse, RepondreAvecIA } from "../components/RepondreExercice";
import { questionsDe } from "../questionsExercice";
import { corrigerExercice, iaActive, raisonEchec } from "../ia";
import { Container, EtatVide } from "../components/ui";
import { cx } from "../components/classes";
import { mono } from "../components/styleAdmin";
import { annales, examens, getExamen, totalPoints } from "../data/examens";
import { matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";

/* ==================================================================
   Devoirs et examens.

   Côté code, `examens` désigne les devoirs (rédigés pour la
   plateforme) et `annales` les examens (sujets passés de
   l'établissement) : les noms internes datent d'avant le renommage et
   restent, pour que le contenu déjà publié continue de fonctionner.

   Un devoir se passe en conditions réelles : le sujet complet,
   un minuteur, et le corrigé seulement à la fin. L'étudiant écrit ses
   réponses sous chaque partie pendant l'épreuve (question par question,
   ou tout d'un bloc) ; une fois le devoir terminé, l'IA les compare au
   corrigé et dit si elles sont justes (components/RepondreExercice.jsx).
   Dès qu'il appuie sur « Terminer », toutes les parties écrites partent
   à la correction en même temps, et la note se remplit seule : juste =
   tous les points, presque = la moitié, faux ou vide = 0 (demande du
   7 octobre 2026). Chaque case « Mes points » reste modifiable : la note
   de l'IA est une proposition, l'étudiant a le dernier mot. Si l'IA ne
   répond pas, la partie se note à la main. Un devoir donné en PDF n'a
   pas de texte lisible par l'IA : il se corrige seulement à la main.

   Les examens ne sont que des liens vers des sujets dont la
   publication a été autorisée ; la plateforme n'en héberge aucun.

   Mise en page d'après la maquette « Devoirs et examens » (7 octobre
   2026) : en-tête ardoise quadrillé, accent ambre, une copie de devoir
   dessinée dans l'en-tête, le barème en barres, et une barre de minuteur
   sombre collée en haut pendant l'épreuve.
   ================================================================== */

const ARDOISE = "bg-[#1b2328] text-white";
const QUADRILLAGE = {
  backgroundImage:
    "linear-gradient(rgb(255 255 255/0.04) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/0.04) 1px,transparent 1px)",
  backgroundSize: "56px 56px",
};
const AMBRE = "bg-[#ffc94d] text-ink-950";

const formatMinutes = (m) =>
  m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, "0")}` : ""}` : `${m} min`;

const formatChrono = (secondes) => {
  const s = Math.max(secondes, 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

const numero = (n) => String(n).padStart(2, "0");

function Puce({ icone, children, sombre }) {
  return (
    <span
      className={cx(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-bold",
        sombre ? "border border-white/15 text-white" : "bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-200"
      )}
    >
      {icone && <Icon name={icone} className={cx("size-4", sombre && "text-[#ffc94d]")} />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Liste                                                               */
/* ------------------------------------------------------------------ */

/* La copie de devoir dessinée dans l'en-tête, d'après le premier devoir. */
function Copie() {
  const x = examens.find((e) => e.format !== "pdf" && e.parties?.length);
  if (!x) return null;
  return (
    <div aria-hidden="true" className="relative hidden w-full max-w-[480px] select-none md:block">
      <div className="absolute inset-x-6 top-6 -bottom-24 rotate-[2deg] rounded-md bg-[#f4f3ee] [background-image:repeating-linear-gradient(transparent_0_31px,#d9d6cc_31px_32px)]" />
      <div className="relative -rotate-[2deg] rounded-md bg-white px-7 pt-6 pb-7 text-ink-950 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.7)]">
        <div className={cx("flex justify-between border-b-2 border-ink-950 pb-2 text-[10.5px] text-ink-600", mono)}>
          <span>LRSI · {nomMatiere(x.matiere).toUpperCase()}</span>
          <span>SUJET</span>
        </div>
        <p className="mt-4 text-[26px] leading-tight font-extrabold tracking-tight">{x.titre}</p>
        <p className="mt-1 text-sm font-bold">
          Durée : {formatMinutes(x.dureeMinutes)} <span className="ml-4">Sur {totalPoints(x)} points</span>
        </p>
        {x.consignes && <p className="mt-3 line-clamp-2 text-[13px] text-ink-600 italic">{x.consignes}</p>}
        <ol className="mt-3 space-y-1.5">
          {x.parties.map((p, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm font-bold">
              <span className={cx("text-[10px] text-ink-500", mono)}>P{i + 1}</span>
              <span className="truncate">{p.titre}</span>
              <span className="flex-1 border-b border-dotted border-ink-300" />
              <span className={cx("text-xs", mono)}>{p.points} pts</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid grid-cols-2 gap-6 text-xs text-ink-500">
          <span className="border-b border-ink-300 pb-1">Nom</span>
          <span className="border-b border-ink-300 pb-1">Prénom</span>
        </div>
      </div>
    </div>
  );
}

function Bareme({ examen }) {
  const total = totalPoints(examen) || 1;
  const max = Math.max(...examen.parties.map((p) => p.points));
  return (
    <div className="min-w-0 flex-[1_1_min(420px,100%)]">
      <div className={cx("flex justify-between text-[11px] text-ink-500 dark:text-ink-400", mono)}>
        <span>BARÈME</span>
        <span>{totalPoints(examen)} POINTS</span>
      </div>
      <ol className="mt-2 flex gap-1.5">
        {examen.parties.map((p, i) => (
          <li key={i} className="min-w-0" style={{ flex: `${p.points / total} 1 0` }}>
            <span
              className={cx(
                "grid h-11 place-items-center rounded-xl font-mono text-sm font-bold",
                p.points === max ? AMBRE : "bg-[#1b2328] text-white dark:bg-ink-700"
              )}
            >
              {p.points}
            </span>
            <span className="mt-1.5 block text-xs/4 font-semibold text-ink-700 dark:text-ink-300">
              P{i + 1} · {p.titre}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ExamensListe() {
  const [matiere, setMatiere] = useState("toutes");

  const matieresListees = matieres.filter((m) => examens.some((x) => x.matiere === m.id) || annales.some((a) => a.matiere === m.id));
  const garde = (x) => matiere === "toutes" || x.matiere === matiere;
  const blancs = examens.filter(garde);
  const sujets = annales.filter(garde);

  const pastille = (actif) =>
    cx(
      "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors",
      actif
        ? "border-[#1b2328] bg-[#1b2328] text-white dark:border-white dark:bg-white dark:text-ink-950"
        : "border-ink-200 bg-white text-ink-950 hover:border-ink-400 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
    );

  return (
    <>
      <header className={cx(ARDOISE, "overflow-hidden")} style={QUADRILLAGE}>
        <Container className="pt-10 pb-20 sm:pt-12">
          <nav aria-label="Fil d'Ariane" className={cx("flex flex-wrap gap-2 text-xs text-ink-300", mono)}>
            <Link to="/tableau-de-bord" className="hover:text-white">
              ACCUEIL
            </Link>
            <span aria-hidden="true">/</span>
            <span>PRÉPARER LES PARTIELS</span>
            <span aria-hidden="true">/</span>
            <b className="font-medium text-white" aria-current="page">
              DEVOIRS ET EXAMENS
            </b>
          </nav>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-x-14 gap-y-12">
            <div className="min-w-0 flex-[1_1_min(520px,100%)]">
              <h1 className="text-[clamp(3.2rem,9vw,7.5rem)] leading-[0.86] font-extrabold tracking-[-0.06em]">
                Devoirs <span className="block text-[#ffc94d]">et examens.</span>
              </h1>
              <p className="mt-7 max-w-[500px] text-lg/8 text-ink-200">
                Des devoirs à faire en conditions réelles, avec minuteur et corrigé à la fin, et les sujets d&apos;examens passés
                dont la publication a été autorisée.
              </p>
              <ul className="mt-7 flex flex-wrap gap-3">
                {[
                  ["clock", "Minuteur", "en haut de la page"],
                  ["lock", "Corrigé à la fin", "jamais avant"],
                  ["pencil", "Tu te notes", "partie par partie"],
                ].map(([icone, titre, texte]) => (
                  <li key={titre} className="flex items-center gap-3 rounded-[16px] border border-white/12 bg-white/4 px-3.5 py-3">
                    <span className={cx("grid size-9 place-items-center rounded-[10px]", AMBRE)}>
                      <Icon name={icone} className="size-4.5" />
                    </span>
                    <span className="leading-tight">
                      <span className="block font-extrabold">{titre}</span>
                      <span className="text-[13px] text-ink-300">{texte}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Copie />
          </div>
        </Container>
      </header>

      <Container className="space-y-14 py-14">
        {matieresListees.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par matière">
            <button type="button" onClick={() => setMatiere("toutes")} aria-pressed={matiere === "toutes"} className={pastille(matiere === "toutes")}>
              Toutes
            </button>
            {matieresListees.map((m) => (
              <button key={m.id} type="button" onClick={() => setMatiere(m.id)} aria-pressed={matiere === m.id} className={pastille(matiere === m.id)}>
                <i aria-hidden="true" className={cx("size-2 rounded-full", themeMatiere(m).point)} />
                {m.nomCourt}
              </button>
            ))}
          </div>
        )}

        <section aria-labelledby="titre-devoirs">
          <h2 id="titre-devoirs" className="flex items-center gap-3 text-[clamp(2.2rem,4.5vw,3.2rem)] leading-none font-extrabold tracking-[-0.045em] text-ink-950 dark:text-white">
            Devoirs
            <span className="rounded-lg bg-[#1b2328] px-2 py-0.5 font-mono text-sm font-bold tracking-normal text-white dark:bg-white dark:text-ink-950">{blancs.length}</span>
          </h2>
          {blancs.length === 0 ? (
            <p className="mt-5 text-[15px] text-ink-600 dark:text-ink-300">Aucun devoir pour le moment.</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {blancs.map((x) => (
                <li key={x.id}>
                  <Link
                    to={`/examens/${x.id}`}
                    className="group flex flex-wrap items-center gap-x-10 gap-y-6 rounded-[28px] border border-ink-200 bg-white p-6 transition-colors hover:border-[#1b2328]/40 sm:p-8 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-white/30"
                  >
                    <span className="min-w-0 flex-[1_1_300px]">
                      <span className={cx("block text-[11px] text-ink-500 dark:text-ink-400", mono)}>{nomMatiere(x.matiere).toUpperCase()}</span>
                      <span className="mt-2 block text-[28px] leading-[1.1] font-extrabold tracking-[-0.03em] text-ink-950 dark:text-white">{x.titre}</span>
                      <span className="mt-3 flex flex-wrap gap-2">
                        <Puce icone="clock">{formatMinutes(x.dureeMinutes)}</Puce>
                        <Puce icone={x.format === "pdf" ? "file" : "layers"}>{x.format === "pdf" ? "Sujet en PDF" : `${x.parties.length} parties`}</Puce>
                        <Puce>Sur {totalPoints(x)} points</Puce>
                      </span>
                    </span>
                    {x.format !== "pdf" && x.parties?.length > 0 && <Bareme examen={x} />}
                    <span className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-[#1b2328] px-5 text-[15px] font-extrabold text-white transition-colors group-hover:bg-ink-950 dark:bg-white dark:text-ink-950">
                      Commencer
                      <Icon name="arrow" className="size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="titre-examens">
          <h2 id="titre-examens" className="flex items-center gap-3 text-[clamp(2.2rem,4.5vw,3.2rem)] leading-none font-extrabold tracking-[-0.045em] text-ink-950 dark:text-white">
            Examens
            <span className="rounded-lg bg-ink-100 px-2 py-0.5 font-mono text-sm font-bold tracking-normal text-ink-700 dark:bg-ink-800 dark:text-ink-200">{sujets.length}</span>
          </h2>
          {sujets.length === 0 ? (
            <div className="mt-6 flex gap-5 rounded-[24px] border border-dashed border-ink-300 bg-white p-6 dark:border-ink-700 dark:bg-ink-900">
              <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-ink-100 text-ink-800 dark:bg-ink-800 dark:text-ink-200">
                <Icon name="lock" className="size-5" />
              </span>
              <p className="text-[15px]/6 text-ink-700 dark:text-ink-300">
                <strong className="block text-[17px] font-extrabold text-ink-950 dark:text-white">Aucun examen publié pour le moment.</strong>
                Les sujets d&apos;examens appartiennent à l&apos;établissement et aux enseignants : ils ne sont publiés ici qu&apos;avec
                leur autorisation écrite.
              </p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {sujets.map((a) => (
                <li key={a.id} className="flex items-start gap-4 rounded-[24px] border border-ink-200 bg-white p-6 dark:border-ink-800 dark:bg-ink-900">
                  <span className={cx("grid size-11 shrink-0 place-items-center rounded-[12px]", AMBRE)}>
                    <Icon name="file" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-extrabold text-ink-950 dark:text-white">{a.titre}</p>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">{[nomMatiere(a.matiere), a.annee, a.session].filter(Boolean).join(" · ")}</p>
                    <div className="mt-3 flex flex-wrap gap-2.5 text-sm font-bold">
                      <a href={a.lienSujet} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-ink-200 px-3 py-2 text-ink-950 hover:bg-ink-50 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800">
                        Sujet ↗
                      </a>
                      {a.lienCorrige && (
                        <a href={a.lienCorrige} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-ink-200 px-3 py-2 text-ink-950 hover:bg-ink-50 dark:border-ink-700 dark:text-white dark:hover:bg-ink-800">
                          Corrigé ↗
                        </a>
                      )}
                    </div>
                    {a.autorisation?.detail && <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">Publié avec l&apos;accord : {a.autorisation.detail}</p>}
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
/* Faire un devoir                                                     */
/* ------------------------------------------------------------------ */

function ChampPoints({ valeur, max, onChange }) {
  return (
    <label className="mt-5 flex items-center gap-3 text-sm font-extrabold text-ink-950 dark:text-white">
      Mes points
      <input
        type="number"
        min={0}
        max={max}
        step={0.5}
        value={valeur ?? ""}
        onChange={(e) => onChange(Math.min(Math.max(Number(e.target.value), 0), max))}
        className="h-12 w-20 rounded-[14px] border border-ink-200 bg-white px-3 text-center font-mono text-base font-bold dark:border-ink-700 dark:bg-ink-950"
      />
      <span className="font-mono font-medium text-ink-500 dark:text-ink-400">/ {max}</span>
    </label>
  );
}

function BlocCorrige({ children }) {
  return (
    <div className="mt-5 rounded-[20px] bg-[#1b2328] p-5 text-white dark:ring-1 dark:ring-white/10">
      <p className={cx("text-[11px] font-bold text-[#ffc94d] uppercase", mono)}>Corrigé</p>
      <div className="mt-3 [&_*]:text-ink-100!">{children}</div>
    </div>
  );
}

export function ExamenSession() {
  const { id } = useParams();
  const examen = getExamen(id);
  const [etape, setEtape] = useState("consignes"); // consignes → epreuve → corrige
  const [fin, setFin] = useState(null);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const [notes, setNotes] = useState({});
  // La façon de répondre, choisie avant de commencer, pour toutes les parties.
  const [modeReponse, setModeReponse] = useState("questions");
  // Ce qui est écrit sous chaque partie, et la correction de chacune.
  const ecrit = useRef({});
  const [corrections, setCorrections] = useState({});
  const [notesIA, setNotesIA] = useState({});

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
        <EtatVide titre="Devoir introuvable" texte="Il a peut-être été retiré ou renommé.">
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
  // La note proposée pour une partie, d'après le verdict de l'IA.
  const pointsPour = (verdict, max) =>
    verdict === "juste" ? max : verdict === "partiel" ? Math.round(max) / 2 : 0;
  const noterAuto = (i, verdict) => {
    const n = pointsPour(verdict, examen.parties[i].points);
    setNotes((x) => ({ ...x, [i]: n }));
    setNotesIA((x) => ({ ...x, [i]: true }));
  };

  const terminer = () => {
    setEtape("corrige");
    window.scrollTo({ top: 0 });
    if (examen.format === "pdf" || !iaActive) return;
    examen.parties.forEach((p, i) => {
      if (!p.corrige) return;
      const { texte = "", vide = true } = ecrit.current[i] ?? {};
      if (vide) {
        // Rien d'écrit : 0, sans rien envoyer.
        setNotes((x) => ({ ...x, [i]: 0 }));
        return;
      }
      setCorrections((c) => ({ ...c, [i]: { attente: true } }));
      corrigerExercice({ enonce: p.enonce, corrige: p.corrige, reponse: texte })
        .then((r) => {
          setCorrections((c) => ({ ...c, [i]: { resultat: r } }));
          noterAuto(i, r.verdict);
        })
        .catch((e) => setCorrections((c) => ({ ...c, [i]: { erreur: raisonEchec(e.message) } })));
    });
  };
  const corrigeEnCours = Object.values(corrections).some((c) => c.attente);
  const parIA = Object.keys(notesIA).length > 0;

  const pdf = examen.format === "pdf";
  const etapes = [
    `Durée : ${formatMinutes(examen.dureeMinutes)}. Un minuteur s'affiche en haut de la page.`,
    pdf
      ? `Sujet en PDF, noté sur ${total} points. Rédige tes réponses sur une feuille, comme un jour d'examen.`
      : `${examen.parties.length} parties, ${total} points au total. Écris tes réponses sous chaque partie, question par question ou d'un bloc (ou sur une feuille, comme un jour d'examen).`,
    pdf
      ? "Le corrigé ne s'affiche qu'à la fin, et tu te notes toi-même."
      : "Le corrigé ne s'affiche qu'à la fin : l'IA compare alors toutes tes réponses au corrigé et te donne ta note. Tu peux encore changer les points de chaque partie.",
  ];

  return (
    <>
      <header className={ARDOISE} style={QUADRILLAGE}>
        <Container className="pt-10 pb-12">
          <Link to="/examens" className="inline-flex items-center gap-2 text-sm font-bold text-ink-200 hover:text-white">
            <Icon name="arrow" className="size-4 rotate-180" />
            Tous les devoirs et examens
          </Link>
          <p className={cx("mt-6 text-xs font-medium text-[#ffc94d]", mono)}>{nomMatiere(examen.matiere).toUpperCase()}</p>
          <h1 className="mt-3 text-[clamp(2.2rem,5.5vw,4.2rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance">{examen.titre}</h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <Puce icone="clock" sombre>
              {formatMinutes(examen.dureeMinutes)}
            </Puce>
            <Puce icone="bookmark" sombre>
              Sur {total} points
            </Puce>
            {etape === "corrige" && (
              <Puce icone="check" sombre>
                Corrigé affiché
              </Puce>
            )}
          </div>
        </Container>
      </header>

      {/* Minuteur, collé en haut pendant l'épreuve */}
      {etape === "epreuve" && (
        <div className="sticky top-0 z-20 bg-[#141b1f] text-white shadow-[0_10px_30px_-20px_rgb(0_0_0/0.8)]">
          <Container className="flex flex-wrap items-center justify-between gap-4 py-3.5">
            <div className="flex items-center gap-3">
              <Icon name="clock" className={cx("size-6", tempsEcoule ? "text-flame-400" : "text-[#ffc94d]")} />
              <div>
                <p
                  aria-live="polite"
                  className={cx(
                    "font-mono text-[26px] leading-none font-bold tabular-nums",
                    tempsEcoule ? "text-flame-400" : restant < 300 ? "text-[#ffc94d]" : "text-white"
                  )}
                >
                  {tempsEcoule ? "Temps écoulé" : formatChrono(restant)}
                </p>
                {!tempsEcoule && <p className="mt-1 text-xs text-ink-300">Temps restant</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={terminer}
              className={cx("inline-flex min-h-12 items-center gap-2 rounded-[14px] px-5 text-[15px] font-extrabold transition-colors hover:brightness-105", AMBRE)}
            >
              Terminer et voir le corrigé
              <Icon name="arrow" className="size-4" />
            </button>
          </Container>
        </div>
      )}

      <Container className="py-10">
        <div className="mx-auto max-w-[840px] space-y-5">
          {etape === "consignes" && (
            <div className="rounded-[28px] border border-ink-200 bg-white p-6 sm:p-9 dark:border-ink-800 dark:bg-ink-900">
              <h2 className="text-[30px] leading-tight font-extrabold tracking-[-0.03em] text-ink-950 dark:text-white">Avant de commencer</h2>
              <ol className="mt-5">
                {etapes.map((t, i) => (
                  <li key={i} className="flex gap-5 border-b border-ink-100 py-4 last:border-b-0 dark:border-ink-800">
                    <span className="w-10 shrink-0 text-[28px] leading-none font-extrabold tracking-tight text-ink-950 dark:text-white">{numero(i + 1)}</span>
                    <span className="text-base/7 text-ink-700 dark:text-ink-300">{t}</span>
                  </li>
                ))}
              </ol>
              {examen.consignes && (
                <div className="mt-6 rounded-[20px] bg-[#1b2328] p-5 text-white dark:ring-1 dark:ring-white/10">
                  <p className={cx("text-[11px] font-bold text-[#ffc94d]", mono)}>CONSIGNES DU DEVOIR</p>
                  <TexteLibre texte={examen.consignes} className="mt-2 text-base/7 text-white!" />
                </div>
              )}
              {!pdf && examen.parties.some((p) => p.corrige && questionsDe(p.enonce).length > 0) && (
                <ChoixReponse valeur={modeReponse} onChange={setModeReponse} className="mt-6" />
              )}
              <button
                type="button"
                onClick={commencer}
                className="mt-6 inline-flex min-h-13 items-center gap-2.5 rounded-[14px] bg-[#1b2328] px-6 text-[15.5px] font-extrabold text-white transition-colors hover:bg-ink-950 dark:bg-[#ffc94d] dark:text-ink-950"
              >
                <Icon name="clock" className="size-4.5 text-[#ffc94d] dark:text-ink-950" />
                Commencer le devoir
              </button>
            </div>
          )}

          {etape !== "consignes" && pdf && (
            <>
              <section className="rounded-[28px] border border-ink-200 bg-white p-6 sm:p-8 dark:border-ink-800 dark:bg-ink-900">
                <h2 className="text-[26px] font-extrabold tracking-tight text-ink-950 dark:text-white">Sujet</h2>
                <LecteurPdf pdf={examen.pdfEnonce} libelle="Sujet en PDF" titre={`Sujet : ${examen.titre}`} ouvert={etape === "epreuve"} className="mt-4" />
              </section>
              {etape === "corrige" && (
                <section className="rounded-[28px] border border-ink-200 bg-white p-6 sm:p-8 dark:border-ink-800 dark:bg-ink-900">
                  <BlocCorrige>
                    {examen.pdfCorrige ? (
                      <LecteurPdf pdf={examen.pdfCorrige} libelle="Corrigé en PDF" titre={`Corrigé : ${examen.titre}`} ouvert />
                    ) : (
                      <p className="text-sm">Le corrigé de ce devoir n&apos;a pas encore été publié.</p>
                    )}
                  </BlocCorrige>
                  <ChampPoints valeur={notes[0]} max={total} onChange={(v) => setNotes({ 0: v })} />
                </section>
              )}
            </>
          )}

          {etape !== "consignes" &&
            !pdf &&
            examen.parties.map((p, i) => (
              <section key={i} className="rounded-[28px] border border-ink-200 bg-white p-6 sm:p-8 dark:border-ink-800 dark:bg-ink-900">
                <h2 className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-baseline gap-3 text-[26px] leading-tight font-extrabold tracking-[-0.03em] text-ink-950 sm:text-[30px] dark:text-white">
                    <span className={cx("text-xs font-medium text-ink-500 dark:text-ink-400", mono)}>PARTIE {i + 1}</span>
                    {p.titre}
                  </span>
                  <span className={cx("rounded-lg px-2.5 py-1 font-mono text-xs font-bold", AMBRE)}>{p.points} points</span>
                </h2>
                <TexteLibre texte={p.enonce} grand className="mt-4" />

                {/* Écrire ses réponses pendant le devoir ; les faire corriger
                    par l'IA une fois le devoir terminé. Même bloc que les
                    exercices : question par question, ou tout écrire. */}
                <RepondreAvecIA
                  id={`${examen.id}-${i}`}
                  enonce={p.enonce}
                  corrige={p.corrige}
                  encadre={false}
                  verrouille={etape === "epreuve"}
                  mode={modeReponse}
                  libelle={`Ta réponse à la partie ${i + 1}`}
                  onReponse={(texte, vide) => {
                    ecrit.current[i] = { texte, vide };
                  }}
                  correction={corrections[i]}
                  onCorrige={(r) => noterAuto(i, r.verdict)}
                />

                {etape === "corrige" && (
                  <>
                    <BlocCorrige>
                      <TexteLibre texte={p.corrige || "Pas de corrigé pour cette partie."} grand />
                    </BlocCorrige>
                    <ChampPoints
                      valeur={notes[i]}
                      max={p.points}
                      onChange={(v) => {
                        setNotes((n) => ({ ...n, [i]: v }));
                        setNotesIA((x) => {
                          const { [i]: _retire, ...reste } = x;
                          return reste;
                        });
                      }}
                    />
                    {notesIA[i] && <p className="mt-1.5 text-xs text-ink-600 dark:text-ink-300">Points proposés par l'IA : tu peux les changer.</p>}
                  </>
                )}
              </section>
            ))}

          {etape === "corrige" && (
            <div className="flex flex-wrap items-center justify-between gap-6 rounded-[28px] bg-[#1b2328] p-7 text-white sm:p-9 dark:ring-1 dark:ring-white/10" style={QUADRILLAGE}>
              <div>
                <p className={cx("text-xs text-ink-300", mono)}>
                  {corrigeEnCours
                    ? "Ma note, l'IA corrige encore…"
                    : parIA
                      ? "Ma note, proposée par l'IA"
                      : "Ma note, d'après mon auto-correction"}
                </p>
                <p className="mt-2 text-[64px] leading-none font-extrabold tracking-[-0.05em]">
                  {obtenu}
                  <span className="text-[32px] text-[#ffc94d]"> / {total}</span>
                  {total > 0 && total !== 20 && (
                    <span className="ml-3 text-lg font-semibold tracking-normal text-ink-300">soit {Math.round((obtenu / total) * 200) / 10} / 20</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setNotes({});
                    setNotesIA({});
                    setCorrections({});
                    setEtape("consignes");
                  }}
                  className={cx("inline-flex min-h-12 items-center gap-2 rounded-[14px] px-5 text-[15px] font-extrabold transition-colors hover:brightness-105", AMBRE)}
                >
                  <Icon name="arrow" className="size-4 rotate-180" />
                  Recommencer
                </button>
                <Link to="/examens" className="inline-flex min-h-12 items-center rounded-[14px] border border-white/20 px-5 text-[15px] font-bold transition-colors hover:bg-white/10">
                  Tous les devoirs et examens
                </Link>
              </div>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
