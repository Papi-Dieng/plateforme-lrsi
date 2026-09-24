import { useEffect, useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { ajouterJours, aujourdhui, tachesPourEvaluation } from "../planning";
import { versDate } from "../emploiDuTemps";
import {
  JOURS_SEMAINE,
  creneauxLibres,
  demanderProgramme,
  disponibilitesParDefaut,
  evenementExamen,
  heuresTotales,
  repartirSansIA,
  versEvenements,
} from "../programmeIA";

/* ==================================================================
   « Créer mon programme avec l'IA », en trois étapes :
   1. l'examen : matière, intitulé, date et heure ;
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
const fmt = (jour) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(versDate(jour));
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export default function AssistantProgramme({ contexte, evenements, evaluation: existante, onValider, onFermer }) {
  const { matieres } = contexte;
  const demain = ajouterJours(aujourdhui(), 1);
  const [etape, setEtape] = useState(1);
  const [examen, setExamen] = useState(() => ({
    matiere: existante?.matiere ?? matieres[0]?.id ?? "",
    titre: existante?.titre ?? "",
    date: existante?.date ?? ajouterJours(aujourdhui(), 7),
    heure: existante?.heure ?? "08:00",
  }));
  const [dispos, setDispos] = useState(lireDispos);
  const [depuis, setDepuis] = useState(aujourdhui);
  const [resultat, setResultat] = useState(null); // { seances, resume, parIA, taches, evaluation }
  const [occupe, setOccupe] = useState(false);
  // Un identifiant fixé une fois pour toutes, pour un nouvel examen.
  const [idNouveau] = useState(() => `eval-${Date.now().toString(36)}`);

  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  const nomMatiere = matieres.find((m) => m.id === examen.matiere)?.nom ?? "";
  const evaluation = {
    id: existante?.id ?? idNouveau,
    titre: examen.titre.trim() || `Examen de ${nomMatiere}`,
    matiere: examen.matiere,
    date: examen.date,
    heure: examen.heure,
    parJour: existante?.parJour ?? 2,
  };
  const creneaux = creneauxLibres({ depuis, examen: examen.date, disponibilites: dispos, evenements });
  const nbJours = new Set(creneaux.map((c) => c.jour)).size;

  const changerDispo = (num, modif) => setDispos((d) => ({ ...d, [num]: { ...d[num], ...modif } }));

  const generer = async () => {
    try {
      localStorage.setItem(CLE_DISPOS, JSON.stringify(dispos));
    } catch {
      /* les disponibilités seront redemandées */
    }
    setOccupe(true);
    setEtape(3);
    const taches = tachesPourEvaluation(evaluation, contexte);
    let seances;
    let resume = "";
    let parIA = true;
    try {
      const r = await demanderProgramme({ matiere: nomMatiere, examen: { titre: evaluation.titre, date: evaluation.date }, creneaux, taches });
      seances = r.seances;
      resume = r.resume;
    } catch {
      parIA = false;
      seances = repartirSansIA(creneaux, taches, evaluation.date);
      resume = "L'IA n'a pas pu répondre : le site a réparti les séances lui-même, en commençant par tes points faibles et en gardant les QCM pour la veille.";
    }
    setResultat({ seances, resume, parIA, taches, evaluation });
    setOccupe(false);
  };

  const valider = () =>
    onValider({
      evaluation: resultat.evaluation,
      evenements: [...versEvenements(resultat.seances, resultat.taches, resultat.evaluation), evenementExamen(resultat.evaluation, examen.heure)],
    });

  const etapeValide1 = examen.matiere && examen.date >= demain;
  const parJour = resultat
    ? Object.entries(
        resultat.seances.reduce((acc, s) => {
          (acc[s.jour] ??= []).push(s);
          return acc;
        }, {})
      )
    : [];
  const titreSeance = (s) => s.titre || resultat.taches.find((t) => t.cle === s.tache)?.titre || "Révision";

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
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-ink-900"
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
                {etape === 1 ? "Étape 1 sur 3 : ton examen" : etape === 2 ? "Étape 2 sur 3 : tes disponibilités" : "Étape 3 sur 3 : ton programme"}
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
          {/* ---- 1. L'examen ---- */}
          {etape === 1 && (
            <div className="space-y-4">
              <label className={etiquette}>
                Matière
                <select value={examen.matiere} onChange={(e) => setExamen((x) => ({ ...x, matiere: e.target.value }))} className={champ}>
                  {matieres.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className={etiquette}>
                Intitulé (facultatif)
                <input
                  value={examen.titre}
                  maxLength={80}
                  onChange={(e) => setExamen((x) => ({ ...x, titre: e.target.value }))}
                  placeholder={`Examen de ${nomMatiere}`}
                  className={champ}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={etiquette}>
                  Date de l&apos;examen
                  <input type="date" min={demain} value={examen.date} onChange={(e) => setExamen((x) => ({ ...x, date: e.target.value }))} className={champ} />
                </label>
                <label className={etiquette}>
                  Heure
                  <input type="time" value={examen.heure} onChange={(e) => setExamen((x) => ({ ...x, heure: e.target.value }))} className={champ} />
                </label>
              </div>
              {examen.date < demain && <p className="text-xs text-flame-600">L&apos;examen doit être au plus tôt demain.</p>}
            </div>
          )}

          {/* ---- 2. Les disponibilités ---- */}
          {etape === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-ink-600 dark:text-ink-400">
                Quand peux-tu réviser ? Coche tes jours et tes heures libres : l&apos;IA place les séances dedans,
                en évitant tes cours déjà notés dans l&apos;emploi du temps.
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
                <input
                  type="date"
                  min={aujourdhui()}
                  max={ajouterJours(examen.date, -1)}
                  value={depuis}
                  onChange={(e) => setDepuis(e.target.value)}
                  className={champ}
                />
              </label>
              <p
                className={cx(
                  "rounded-xl px-4 py-3 text-sm",
                  creneaux.length ? "bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100" : "bg-flame-50 text-flame-800 dark:bg-flame-500/10 dark:text-flame-300"
                )}
              >
                {creneaux.length
                  ? `${nbJours} jour${nbJours > 1 ? "s" : ""} de révision avant l'examen, ${creneaux.length} créneau${creneaux.length > 1 ? "x" : ""}, ${heuresTotales(creneaux).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h en tout.`
                  : "Aucun créneau libre avant l'examen : coche d'autres jours, élargis tes heures ou commence plus tôt."}
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
                  {parJour.map(([jour, seances]) => (
                    <div key={jour}>
                      <h3 className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{majuscule(fmt(jour))}</h3>
                      <ul className="mt-2 space-y-2">
                        {seances.map((s, i) => (
                          <li key={i} className="flex gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                            <span className="w-24 shrink-0 text-sm font-semibold text-accent-700 dark:text-accent-400">
                              {s.debut}–{s.fin}
                            </span>
                            <span className="min-w-0 flex-1 text-sm">
                              <span className="block font-medium text-ink-900 dark:text-white">{titreSeance(s)}</span>
                              {s.conseil && <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">{s.conseil}</span>}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    Et le {fmt(evaluation.date)} à {examen.heure} : {evaluation.titre}. Bon courage !
                  </p>
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
              <button type="button" disabled={!etapeValide1} onClick={() => setEtape(2)} className={principal}>
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
