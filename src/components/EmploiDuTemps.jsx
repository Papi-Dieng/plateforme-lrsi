import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { cx } from "./ui";
import { ajouterJours, aujourdhui } from "../planning";
import {
  CATEGORIES,
  COULEURS,
  COULEUR_PAR_CATEGORIE,
  HEURE_DEBUT,
  HEURE_FIN,
  couleur,
  disposer,
  enHeure,
  enMinutes,
  evenementsDuJour,
  filtrer,
  joursDeLaSemaine,
  joursDuMois,
  nouvelEvenement,
  versDate,
} from "../emploiDuTemps";

/* ==================================================================
   Emploi du temps : vues Mois, Semaine, Jour et Liste.

   - Les événements de l'étudiant (cours, TD, révisions…) se créent en
     cliquant sur un créneau ou sur « Nouvel événement », se modifient
     en cliquant dessus, et se déplacent par glisser-déposer (ordinateur).
   - Le programme calculé par le planning (évaluations, tâches du jour,
     QCM à refaire) s'affiche en haut de chaque jour : `elementsDuJour`.

   La logique (dates, répétitions, chevauchements) est dans
   src/emploiDuTemps.js.
   ================================================================== */

const HAUTEUR_HEURE = 52; // pixels par heure dans les vues Semaine et Jour
const VUES = [
  { valeur: "mois", label: "Mois", icone: "grid" },
  { valeur: "semaine", label: "Semaine", icone: "layers" },
  { valeur: "jour", label: "Jour", icone: "clock" },
  { valeur: "liste", label: "Liste", icone: "file" },
];

const fmt = (jour, options) => new Intl.DateTimeFormat("fr-FR", options).format(versDate(jour));
const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);

const champ =
  "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";

/* ------------------------------------------------------------------ */
/* Élément du programme (lecture seule)                                */
/* ------------------------------------------------------------------ */

const STYLE_PROGRAMME = {
  evaluation: "bg-flame-500 text-white",
  tache: "bg-ink-100 text-ink-800 ring-1 ring-ink-200 ring-inset dark:bg-ink-800 dark:text-ink-100 dark:ring-ink-700",
  revision: "bg-sun-100 text-sun-900 ring-1 ring-sun-400/50 ring-inset dark:bg-sun-500/15 dark:text-sun-200",
};

function PuceProgramme({ element, onOuvrir }) {
  return (
    <button
      type="button"
      onClick={() => onOuvrir(element)}
      title={element.titre}
      className={cx(
        "block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium",
        STYLE_PROGRAMME[element.type],
        element.fait && "line-through opacity-60"
      )}
    >
      {element.type === "evaluation" ? "🎯 " : element.type === "revision" ? "↻ " : ""}
      {element.titre}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Mois                                                            */
/* ------------------------------------------------------------------ */

function VueMois({ reference, evenements, elementsDuJour, onChoisirJour, onOuvrir, onOuvrirProgramme, deplacer }) {
  const jours = joursDuMois(reference);
  const mois = versDate(reference).getMonth();
  const auj = aujourdhui();

  return (
    <div className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
      <div className="grid grid-cols-7 border-b border-ink-200 bg-ink-50 text-center text-xs font-semibold text-ink-600 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-300">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((j) => (
          <div key={j} className="py-2">
            <span className="hidden sm:inline">{j}</span>
            <span className="sm:hidden">{j[0]}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {jours.map((jour) => {
          const evts = evenementsDuJour(evenements, jour);
          const programme = elementsDuJour(jour);
          const tout = [...programme.map((p) => ({ p })), ...evts.map((e) => ({ e }))];
          return (
            <div
              key={jour}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => deplacer(e, jour)}
              className={cx(
                "min-h-20 border-r border-b border-ink-200 p-1 sm:min-h-28 sm:p-1.5 dark:border-ink-800 [&:nth-child(7n)]:border-r-0",
                versDate(jour).getMonth() !== mois && "bg-ink-50/60 dark:bg-ink-950/60"
              )}
            >
              <button
                type="button"
                onClick={() => onChoisirJour(jour)}
                className={cx(
                  "mb-1 grid size-6 place-items-center rounded-full text-xs hover:bg-ink-100 dark:hover:bg-ink-800",
                  jour === auj ? "bg-brand-600 font-semibold text-white hover:bg-brand-700" : "text-ink-700 dark:text-ink-300"
                )}
                aria-label={`Voir le ${fmt(jour, { weekday: "long", day: "numeric", month: "long" })}`}
              >
                {versDate(jour).getDate()}
              </button>
              <div className="space-y-0.5">
                {tout.slice(0, 3).map((x, i) =>
                  x.p ? (
                    <PuceProgramme key={`p${i}`} element={x.p} onOuvrir={onOuvrirProgramme} />
                  ) : (
                    <button
                      key={`e${x.e.id}`}
                      type="button"
                      draggable
                      onDragStart={(ev) => ev.dataTransfer.setData("text/plain", x.e.id)}
                      onClick={() => onOuvrir(x.e)}
                      title={`${x.e.debut}–${x.e.fin} · ${x.e.titre}`}
                      className={cx("block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white", couleur(x.e.couleur).fond)}
                    >
                      <span className="hidden sm:inline">{x.e.debut} </span>
                      {x.e.titre || "Sans titre"}
                    </button>
                  )
                )}
                {tout.length > 3 && (
                  <button type="button" onClick={() => onChoisirJour(jour)} className="text-[11px] text-ink-500 hover:underline">
                    +{tout.length - 3} de plus
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vues Semaine et Jour : la grille horaire                            */
/* ------------------------------------------------------------------ */

function GrilleHoraire({ jours, evenements, elementsDuJour, onCreer, onOuvrir, onOuvrirProgramme, deplacer }) {
  const heures = Array.from({ length: HEURE_FIN - HEURE_DEBUT }, (_, i) => HEURE_DEBUT + i);
  const auj = aujourdhui();
  const [maintenant, setMaintenant] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const minutesMaintenant = maintenant.getHours() * 60 + maintenant.getMinutes();

  // Le créneau visé par un clic ou un dépôt, arrondi au quart d'heure.
  const heureVisee = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = HEURE_DEBUT * 60 + ((e.clientY - rect.top) / HAUTEUR_HEURE) * 60;
    return enHeure(Math.floor(minutes / 15) * 15);
  };

  const colonnes = jours.length === 1 ? "grid-cols-[3.5rem_1fr]" : "grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]";

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-200 dark:border-ink-800">
      <div className={cx(jours.length > 1 && "min-w-[44rem]")}>
        {/* En-têtes des jours */}
        <div className={cx("grid border-b border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-950", colonnes)}>
          <div />
          {jours.map((jour) => (
            <div key={jour} className="border-l border-ink-200 px-1 py-2 text-center dark:border-ink-800">
              <p className="text-xs text-ink-500 dark:text-ink-400">{majuscule(fmt(jour, { weekday: "short" }))}</p>
              <p
                className={cx(
                  "mx-auto mt-0.5 grid size-7 place-items-center rounded-full text-sm font-semibold",
                  jour === auj ? "bg-brand-600 text-white" : "text-ink-900 dark:text-white"
                )}
              >
                {versDate(jour).getDate()}
              </p>
            </div>
          ))}
        </div>

        {/* Le programme du jour (sans heure) */}
        {jours.some((j) => elementsDuJour(j).length) && (
          <div className={cx("grid border-b border-ink-200 dark:border-ink-800", colonnes)}>
            <div className="px-1 py-1.5 text-right text-[10px] leading-tight text-ink-400">Au pro&shy;gramme</div>
            {jours.map((jour) => (
              <div key={jour} className="space-y-0.5 border-l border-ink-200 p-1 dark:border-ink-800">
                {elementsDuJour(jour).map((p) => (
                  <PuceProgramme key={p.cle} element={p} onOuvrir={onOuvrirProgramme} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Les heures */}
        <div className={cx("grid max-h-[70vh] overflow-y-auto", colonnes)}>
          <div className="relative" style={{ height: heures.length * HAUTEUR_HEURE }}>
            {heures.map((h, i) => (
              <span key={h} className="absolute right-1.5 -translate-y-1/2 text-[11px] text-ink-400" style={{ top: i * HAUTEUR_HEURE }}>
                {i === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>
          {jours.map((jour) => (
            <div
              key={jour}
              role="presentation"
              onClick={(e) => e.target === e.currentTarget && onCreer(jour, heureVisee(e))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => deplacer(e, jour, heureVisee(e))}
              className={cx(
                "relative cursor-copy border-l border-ink-200 dark:border-ink-800",
                jour === auj && "bg-brand-50/30 dark:bg-brand-500/5"
              )}
              style={{
                height: heures.length * HAUTEUR_HEURE,
                backgroundImage: "linear-gradient(to bottom, rgb(128 128 140 / 0.18) 1px, transparent 1px)",
                backgroundSize: `100% ${HAUTEUR_HEURE}px`,
              }}
            >
              {jour === auj && minutesMaintenant >= HEURE_DEBUT * 60 && minutesMaintenant <= HEURE_FIN * 60 && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-flame-500"
                  style={{ top: ((minutesMaintenant - HEURE_DEBUT * 60) / 60) * HAUTEUR_HEURE }}
                >
                  <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-flame-500" />
                </div>
              )}
              {disposer(evenementsDuJour(evenements, jour)).map((e) => {
                const debut = Math.max(enMinutes(e.debut), HEURE_DEBUT * 60);
                const fin = Math.min(Math.max(enMinutes(e.fin), debut + 15), HEURE_FIN * 60);
                if (fin <= HEURE_DEBUT * 60 || debut >= HEURE_FIN * 60) return null;
                const largeur = 100 / e.colonnes;
                return (
                  <button
                    key={e.id}
                    type="button"
                    draggable
                    onDragStart={(ev) => ev.dataTransfer.setData("text/plain", e.id)}
                    onClick={() => onOuvrir(e)}
                    title={`${e.debut}–${e.fin} · ${e.titre}${e.description ? `\n${e.description}` : ""}`}
                    className={cx(
                      "absolute overflow-hidden rounded-lg px-1.5 py-1 text-left text-white shadow-sm transition-[transform,box-shadow] hover:z-20 hover:scale-[1.02] hover:shadow-lg",
                      couleur(e.couleur).fond
                    )}
                    style={{
                      top: ((debut - HEURE_DEBUT * 60) / 60) * HAUTEUR_HEURE + 1,
                      height: ((fin - debut) / 60) * HAUTEUR_HEURE - 2,
                      left: `calc(${e.colonne * largeur}% + 2px)`,
                      width: `calc(${largeur}% - 4px)`,
                    }}
                  >
                    <span className="block truncate text-xs font-semibold">{e.titre || "Sans titre"}</span>
                    <span className="block truncate text-[10px] opacity-90">
                      {e.debut}–{e.fin}
                      {e.hebdo ? " · ↻" : ""}
                      {e.genere ? " · ✦" : ""}
                    </span>
                    {jours.length === 1 && e.description && <span className="mt-0.5 block truncate text-[11px] opacity-90">{e.description}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vue Liste : les 30 prochains jours                                  */
/* ------------------------------------------------------------------ */

function VueListe({ depuis, evenements, elementsDuJour, onOuvrir, onOuvrirProgramme }) {
  const jours = Array.from({ length: 30 }, (_, i) => ajouterJours(depuis, i))
    .map((jour) => ({ jour, evts: evenementsDuJour(evenements, jour), programme: elementsDuJour(jour) }))
    .filter((j) => j.evts.length || j.programme.length);

  if (jours.length === 0) {
    return (
      <p className="rounded-2xl border border-ink-200 py-12 text-center text-sm text-ink-500 dark:border-ink-800">
        Rien de prévu dans les 30 prochains jours.
      </p>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-ink-200 p-4 dark:border-ink-800">
      {jours.map(({ jour, evts, programme }) => (
        <div key={jour}>
          <h3 className="text-xs font-semibold tracking-wide text-ink-500 uppercase dark:text-ink-400">
            {jour === aujourdhui() ? "Aujourd'hui" : majuscule(fmt(jour, { weekday: "long", day: "numeric", month: "long" }))}
          </h3>
          <ul className="mt-2 space-y-2">
            {programme.map((p) => (
              <li key={p.cle}>
                <PuceProgramme element={p} onOuvrir={onOuvrirProgramme} />
              </li>
            ))}
            {evts.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => onOuvrir(e)}
                  className="flex w-full items-start gap-3 rounded-xl border border-ink-200 p-3 text-left transition-shadow hover:shadow-md dark:border-ink-800"
                >
                  <span className={cx("mt-1 size-3 shrink-0 rounded-full", couleur(e.couleur).pastille)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900 dark:text-white">{e.titre || "Sans titre"}</span>
                    {e.description && <span className="mt-0.5 block text-sm text-ink-600 dark:text-ink-400">{e.description}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <Icon name="clock" className="size-3.5" />
                      {e.debut}–{e.fin}
                      <span className={cx("rounded px-1.5 py-0.5", couleur(e.couleur).clair)}>{e.categorie}</span>
                      {e.hebdo && <span>↻ chaque semaine</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fenêtres                                                            */
/* ------------------------------------------------------------------ */

function Fenetre({ titre, onFermer, children }) {
  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-xl sm:p-6 dark:bg-ink-900"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <Icon name="close" className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FenetreEvenement({ evenement, nouveau, matieres, onEnregistrer, onSupprimer, onFermer }) {
  const [e, setE] = useState(evenement);
  const changer = (modif) => setE((x) => ({ ...x, ...modif }));
  const valide = e.titre.trim() && e.fin > e.debut && (!e.hebdo || e.jusqua >= e.jour);
  const etiquette = "block text-xs font-semibold text-ink-600 dark:text-ink-300";

  return (
    <Fenetre titre={nouveau ? "Nouvel événement" : "Modifier l'événement"} onFermer={onFermer}>
      {(e.genere || e.lien) && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-accent-50 px-3 py-2.5 text-sm text-accent-800 dark:bg-accent-500/10 dark:text-accent-200">
          {e.genere && <span>✦ Séance de ton programme de révision.</span>}
          {e.lien && (
            <Link to={e.lien} className="font-semibold underline">
              Ouvrir le contenu
            </Link>
          )}
        </div>
      )}
      <form
        className="mt-4 space-y-4"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (valide) onEnregistrer({ ...e, titre: e.titre.trim(), description: e.description.trim() });
        }}
      >
        <label className={etiquette}>
          Titre
          <input autoFocus value={e.titre} maxLength={80} onChange={(ev) => changer({ titre: ev.target.value })} placeholder="Cours de réseaux, TD d'algo…" className={champ} />
        </label>
        <label className={etiquette}>
          Description (salle, enseignant…)
          <textarea rows={2} value={e.description} maxLength={300} onChange={(ev) => changer({ description: ev.target.value })} className={champ} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className={cx(etiquette, "col-span-3 sm:col-span-1")}>
            Jour
            <input type="date" required value={e.jour} onChange={(ev) => changer({ jour: ev.target.value })} className={champ} />
          </label>
          <label className={etiquette}>
            Début
            <input type="time" required value={e.debut} onChange={(ev) => changer({ debut: ev.target.value })} className={champ} />
          </label>
          <label className={etiquette}>
            Fin
            <input type="time" required value={e.fin} onChange={(ev) => changer({ fin: ev.target.value })} className={champ} />
          </label>
        </div>
        {e.fin <= e.debut && <p className="text-xs text-flame-600">L&apos;heure de fin doit être après le début.</p>}
        <div className="grid grid-cols-2 gap-3">
          <label className={etiquette}>
            Catégorie
            <select
              value={e.categorie}
              onChange={(ev) => changer({ categorie: ev.target.value, couleur: COULEUR_PAR_CATEGORIE[ev.target.value] ?? e.couleur })}
              className={champ}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className={etiquette}>
            Matière
            <select value={e.matiere} onChange={(ev) => changer({ matiere: ev.target.value })} className={champ}>
              <option value="">Aucune</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nomCourt}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <p className={etiquette}>Couleur</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {COULEURS.map((c) => (
              <button
                key={c.valeur}
                type="button"
                onClick={() => changer({ couleur: c.valeur })}
                aria-label={c.nom}
                aria-pressed={e.couleur === c.valeur}
                className={cx("size-7 rounded-full ring-offset-2 dark:ring-offset-ink-900", c.pastille, e.couleur === c.valeur && "ring-2 ring-ink-900 dark:ring-white")}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-ink-50 p-3 dark:bg-ink-950">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-800 dark:text-ink-200">
            <input type="checkbox" checked={e.hebdo} onChange={(ev) => changer({ hebdo: ev.target.checked })} className="size-4 accent-brand-600" />
            Répéter chaque semaine
          </label>
          {e.hebdo && (
            <label className={cx(etiquette, "mt-3")}>
              Jusqu&apos;au
              <input type="date" value={e.jusqua} min={e.jour} onChange={(ev) => changer({ jusqua: ev.target.value })} className={champ} />
            </label>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {!nouveau && (
            <button
              type="button"
              onClick={() => onSupprimer(e.id)}
              className="mr-auto rounded-xl px-3.5 py-2 text-sm font-semibold text-flame-600 hover:bg-flame-50 dark:text-flame-400 dark:hover:bg-flame-500/10"
            >
              Supprimer{e.hebdo ? " (toutes les semaines)" : ""}
            </button>
          )}
          <button type="button" onClick={onFermer} className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
            Annuler
          </button>
          <button type="submit" disabled={!valide} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {nouveau ? "Créer" : "Enregistrer"}
          </button>
        </div>
      </form>
    </Fenetre>
  );
}

function FenetreProgramme({ element, onFermer }) {
  return (
    <Fenetre titre={element.titre} onFermer={onFermer}>
      <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{element.detail}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {element.onBasculer && (
          <button
            type="button"
            onClick={() => {
              element.onBasculer();
              onFermer();
            }}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800"
          >
            {element.fait ? "Marquer comme à faire" : "✓ Marquer comme fait"}
          </button>
        )}
        {element.to && (
          <Link to={element.to} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Ouvrir
          </Link>
        )}
      </div>
    </Fenetre>
  );
}

/* ------------------------------------------------------------------ */
/* L'emploi du temps                                                   */
/* ------------------------------------------------------------------ */

export default function EmploiDuTemps({ evenements, onChange, elementsDuJour, matieres }) {
  const [vue, setVue] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? "jour" : "semaine"));
  const [reference, setReference] = useState(aujourdhui);
  const [edition, setEdition] = useState(null); // { evenement, nouveau }
  const [programmeOuvert, setProgrammeOuvert] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [categories, setCategories] = useState([]);
  const [matieresFiltre, setMatieresFiltre] = useState([]);

  const visibles = useMemo(
    () => filtrer(evenements, { recherche, categories, matieres: matieresFiltre }),
    [evenements, recherche, categories, matieresFiltre]
  );
  const filtresActifs = recherche || categories.length || matieresFiltre.length;

  const naviguer = (sens) => {
    if (vue === "mois") {
      const d = versDate(reference);
      const cible = new Date(d.getFullYear(), d.getMonth() + sens, 1);
      setReference(`${cible.getFullYear()}-${String(cible.getMonth() + 1).padStart(2, "0")}-01`);
    } else setReference(ajouterJours(reference, sens * (vue === "semaine" ? 7 : vue === "jour" ? 1 : 30)));
  };

  const titre =
    vue === "mois"
      ? majuscule(fmt(reference, { month: "long", year: "numeric" }))
      : vue === "semaine"
        ? (() => {
            const s = joursDeLaSemaine(reference);
            return `Semaine du ${fmt(s[0], { day: "numeric", month: "short" })} au ${fmt(s[6], { day: "numeric", month: "short" })}`;
          })()
        : vue === "jour"
          ? majuscule(fmt(reference, { weekday: "long", day: "numeric", month: "long" }))
          : "Les 30 prochains jours";

  const enregistrer = (e) => {
    const existe = evenements.some((x) => x.id === e.id);
    onChange(existe ? evenements.map((x) => (x.id === e.id ? e : x)) : [...evenements, e]);
    setEdition(null);
  };
  const supprimer = (id) => {
    onChange(evenements.filter((x) => x.id !== id));
    setEdition(null);
  };

  /* Glisser-déposer : garde la durée ; pour une répétition, déplace
     toute la série (même jour de semaine, même heure). */
  const deplacer = (ev, jour, heure) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    const e = evenements.find((x) => x.id === id);
    if (!e) return;
    const duree = enMinutes(e.fin) - enMinutes(e.debut);
    const debut = heure ?? e.debut;
    enregistrer({ ...e, jour, debut, fin: enHeure(Math.min(enMinutes(debut) + duree, 23 * 60 + 59)) });
  };

  const ouvrir = (occurrence) => {
    const e = evenements.find((x) => x.id === occurrence.id);
    if (e) setEdition({ evenement: e, nouveau: false });
  };
  const creer = (jour, debut) => setEdition({ evenement: nouvelEvenement(jour, debut), nouveau: true });

  const basculer = (liste, setListe, valeur) =>
    setListe(liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur]);

  const puce = (actif) =>
    cx(
      "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
      actif
        ? "bg-brand-600 text-white"
        : "text-ink-600 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
    );

  const communs = {
    evenements: visibles,
    elementsDuJour,
    onOuvrir: ouvrir,
    onOuvrirProgramme: setProgrammeOuvert,
    deplacer,
  };

  return (
    <div className="space-y-4">
      {/* ---- En-tête ---- */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-ink-900 sm:text-2xl dark:text-white">{titre}</h2>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => naviguer(-1)} aria-label="Précédent" className="grid size-8 place-items-center rounded-lg ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:ring-ink-700 dark:hover:bg-ink-800">
              <Icon name="chevron" className="size-4 rotate-90" />
            </button>
            <button type="button" onClick={() => setReference(aujourdhui())} className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:text-ink-200 dark:ring-ink-700 dark:hover:bg-ink-800">
              Aujourd&apos;hui
            </button>
            <button type="button" onClick={() => naviguer(1)} aria-label="Suivant" className="grid size-8 place-items-center rounded-lg ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:ring-ink-700 dark:hover:bg-ink-800">
              <Icon name="chevron" className="size-4 -rotate-90" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div role="tablist" aria-label="Vue" className="flex items-center gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
            {VUES.map((v) => (
              <button
                key={v.valeur}
                type="button"
                role="tab"
                aria-selected={vue === v.valeur}
                onClick={() => setVue(v.valeur)}
                className={cx(
                  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  vue === v.valeur ? "bg-white text-ink-900 shadow-sm dark:bg-ink-950 dark:text-white" : "text-ink-600 hover:text-ink-900 dark:text-ink-300"
                )}
              >
                <Icon name={v.icone} className="size-4" />
                {v.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => creer(vue === "jour" ? reference : aujourdhui(), "08:00")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold whitespace-nowrap text-white hover:bg-brand-700"
          >
            <Icon name="plus" className="size-4" />
            Nouvel événement
          </button>
        </div>
      </div>

      {/* ---- Recherche et filtres ---- */}
      <div className="space-y-2">
        <div className="relative">
          <Icon name="search" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un cours, une salle…"
            aria-label="Rechercher dans l'emploi du temps"
            className={cx(champ, "mt-0 pl-9")}
          />
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => basculer(categories, setCategories, c)} aria-pressed={categories.includes(c)} className={puce(categories.includes(c))}>
              {c}
            </button>
          ))}
          <span className="mx-1 w-px shrink-0 bg-ink-200 dark:bg-ink-700" />
          {matieres.map((m) => (
            <button key={m.id} type="button" onClick={() => basculer(matieresFiltre, setMatieresFiltre, m.id)} aria-pressed={matieresFiltre.includes(m.id)} className={puce(matieresFiltre.includes(m.id))}>
              {m.nomCourt}
            </button>
          ))}
          {filtresActifs ? (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                setCategories([]);
                setMatieresFiltre([]);
              }}
              className="shrink-0 px-2 text-xs font-medium text-ink-500 hover:underline"
            >
              Effacer les filtres
            </button>
          ) : null}
        </div>
      </div>

      {/* ---- La vue ---- */}
      {vue === "mois" && (
        <VueMois
          reference={reference}
          {...communs}
          onChoisirJour={(jour) => {
            setReference(jour);
            setVue("jour");
          }}
        />
      )}
      {vue === "semaine" && <GrilleHoraire jours={joursDeLaSemaine(reference)} {...communs} onCreer={creer} />}
      {vue === "jour" && <GrilleHoraire jours={[reference]} {...communs} onCreer={creer} />}
      {vue === "liste" && <VueListe depuis={reference} {...communs} />}

      <p className="text-xs text-ink-400">
        Clique sur un créneau vide pour y ajouter un cours ; sur ordinateur, fais glisser un événement pour le déplacer.
        En haut de chaque jour : ton programme de révision (🎯 évaluation, ↻ QCM à refaire).
      </p>

      {edition && (
        <FenetreEvenement
          key={edition.evenement.id}
          evenement={edition.evenement}
          nouveau={edition.nouveau}
          matieres={matieres}
          onEnregistrer={enregistrer}
          onSupprimer={supprimer}
          onFermer={() => setEdition(null)}
        />
      )}
      {programmeOuvert && <FenetreProgramme element={programmeOuvert} onFermer={() => setProgrammeOuvert(null)} />}
    </div>
  );
}
