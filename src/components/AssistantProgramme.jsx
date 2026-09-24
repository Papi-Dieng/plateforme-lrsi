import { useEffect, useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { ajouterJours, aujourdhui } from "../planning";
import { versDate } from "../emploiDuTemps";
import {
  JOURS_SEMAINE,
  creneauxLibres,
  demanderProgramme,
  disponibilitesParDefaut,
  evenementsExamens,
  heuresTotales,
  matieresDuSemestre,
  repartirSansIA,
  semestres,
  tachesDeSession,
  versEvenements,
} from "../programmeIA";

/* ==================================================================
   « Créer mon programme avec l'IA », pour une session d'examens, en
   trois étapes :
   1. la session : dates de début et de fin, nombre de matières, puis
      pour chacune son semestre (qui limite la liste aux matières de ce
      semestre, donc à leurs cours et exercices), le jour et l'heure de
      son examen ;
   2. les disponibilités : jours de la semaine, heures, et le jour où
      l'étudiant veut commencer ;
   3. le programme proposé, séance par séance, à ajouter à l'emploi du
      temps (ou à recommencer).
   La logique est dans src/programmeIA.js.
   ================================================================== */

const CLE_DISPOS = "lrsi-disponibilites";

function lireDispos() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_DISPOS) ?? "null");
    return brut && typeof brut === "object" ? { ...disponibilitesParDefaut(), ...brut } : disponibilitesParDefaut();
  } catch {
    return disponibilitesParDefaut();
  }
}

const champ =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";
const etiquette = "block text-xs font-semibold text-ink-600 dark:text-ink-300";
const fmt = (jour, options = { weekday: "long", day: "numeric", month: "long" }) =>
  new Intl.DateTimeFormat("fr-FR", options).format(versDate(jour));
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const plusTard = (a, b) => (a > b ? a : b);
const plusTot = (a, b) => (a < b ? a : b);

/* Une ligne d'examen neuve : la prochaine matière pas encore choisie,
   un jour réparti dans la période. */
function nouvelleLigne(matieres, semestre, prises, debut, fin, rang) {
  const matiere = matieresDuSemestre(matieres, semestre).find((m) => !prises.includes(m.id))?.id ?? "";
  return { semestre, matiere, date: plusTot(ajouterJours(debut, rang * 2), fin), heure: "08:00" };
}

export default function AssistantProgramme({ contexte, evenements, session: existante, onValider, onFermer }) {
  const { matieres } = contexte;
  const demain = ajouterJours(aujourdhui(), 1);
  const listeSemestres = semestres(matieres);
  const premierSemestre = listeSemestres[0] ?? 0;

  const [etape, setEtape] = useState(1);
  const [periode, setPeriode] = useState(() => ({
    debut: existante?.debut ?? ajouterJours(aujourdhui(), 14),
    fin: existante?.fin ?? ajouterJours(aujourdhui(), 21),
  }));
  const [lignes, setLignes] = useState(() =>
    existante?.evaluations?.length
      ? existante.evaluations.map((ev) => ({ semestre: ev.semestre ?? 0, matiere: ev.matiere, date: ev.date, heure: ev.heure ?? "08:00", id: ev.id }))
      : [nouvelleLigne(matieres, premierSemestre, [], ajouterJours(aujourdhui(), 14), ajouterJours(aujourdhui(), 21), 0)]
  );
  const [dispos, setDispos] = useState(lireDispos);
  const [depuis, setDepuis] = useState(aujourdhui);
  const [resultat, setResultat] = useState(null); // { seances, resume, parIA, taches, evaluations }
  const [occupe, setOccupe] = useState(false);
  // Des identifiants fixés une fois pour toutes.
  const [ids] = useState(() => {
    const base = Date.now().toString(36);
    return { session: existante?.id ?? `session-${base}`, evaluation: (i) => `eval-${base}-${i}` };
  });

  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const nomDe = (id) => matieres.find((m) => m.id === id)?.nom ?? "";
  const nomSession = `Session du ${fmt(periode.debut, { day: "numeric", month: "long" })} au ${fmt(periode.fin, { day: "numeric", month: "long" })}`;

  const evaluations = lignes.map((l, i) => ({
    id: l.id ?? ids.evaluation(i),
    titre: `Examen de ${nomDe(l.matiere)}`,
    matiere: l.matiere,
    date: l.date,
    heure: l.heure,
    parJour: 2,
    session: ids.session,
    semestre: l.semestre,
    sessionDebut: periode.debut,
    sessionFin: periode.fin,
  }));
  const dernierExamen = lignes.reduce((max, l) => plusTard(max, l.date), periode.debut);
  const creneaux = creneauxLibres({ depuis, jusqua: dernierExamen, disponibilites: dispos, evenements, examens: evaluations });
  const nbJours = new Set(creneaux.map((c) => c.jour)).size;

  /* ---- Modifier la session ---- */
  const changerNombre = (n) => {
    const voulu = Math.min(Math.max(Number(n) || 1, 1), Math.max(matieres.length, 1));
    setLignes((ls) => {
      if (voulu <= ls.length) return ls.slice(0, voulu);
      const suite = [...ls];
      while (suite.length < voulu) {
        const semestre = suite.at(-1)?.semestre ?? premierSemestre;
        suite.push(nouvelleLigne(matieres, semestre, suite.map((l) => l.matiere), periode.debut, periode.fin, suite.length));
      }
      return suite;
    });
  };
  const changerLigne = (i, modif) => setLignes((ls) => ls.map((l, j) => (j === i ? { ...l, ...modif } : l)));
  // Un autre semestre : la matière se remet sur la première libre de ce semestre.
  const changerSemestreLigne = (i, semestre) =>
    setLignes((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const prises = ls.filter((_, k) => k !== i).map((x) => x.matiere);
        const matiere = matieresDuSemestre(matieres, semestre).find((m) => !prises.includes(m.id))?.id ?? "";
        return { ...l, semestre, matiere };
      })
    );
  const changerDispo = (num, modif) => setDispos((d) => ({ ...d, [num]: { ...d[num], ...modif } }));

  const erreurs1 = [];
  if (periode.debut < demain) erreurs1.push("La session doit commencer au plus tôt demain.");
  if (periode.fin < periode.debut) erreurs1.push("La fin de la session doit être après son début.");
  if (lignes.some((l) => !l.matiere)) erreurs1.push("Choisis une matière pour chaque examen.");
  if (new Set(lignes.map((l) => l.matiere)).size < lignes.length) erreurs1.push("Une même matière est choisie deux fois.");
  if (lignes.some((l) => l.date < periode.debut || l.date > periode.fin)) erreurs1.push("Chaque examen doit tomber pendant la session.");

  /* ---- Générer ---- */
  const generer = async () => {
    try {
      localStorage.setItem(CLE_DISPOS, JSON.stringify(dispos));
    } catch {
      /* les disponibilités seront redemandées */
    }
    setOccupe(true);
    setEtape(3);
    const taches = tachesDeSession(evaluations, contexte);
    let seances;
    let resume = "";
    let parIA = true;
    try {
      const r = await demanderProgramme({
        session: nomSession,
        examens: evaluations.map((ev) => ({ matiere: nomDe(ev.matiere), semestre: ev.semestre ? `semestre ${ev.semestre}` : "", date: ev.date, heure: ev.heure })),
        creneaux,
        taches,
      });
      seances = r.seances;
      resume = r.resume;
    } catch {
      parIA = false;
      seances = repartirSansIA(creneaux, taches, evaluations);
      resume =
        "L'IA n'a pas pu répondre : le site a réparti les séances lui-même, entre toutes les matières, en commençant par celles qui passent en premier.";
    }
    setResultat({ seances, resume, parIA, taches, evaluations });
    setOccupe(false);
  };

  const valider = () =>
    onValider({
      sessionId: ids.session,
      evaluations: resultat.evaluations,
      evenements: [...versEvenements(resultat.seances, resultat.taches, ids.session), ...evenementsExamens(resultat.evaluations, ids.session)],
    });

  const parJour = resultat
    ? Object.entries(
        resultat.seances.reduce((acc, s) => {
          (acc[s.jour] ??= []).push(s);
          return acc;
        }, {})
      )
    : [];
  const tacheDe = (s) => resultat.taches.find((t) => t.cle === s.tache);

  const bouton = "rounded-xl px-4 py-2 text-sm font-semibold";
  const principal = cx(bouton, "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50");
  const secondaire = cx(bouton, "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800");

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Créer mon programme avec l'IA"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-ink-900"
      >
        {/* ---- En-tête et étapes ---- */}
        <div className="border-b border-ink-200 p-5 dark:border-ink-800">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="sparkles" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Mon programme de révision</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">
                {etape === 1 ? "Étape 1 sur 3 : ta session d'examens" : etape === 2 ? "Étape 2 sur 3 : tes disponibilités" : "Étape 3 sur 3 : ton programme"}
              </p>
            </div>
            <button type="button" onClick={onFermer} aria-label="Fermer" className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
              <Icon name="close" className="size-4.5" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {[1, 2, 3].map((n) => (
              <span key={n} className={cx("h-1.5 rounded-full", n <= etape ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700")} />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* ---- 1. La session ---- */}
          {etape === 1 && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={etiquette}>
                  Début de la session
                  <input type="date" min={demain} value={periode.debut} onChange={(e) => setPeriode((p) => ({ ...p, debut: e.target.value }))} className={champ} />
                </label>
                <label className={etiquette}>
                  Fin de la session
                  <input type="date" min={periode.debut} value={periode.fin} onChange={(e) => setPeriode((p) => ({ ...p, fin: e.target.value }))} className={champ} />
                </label>
              </div>

              <label className={cx(etiquette, "max-w-xs")}>
                Nombre de matières à l&apos;examen
                <input
                  type="number"
                  min={1}
                  max={Math.max(matieres.length, 1)}
                  value={lignes.length}
                  onChange={(e) => changerNombre(e.target.value)}
                  className={champ}
                />
                <span className="mt-1 block font-normal text-ink-400">
                  Pour chacune, choisis son semestre : la liste ne propose que ses matières, et le programme reprend leurs cours et exercices.
                </span>
              </label>

              <div className="space-y-3">
                {lignes.map((l, i) => (
                  <div key={i} className="grid gap-3 rounded-xl border border-ink-200 p-3 sm:grid-cols-[0.9fr_1.6fr_1fr_0.8fr] dark:border-ink-800">
                    <label className={etiquette}>
                      Semestre
                      <select value={l.semestre} onChange={(e) => changerSemestreLigne(i, Number(e.target.value))} className={champ}>
                        {listeSemestres.map((n) => (
                          <option key={n} value={n}>
                            Semestre {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={etiquette}>
                      Matière {lignes.length > 1 ? i + 1 : ""}
                      <select value={l.matiere} onChange={(e) => changerLigne(i, { matiere: e.target.value })} className={champ}>
                        <option value="">Choisir…</option>
                        {matieresDuSemestre(matieres, l.semestre).map((m) => (
                          <option key={m.id} value={m.id} disabled={lignes.some((x, j) => j !== i && x.matiere === m.id)}>
                            {m.nom}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={etiquette}>
                      Jour de l&apos;examen
                      <input type="date" min={periode.debut} max={periode.fin} value={l.date} onChange={(e) => changerLigne(i, { date: e.target.value })} className={champ} />
                    </label>
                    <label className={etiquette}>
                      Heure
                      <input type="time" value={l.heure} onChange={(e) => changerLigne(i, { heure: e.target.value })} className={champ} />
                    </label>
                  </div>
                ))}
              </div>
              {erreurs1.length > 0 && (
                <ul className="space-y-1 text-xs text-flame-600 dark:text-flame-400">
                  {erreurs1.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ---- 2. Les disponibilités ---- */}
          {etape === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-600 dark:text-ink-400">
                Quand peux-tu réviser ? Coche tes jours et tes heures libres : l&apos;IA place les séances dedans,
                en évitant tes cours déjà notés et les heures de tes examens.
              </p>
              <ul className="space-y-2">
                {JOURS_SEMAINE.map(({ num, nom }) => {
                  const d = dispos[num];
                  return (
                    <li key={num} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 px-3 py-2 dark:border-ink-800">
                      <label className="flex w-28 items-center gap-2 text-sm font-medium text-ink-800 dark:text-ink-200">
                        <input type="checkbox" checked={d.actif} onChange={(e) => changerDispo(num, { actif: e.target.checked })} className="size-4 accent-brand-600" />
                        {nom}
                      </label>
                      <span className={cx("flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400", !d.actif && "opacity-40")}>
                        de
                        <input type="time" disabled={!d.actif} value={d.debut} onChange={(e) => changerDispo(num, { debut: e.target.value })} aria-label={`${nom}, début`} className={cx(champ, "mt-0 w-28")} />
                        à
                        <input type="time" disabled={!d.actif} value={d.fin} onChange={(e) => changerDispo(num, { fin: e.target.value })} aria-label={`${nom}, fin`} className={cx(champ, "mt-0 w-28")} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <label className={etiquette}>
                Je commence à réviser le
                <input type="date" min={aujourdhui()} max={ajouterJours(dernierExamen, -1)} value={depuis} onChange={(e) => setDepuis(e.target.value)} className={champ} />
              </label>
              <p
                className={cx(
                  "rounded-xl px-4 py-3 text-sm",
                  creneaux.length ? "bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100" : "bg-flame-50 text-flame-800 dark:bg-flame-500/10 dark:text-flame-300"
                )}
              >
                {creneaux.length
                  ? `${lignes.length} matière${lignes.length > 1 ? "s" : ""}, ${nbJours} jour${nbJours > 1 ? "s" : ""} de révision jusqu'au dernier examen, ${heuresTotales(creneaux).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h en tout.`
                  : "Aucun créneau libre avant les examens : coche d'autres jours, élargis tes heures ou commence plus tôt."}
              </p>
            </div>
          )}

          {/* ---- 3. Le programme ---- */}
          {etape === 3 &&
            (occupe ? (
              <div className="py-12 text-center">
                <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                <p className="mt-4 text-sm text-ink-600 dark:text-ink-400">L&apos;IA compose ton programme…</p>
              </div>
            ) : (
              resultat && (
                <div className="space-y-4">
                  <p
                    className={cx(
                      "rounded-xl px-4 py-3 text-sm",
                      resultat.parIA ? "bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-200" : "bg-sun-100 text-sun-900 dark:bg-sun-500/15 dark:text-sun-100"
                    )}
                  >
                    {resultat.parIA && <strong className="font-semibold">Proposé par l&apos;IA. </strong>}
                    {resultat.resume}
                  </p>
                  {parJour.map(([jour, seances]) => {
                    const examensDuJour = resultat.evaluations.filter((ev) => ev.date === jour);
                    return (
                      <div key={jour}>
                        <h3 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{majuscule(fmt(jour))}</h3>
                        <ul className="mt-2 space-y-2">
                          {examensDuJour.map((ev) => (
                            <li key={ev.id} className="rounded-xl bg-flame-50 px-3 py-2 text-sm font-semibold text-flame-800 dark:bg-flame-500/10 dark:text-flame-300">
                              {ev.heure} · {ev.titre}
                            </li>
                          ))}
                          {seances.map((s, i) => {
                            const t = tacheDe(s);
                            return (
                              <li key={i} className="flex gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                                <span className="w-24 shrink-0 text-sm font-semibold text-accent-700 dark:text-accent-400">
                                  {s.debut}–{s.fin}
                                </span>
                                <span className="min-w-0 flex-1 text-sm">
                                  {t && (
                                    <span className="mb-1 inline-block rounded bg-ink-100 px-1.5 py-0.5 text-[11px] font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                                      {t.nomMatiere}
                                    </span>
                                  )}
                                  <span className="block font-medium text-ink-900 dark:text-white">{s.titre || t?.titre || "Révision"}</span>
                                  {s.conseil && <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{s.conseil}</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                  <div className="rounded-xl bg-flame-50 p-3 text-sm text-flame-800 dark:bg-flame-500/10 dark:text-flame-300">
                    <p className="font-semibold">Tes examens</p>
                    <ul className="mt-1 space-y-0.5">
                      {[...resultat.evaluations]
                        .sort((a, b) => (a.date + a.heure).localeCompare(b.date + b.heure))
                        .map((ev) => (
                          <li key={ev.id}>
                            {majuscule(fmt(ev.date))} à {ev.heure} : {nomDe(ev.matiere)}{ev.semestre ? ` (semestre ${ev.semestre})` : ""}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )
            ))}
        </div>

        {/* ---- Boutons ---- */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-ink-200 p-4 dark:border-ink-800">
          {etape === 1 && (
            <>
              <button type="button" onClick={onFermer} className={secondaire}>
                Annuler
              </button>
              <button type="button" disabled={erreurs1.length > 0} onClick={() => setEtape(2)} className={principal}>
                Suivant
              </button>
            </>
          )}
          {etape === 2 && (
            <>
              <button type="button" onClick={() => setEtape(1)} className={secondaire}>
                Retour
              </button>
              <button type="button" disabled={!creneaux.length} onClick={generer} className={cx(principal, "inline-flex items-center gap-2")}>
                <Icon name="sparkles" className="size-4" />
                Générer mon programme
              </button>
            </>
          )}
          {etape === 3 && !occupe && resultat && (
            <>
              <button type="button" onClick={() => setEtape(2)} className={secondaire}>
                Modifier mes disponibilités
              </button>
              <button type="button" onClick={generer} className={secondaire}>
                Recommencer
              </button>
              <button type="button" onClick={valider} className={principal}>
                Ajouter à mon emploi du temps
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
