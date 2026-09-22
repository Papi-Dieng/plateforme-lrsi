import { Link } from "react-router-dom";
import Icon from "./Icon";

export const cx = (...c) => c.filter(Boolean).join(" ");

/* ------------------------------------------------------------------ */
/* Conteneur de page                                                   */
/* ------------------------------------------------------------------ */

export function Container({ className, children }) {
  return (
    <div className={cx("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const tonsBadge = {
  neutre:
    "bg-ink-100 text-ink-600 ring-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-700",
  brand:
    "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30",
  accent:
    "bg-accent-50 text-accent-700 ring-accent-300/60 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30",
  sun: "bg-sun-100 text-sun-900 ring-sun-400/50 dark:bg-sun-500/15 dark:text-sun-400 dark:ring-sun-500/30",
};

export function Badge({ ton = "neutre", icone, className, children }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        tonsBadge[ton] ?? tonsBadge.neutre,
        className
      )}
    >
      {icone && <Icon name={icone} className="size-3.5" />}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

const stylesBouton = {
  principal:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800 dark:bg-brand-500 dark:hover:bg-brand-400 dark:active:bg-brand-600",
  secondaire:
    "bg-white text-ink-800 ring-1 ring-inset ring-ink-200 shadow-sm hover:bg-ink-50 dark:bg-ink-800 dark:text-ink-100 dark:ring-ink-700 dark:hover:bg-ink-700",
  fantome:
    "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white",
  accent:
    "bg-accent-600 text-white shadow-sm hover:bg-accent-700 dark:bg-accent-500 dark:hover:bg-accent-400",
};

const taillesBouton = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

const baseBouton =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function Bouton({
  variante = "principal",
  taille = "md",
  to,
  href,
  className,
  children,
  ...rest
}) {
  const classes = cx(
    baseBouton,
    stylesBouton[variante],
    taillesBouton[taille],
    className
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Titres de section et en-têtes de page                               */
/* ------------------------------------------------------------------ */

export function TitreSection({ surtitre, titre, texte, centre = false }) {
  return (
    <div className={cx("max-w-2xl", centre && "mx-auto text-center")}>
      {surtitre && (
        <p className="mb-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
          {surtitre}
        </p>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-balance text-ink-900 sm:text-3xl dark:text-white">
        {titre}
      </h2>
      {texte && (
        <p className="mt-3 text-base/7 text-ink-600 dark:text-ink-400">{texte}</p>
      )}
    </div>
  );
}

export function EnTetePage({ surtitre, titre, texte, children }) {
  return (
    <header className="relative overflow-hidden border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <Container className="relative py-10 sm:py-14">
        {surtitre && (
          <p className="mb-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
            {surtitre}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-balance text-ink-900 sm:text-4xl dark:text-white">
          {titre}
        </h1>
        {texte && (
          <p className="mt-4 max-w-2xl text-base/7 text-ink-600 dark:text-ink-400">
            {texte}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Avertissement contenu de démonstration                              */
/* ------------------------------------------------------------------ */

export function NoteDemo({ children }) {
  return (
    <div className="flex gap-3 rounded-xl border border-sun-400/40 bg-sun-100/60 px-4 py-3 text-sm/6 text-sun-900 dark:border-sun-500/30 dark:bg-sun-500/10 dark:text-sun-400">
      <Icon name="bulb" className="mt-0.5 size-4.5 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* État vide                                                           */
/* ------------------------------------------------------------------ */

export function EtatVide({ titre, texte, children }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-ink-100 text-ink-400 dark:bg-ink-800">
        <Icon name="search" className="size-5" />
      </div>
      <p className="font-semibold text-ink-900 dark:text-white">{titre}</p>
      {texte && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500 dark:text-ink-400">
          {texte}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Champ de recherche                                                  */
/* ------------------------------------------------------------------ */

export function ChampRecherche({ valeur, onChange, placeholder, id }) {
  return (
    <div className="relative">
      <Icon
        name="search"
        className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-ink-400"
      />
      <input
        id={id}
        type="search"
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-ink-200 bg-white py-2.5 pr-4 pl-10.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Groupe de filtres                                                   */
/* ------------------------------------------------------------------ */

export function Filtres({ options, actif, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => {
        const selectionne = o.value === actif;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={selectionne}
            className={cx(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectionne
                ? "bg-brand-600 text-white"
                : "bg-white text-ink-600 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bloc de code / réponse                                              */
/* ------------------------------------------------------------------ */

export function BlocCode({ children, className }) {
  return (
    <pre
      className={cx(
        "overflow-x-auto rounded-xl bg-ink-900 px-4 py-3.5 font-mono text-[13px]/6 text-ink-100 dark:bg-ink-950 dark:ring-1 dark:ring-ink-800",
        className
      )}
    >
      <code>{children}</code>
    </pre>
  );
}
