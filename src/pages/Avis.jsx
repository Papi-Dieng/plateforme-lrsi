import { useCallback, useEffect, useId, useState } from "react";
import Icon from "../components/Icon";
import { Bouton, Filtres } from "../components/ui";
import { cx } from "../components/classes";
import { comptesActifs } from "../data/comptes";
import { site } from "../data/site";
import {
  LIMITES,
  NIVEAUX,
  NOTES,
  afficherMoyenne,
  dateAvis,
  envoyerAvis,
  listerAvis,
  preparerAvis,
  resumerAvis,
} from "../avis";

/* ==================================================================
   Ton avis (#/avis) : le « forum » de la plateforme.

   Demandé le 14 octobre 2026, pour le lien partagé sur WhatsApp : tout
   visiteur, sans compte, note le site, dit ce qui lui plaît et propose
   ce qui manque. Les avis sont publics : la moyenne, la répartition des
   notes et la liste des avis (ou des seules propositions) s'affichent
   pour tout le monde. La logique (nettoyage, moyenne, dates) vit dans
   src/avis.js ; les droits, dans supabase/schema.sql (table `avis`).
   ================================================================== */

const MONO = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";
const GRIS = "text-ink-600 dark:text-ink-300";
const CHAMP =
  "w-full rounded-[14px] border border-ink-200 bg-white px-4 py-3 text-ink-950 placeholder:text-ink-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:placeholder:text-ink-400";

function Etoile({ pleine, className = "size-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill={pleine ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M12 3.2l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.73l-5.3 2.78 1.01-5.9-4.29-4.18 5.93-.86z" />
    </svg>
  );
}

function Etoiles({ note, className = "size-4" }) {
  return (
    <span className="inline-flex text-sun-500" role="img" aria-label={`${note} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Etoile key={n} pleine={n <= note} className={className} />
      ))}
    </span>
  );
}

/* ---- La moyenne et la répartition des notes ---- */
function Resume({ resume, pret }) {
  const max = Math.max(1, ...resume.repartition.map((r) => r.nombre));
  return (
    <div className="rounded-[26px] border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-700 dark:bg-ink-950">
      <div className="flex items-end gap-4">
        <p className="text-6xl leading-none font-extrabold tracking-[-0.06em]">{pret && resume.nombre ? afficherMoyenne(resume.moyenne) : "–"}</p>
        <div className="pb-1">
          <Etoiles note={Math.round(resume.moyenne)} className="size-5" />
          <p className={cx("mt-1 text-sm", GRIS)}>
            {!pret
              ? "Chargement des avis…"
              : resume.nombre
                ? `sur ${resume.nombre} avis · ${resume.propositions} proposition${resume.propositions > 1 ? "s" : ""}`
                : "Pas encore d'avis. Le tien sera le premier."}
          </p>
        </div>
      </div>
      <ul className="mt-5 space-y-2" aria-label="Répartition des notes">
        {resume.repartition.map((r) => (
          <li key={r.note} className="flex items-center gap-3 text-sm">
            <span className="flex w-8 shrink-0 items-center gap-1 font-bold">
              {r.note}
              <Etoile pleine className="size-3.5 text-sun-500" />
            </span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" aria-hidden="true">
              <span className="block h-full rounded-full bg-sun-500 transition-[width] duration-500" style={{ width: `${(r.nombre / max) * 100}%` }} />
            </span>
            <span className={cx("w-7 shrink-0 text-right font-mono text-xs", GRIS)}>
              {r.nombre}
              <span className="sr-only"> avis à {r.note} étoile{r.note > 1 ? "s" : ""}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- Le formulaire ---- */
function Formulaire({ onPublie }) {
  const id = useId();
  const [note, setNote] = useState(0);
  const [aime, setAime] = useState("");
  const [propose, setPropose] = useState("");
  const [prenom, setPrenom] = useState("");
  const [niveau, setNiveau] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [publie, setPublie] = useState(false);

  const recommencer = () => {
    setNote(0);
    setAime("");
    setPropose("");
    setErreur("");
    setPublie(false);
  };

  const publier = async (e) => {
    e.preventDefault();
    const { avis, erreur: probleme } = preparerAvis({ note, aime, propose, prenom, niveau });
    if (probleme) {
      setErreur(probleme);
      return;
    }
    setEnvoi(true);
    setErreur("");
    try {
      await envoyerAvis(avis);
      setPublie(true);
      onPublie();
    } catch (err) {
      setErreur(
        err?.message === "trop-d-avis"
          ? "Beaucoup d'avis arrivent en même temps. Réessaie dans une minute : ce que tu as écrit est gardé."
          : "Ton avis n'a pas pu partir. Vérifie ta connexion, puis réessaie : ce que tu as écrit est gardé."
      );
    } finally {
      setEnvoi(false);
    }
  };

  if (!comptesActifs) {
    return (
      <div className="rounded-[26px] border border-dashed border-ink-300 bg-ink-50 p-6 dark:border-ink-700 dark:bg-ink-900">
        <h2 className="text-xl font-extrabold tracking-[-0.03em]">Les avis ne sont pas encore ouverts</h2>
        <p className={cx("mt-2 text-sm", GRIS)}>En attendant, écris-nous à {site.contact}.</p>
      </div>
    );
  }

  if (publie) {
    return (
      <div className="rounded-[26px] bg-lime-400 p-6 text-ink-950" role="status">
        <span className="grid size-11 place-items-center rounded-full bg-ink-950 text-lime-400">
          <Icon name="check" className="size-5" />
        </span>
        <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.03em]">Merci, ton avis est publié</h2>
        <p className="mt-2 text-ink-900">Il apparaît dans la liste, et l'équipe le lira pour choisir la suite du site.</p>
        <button type="button" onClick={recommencer} className="mt-5 min-h-11 rounded-[14px] bg-ink-950 px-4 font-bold text-white hover:bg-ink-800">
          Donner un autre avis
        </button>
      </div>
    );
  }

  const libelle = NOTES.find((n) => n.valeur === note)?.libelle;
  return (
    <form onSubmit={publier} noValidate className="rounded-[26px] border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-700 dark:bg-ink-900">
      <h2 className="text-2xl font-extrabold tracking-[-0.03em]">Donner mon avis</h2>
      <p className={cx("mt-1 text-sm", GRIS)}>Deux minutes, sans compte.</p>

      <fieldset className="mt-6">
        <legend className="font-bold">Ta note</legend>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <div className="flex text-sun-500">
            {NOTES.map((n) => (
              <label key={n.valeur} className="cursor-pointer">
                <input
                  type="radio"
                  name={`${id}-note`}
                  value={n.valeur}
                  checked={note === n.valeur}
                  onChange={() => setNote(n.valeur)}
                  className="peer sr-only"
                />
                <span className="grid size-11 place-items-center rounded-xl transition-transform peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500 hover:scale-110">
                  <Etoile pleine={note >= n.valeur} className="size-8" />
                </span>
                <span className="sr-only">
                  {n.valeur} sur 5, {n.libelle}
                </span>
              </label>
            ))}
          </div>
          <p className={cx("text-sm font-bold", note ? "" : GRIS)} aria-live="polite">
            {note ? `${note}/5 · ${libelle}` : "Touche une étoile"}
          </p>
        </div>
      </fieldset>

      <div className="mt-5">
        <label htmlFor={`${id}-aime`} className="font-bold">
          Ce qui te plaît
        </label>
        <textarea
          id={`${id}-aime`}
          value={aime}
          onChange={(e) => setAime(e.target.value)}
          maxLength={LIMITES.aime}
          rows={3}
          placeholder="Les corrigés, les QCM, l'assistant…"
          className={cx(CHAMP, "mt-2 resize-y")}
        />
        <p className={cx("mt-1 text-right font-mono text-xs", GRIS)}>
          {aime.length}/{LIMITES.aime}
        </p>
      </div>

      <div className="mt-2">
        <label htmlFor={`${id}-propose`} className="font-bold">
          Ce que tu proposes pour le site
        </label>
        <textarea
          id={`${id}-propose`}
          value={propose}
          onChange={(e) => setPropose(e.target.value)}
          maxLength={LIMITES.propose}
          rows={3}
          placeholder="Une matière, une fonction, un détail à corriger…"
          className={cx(CHAMP, "mt-2 resize-y")}
        />
        <p className={cx("mt-1 text-right font-mono text-xs", GRIS)}>
          {propose.length}/{LIMITES.propose}
        </p>
      </div>

      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-prenom`} className="font-bold">
            Prénom <span className={cx("font-normal", GRIS)}>(facultatif)</span>
          </label>
          <input
            id={`${id}-prenom`}
            type="text"
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={LIMITES.prenom}
            autoComplete="given-name"
            className={cx(CHAMP, "mt-2 min-h-11")}
          />
        </div>
        <div>
          <label htmlFor={`${id}-niveau`} className="font-bold">
            Niveau <span className={cx("font-normal", GRIS)}>(facultatif)</span>
          </label>
          <select id={`${id}-niveau`} value={niveau} onChange={(e) => setNiveau(e.target.value)} className={cx(CHAMP, "mt-2 min-h-11")}>
            <option value="">Non précisé</option>
            {NIVEAUX.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={cx("mt-5 flex gap-2 text-sm", GRIS)}>
        <Icon name="info" className="mt-0.5 size-4 shrink-0" />
        Ton avis est public. N'y mets ni numéro de téléphone, ni adresse, ni rien de personnel.
      </p>

      {erreur && (
        <p role="alert" className="mt-4 rounded-[14px] bg-flame-100 px-4 py-3 text-sm font-medium text-flame-900 dark:bg-flame-500/15 dark:text-flame-300">
          {erreur}
        </p>
      )}

      <Bouton type="submit" taille="lg" disabled={envoi} className="mt-5 w-full">
        <Icon name="sparkles" className="size-5" />
        {envoi ? "Publication…" : "Publier mon avis"}
      </Bouton>
    </form>
  );
}

/* ---- Un avis ---- */
function CarteAvis({ avis }) {
  const nom = avis.prenom?.trim() || "Anonyme";
  return (
    <li className="rounded-[22px] border border-ink-200 bg-white p-5 dark:border-ink-700 dark:bg-ink-900">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 font-bold text-white" aria-hidden="true">
          {nom === "Anonyme" ? "?" : nom[0].toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {nom}
            {avis.niveau && <span className="ml-2 rounded-md bg-ink-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-bold text-ink-700 dark:bg-ink-800 dark:text-ink-200">{avis.niveau}</span>}
          </p>
          <p className={cx("text-xs", GRIS)}>{dateAvis(avis.cree_le)}</p>
        </div>
        <Etoiles note={avis.note} />
      </div>
      {avis.aime && <p className="mt-4 break-words whitespace-pre-line text-ink-800 dark:text-ink-100">{avis.aime}</p>}
      {avis.propose && (
        <div className="mt-4 rounded-[16px] bg-lime-100 p-4 text-ink-950 dark:bg-lime-400/15 dark:text-white">
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase">
            <Icon name="bulb" className="size-4" />
            Proposition
          </p>
          <p className="mt-1.5 break-words whitespace-pre-line">{avis.propose}</p>
        </div>
      )}
    </li>
  );
}

export default function Avis() {
  // Sans projet Supabase configuré, il n'y a rien à charger.
  const [etat, setEtat] = useState({ pret: !comptesActifs, liste: [], erreur: false });
  const [filtre, setFiltre] = useState("tous");

  // Relire la liste : après une publication, ou sur « Réessayer ».
  const [lecture, setLecture] = useState(0);
  const charger = useCallback(() => setLecture((n) => n + 1), []);

  useEffect(() => {
    if (!comptesActifs) return;
    let actif = true;
    listerAvis()
      .then((liste) => actif && setEtat({ pret: true, liste, erreur: false }))
      .catch(() => actif && setEtat((e) => ({ ...e, pret: true, erreur: true })));
    return () => {
      actif = false;
    };
  }, [lecture]);

  const resume = resumerAvis(etat.liste);
  const affiches = filtre === "propositions" ? etat.liste.filter((a) => a.propose?.trim()) : etat.liste;

  return (
    <div className="min-h-full bg-white text-ink-950 dark:bg-ink-950 dark:text-white">
      <section className="bg-ink-50 px-4 pt-14 pb-12 dark:bg-ink-900">
        <div className="mx-auto grid max-w-6xl gap-10 sm:px-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p className={cx(MONO, GRIS)}>Ton avis compte</p>
            <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.05em] text-balance sm:text-6xl">Dis-nous ce que tu penses de {site.nom}</h1>
            <p className={cx("mt-4 max-w-xl", GRIS)}>
              Note le site, dis ce qui te plaît et propose ce qui manque. Les avis sont publics : toute la promo peut les lire, et l'équipe s'en sert pour choisir la suite.
            </p>
          </div>
          <Resume resume={resume} pret={etat.pret} />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:items-start">
        <Formulaire onPublie={charger} />

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Ce qu'en disent les étudiants</h2>
            <Filtres
              label="Avis à afficher"
              actif={filtre}
              onChange={setFiltre}
              options={[
                { value: "tous", label: `Tous les avis (${resume.nombre})` },
                { value: "propositions", label: `Propositions (${resume.propositions})` },
              ]}
            />
          </div>

          {!etat.pret && <p className={cx("mt-6", GRIS)}>Chargement des avis…</p>}

          {etat.pret && etat.erreur && (
            <div className="mt-6 rounded-[22px] border border-dashed border-ink-300 p-6 dark:border-ink-700">
              <p className="font-bold">Les avis n'ont pas pu être chargés</p>
              <p className={cx("mt-1 text-sm", GRIS)}>Vérifie ta connexion, puis réessaie.</p>
              <Bouton variante="secondaire" className="mt-4" onClick={charger}>
                <Icon name="repeter" className="size-4" />
                Réessayer
              </Bouton>
            </div>
          )}

          {etat.pret && !etat.erreur && affiches.length === 0 && (
            <div className="mt-6 rounded-[22px] border border-dashed border-ink-300 p-6 dark:border-ink-700">
              <p className="font-bold">{filtre === "propositions" ? "Pas encore de proposition" : "Pas encore d'avis"}</p>
              <p className={cx("mt-1 text-sm", GRIS)}>Le formulaire est juste à côté : le tien sera le premier.</p>
            </div>
          )}

          {affiches.length > 0 && (
            <ul className="mt-6 space-y-4">
              {affiches.map((a) => (
                <CarteAvis key={a.id} avis={a} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
