import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { initiales } from "../session";

/* ==================================================================
   Carrousel de l'équipe (page Projet).

   Inspiré de l'apparence du « Team Carousel » de lightswind, réécrit
   pour le site sans en reprendre le code ni ajouter de bibliothèque :
   la carte du membre affiché au centre, ses voisins en retrait de part
   et d'autre, son nom et son rôle dessous.

   `membres` : [{ id, nom, role, photo?, bio? }]. Sans photo, la carte
   affiche les initiales. `defilement` : délai en millisecondes entre
   deux membres (0 pour ne pas défiler). `surChangement(membre, index)`
   est appelé quand le membre affiché change.

   Accessibilité : le défilement s'arrête au survol, quand le carrousel
   a le focus, et d'emblée si le système demande moins d'animations ;
   un bouton le met en pause (règle WCAG 2.2.2). Les flèches du clavier
   passent d'un membre à l'autre.
   ================================================================== */

const moinsDAnimations = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Position d'une carte par rapport à la carte active, entre -n/2 et n/2.
function ecart(index, actif, total) {
  let d = (index - actif + total) % total;
  if (d > total / 2) d -= total;
  return d;
}

function Portrait({ membre }) {
  // Photo introuvable (version hors ligne, fichier absent) : les initiales.
  const [echec, setEchec] = useState(false);
  if (membre.photo && !echec) {
    return (
      <img
        src={membre.photo}
        alt=""
        className="size-full object-cover"
        loading="lazy"
        draggable="false"
        onError={() => setEchec(true)}
      />
    );
  }
  return (
    <span className="grid size-full place-items-center bg-gradient-to-br from-brand-500 to-brand-800 text-5xl font-bold tracking-tight text-white sm:text-6xl">
      {initiales(membre.nom)}
    </span>
  );
}

export default function CarrouselEquipe({ membres, defilement = 3000, surChangement }) {
  const total = membres.length;
  const [actif, setActif] = useState(0);
  const [enPause, setEnPause] = useState(moinsDAnimations);
  const [suspendu, setSuspendu] = useState(false); // survol ou focus
  const depart = useRef(null);

  const aller = (index) => {
    const suivant = (index + total) % total;
    setActif(suivant);
    surChangement?.(membres[suivant], suivant);
  };

  useEffect(() => {
    if (!defilement || enPause || suspendu || total < 2) return undefined;
    const t = setTimeout(() => {
      const suivant = (actif + 1) % total;
      setActif(suivant);
      surChangement?.(membres[suivant], suivant);
    }, defilement);
    return () => clearTimeout(t);
  }, [actif, defilement, enPause, suspendu, total, membres, surChangement]);

  if (total === 0) return null;
  const membre = membres[actif];
  const defile = Boolean(defilement) && !enPause && total > 1;

  const surTouche = (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      aller(actif - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      aller(actif + 1);
    }
  };

  // Glisser du doigt sur téléphone.
  const surDebut = (e) => {
    depart.current = e.clientX;
  };
  const surFin = (e) => {
    if (depart.current === null) return;
    const dx = e.clientX - depart.current;
    depart.current = null;
    if (Math.abs(dx) > 40) aller(actif + (dx < 0 ? 1 : -1));
  };

  return (
    <section
      aria-roledescription="carrousel"
      aria-label="L'équipe du projet"
      onKeyDown={surTouche}
      onMouseEnter={() => setSuspendu(true)}
      onMouseLeave={() => setSuspendu(false)}
      onFocus={() => setSuspendu(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setSuspendu(false);
      }}
      className="relative"
    >
      {/* ---- Les cartes ---- */}
      <div
        className="relative mx-auto h-72 max-w-3xl touch-pan-y select-none sm:h-96"
        onPointerDown={surDebut}
        onPointerUp={surFin}
        onPointerCancel={() => (depart.current = null)}
      >
        {membres.map((m, i) => {
          const d = ecart(i, actif, total);
          const loin = Math.abs(d);
          const centre = d === 0;
          return (
            <button
              key={m.id}
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => !centre && aller(i)}
              className={cx(
                "absolute top-0 left-1/2 aspect-[3/4] h-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-ink-900/10 transition-all duration-500 ease-out motion-reduce:transition-none dark:ring-white/10",
                centre ? "cursor-default" : "cursor-pointer grayscale",
                loin > 1 && "pointer-events-none"
              )}
              style={{
                transform: `translateX(calc(-50% + ${d * 62}%)) scale(${1 - Math.min(loin, 3) * 0.16})`,
                zIndex: 10 - loin,
                opacity: loin > 1 ? 0 : 1 - loin * 0.3,
              }}
            >
              <Portrait membre={m} />
            </button>
          );
        })}

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => aller(actif - 1)}
              aria-label="Membre précédent"
              className="absolute top-1/2 left-0 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 shadow-md ring-1 ring-ink-200 backdrop-blur hover:bg-white dark:bg-ink-900/90 dark:text-white dark:ring-ink-700 dark:hover:bg-ink-800"
            >
              <Icon name="arrow" className="size-5 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => aller(actif + 1)}
              aria-label="Membre suivant"
              className="absolute top-1/2 right-0 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink-800 shadow-md ring-1 ring-ink-200 backdrop-blur hover:bg-white dark:bg-ink-900/90 dark:text-white dark:ring-ink-700 dark:hover:bg-ink-800"
            >
              <Icon name="arrow" className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* ---- Le membre affiché ---- */}
      <div
        className="mx-auto mt-8 max-w-xl text-center"
        aria-live={defile ? "off" : "polite"}
        aria-atomic="true"
        aria-roledescription="diapositive"
        aria-label={`${actif + 1} sur ${total}`}
      >
        <h3 className="text-2xl font-bold tracking-tight text-ink-950 dark:text-white">{membre.nom}</h3>
        <p className="mt-1.5 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
          {membre.role}
        </p>
        {membre.bio && <p className="mt-3 text-sm/6 text-ink-600 dark:text-ink-400">{membre.bio}</p>}
      </div>

      {/* ---- Points et pause ---- */}
      {total > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2" role="group" aria-label="Choisir un membre">
            {membres.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => aller(i)}
                aria-label={m.nom}
                aria-current={i === actif ? "true" : undefined}
                className="grid size-6 place-items-center"
              >
                <span
                  className={cx(
                    "block h-2 rounded-full transition-all duration-300",
                    i === actif ? "w-6 bg-brand-600 dark:bg-brand-400" : "w-2 bg-ink-300 hover:bg-ink-400 dark:bg-ink-600"
                  )}
                />
              </button>
            ))}
          </div>
          {Boolean(defilement) && (
            <button
              type="button"
              onClick={() => setEnPause((v) => !v)}
              aria-label={enPause ? "Relancer le défilement" : "Mettre le défilement en pause"}
              className="grid size-8 place-items-center rounded-full text-ink-500 ring-1 ring-ink-200 hover:bg-ink-100 dark:text-ink-400 dark:ring-ink-700 dark:hover:bg-ink-800"
            >
              <Icon name={enPause ? "play" : "pause"} className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
