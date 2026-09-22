import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import Icon from "./Icon";
import { cx } from "./ui";
import { initiales, useSession } from "../session";
import { lireProfil, nomAffiche } from "../profil";
import { getAvatar } from "../data/avatars";
import { menuProfil, navigation, site } from "../data/site";

/* ------------------------------------------------------------------ */
/* Logo et signature                                                   */
/* ------------------------------------------------------------------ */

export function Logo({ className = "size-9" }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="16" className="fill-brand-600" />
      <circle cx="32" cy="17" r="5.5" fill="#fff" />
      <circle cx="16" cy="45" r="5.5" className="fill-lime-400" />
      <circle cx="48" cy="45" r="5.5" className="fill-flame-500" />
      <path
        d="M32 22.5 16 39.5M32 22.5l16 17M16 45h32"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".85"
      />
    </svg>
  );
}

// Le nom vient de src/data/site.js. `nomAccent`, s'il est renseigné et qu'il
// correspond au début du nom, s'affiche en orange : c'est purement décoratif
// et le laisser vide fonctionne aussi bien.
export function Signature() {
  const accent = site.nomAccent ?? "";
  const colore = accent && site.nom.startsWith(accent);
  return (
    <span className="text-lg font-bold tracking-tight text-ink-900 dark:text-white">
      {colore ? (
        <>
          <span className="text-flame-500">{accent}</span>
          {site.nom.slice(accent.length)}
        </>
      ) : (
        site.nom
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Thème clair / sombre                                                */
/* ------------------------------------------------------------------ */

function themeInitial() {
  if (typeof window === "undefined") return "light";
  const enregistre = localStorage.getItem("lrsi-theme");
  if (enregistre === "light" || enregistre === "dark") return enregistre;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function BoutonTheme({ className }) {
  const [theme, setTheme] = useState(themeInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("lrsi-theme", theme);
    } catch {
      /* stockage indisponible : on garde simplement le thème en mémoire */
    }
  }, [theme]);

  const sombre = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(sombre ? "light" : "dark")}
      aria-label={sombre ? "Passer en thème clair" : "Passer en thème sombre"}
      title={sombre ? "Thème clair" : "Thème sombre"}
      className={cx(
        "grid size-10 place-items-center rounded-xl text-ink-500 transition-colors hover:bg-ink-200 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white",
        className
      )}
    >
      <Icon name={sombre ? "sun" : "moon"} className="size-5" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Barre latérale                                                      */
/* ------------------------------------------------------------------ */

const icones = {
  "/tableau-de-bord": "grid",
  "/cours": "folder",
  "/exercices": "pencil",
  "/qcm": "target",
  "/videos": "video",
  "/bibliotheque": "book",
  "/favoris": "bookmark",
  "/progression": "layers",
  "/projet": "info",
};

function BarreLaterale() {
  return (
    <aside className="hidden w-[76px] shrink-0 flex-col items-center border-r border-ink-200 bg-ink-50 py-5 lg:flex dark:border-ink-800 dark:bg-ink-950">
      <Link to="/tableau-de-bord" aria-label="Tableau de bord" className="mb-6">
        <Logo className="size-10" />
      </Link>

      <nav
        className="flex flex-1 flex-col items-center gap-1.5"
        aria-label="Navigation principale"
      >
        {navigation.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/tableau-de-bord"}
            title={l.label}
            aria-label={l.label}
            className={({ isActive }) =>
              cx(
                "grid size-11 place-items-center rounded-xl transition-colors",
                isActive
                  ? "bg-flame-500 text-white shadow-sm"
                  : "text-ink-400 hover:bg-ink-200 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white"
              )
            }
          >
            <Icon name={icones[l.to] ?? "grid"} className="size-5" />
          </NavLink>
        ))}
      </nav>

      <BoutonTheme />
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Recherche                                                           */
/* ------------------------------------------------------------------ */

function Recherche() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [local, setLocal] = useState("");

  // Sur le tableau de bord, la recherche filtre en direct et vit dans l'URL.
  // Ailleurs, elle sert de raccourci : valider renvoie au tableau de bord.
  const surAccueil = pathname === "/tableau-de-bord";
  const valeur = surAccueil ? (params.get("q") ?? "") : local;

  const changer = (v) => {
    if (surAccueil) setParams(v ? { q: v } : {}, { replace: true });
    else setLocal(v);
  };

  const soumettre = (e) => {
    e.preventDefault();
    if (!surAccueil) {
      navigate(
        local
          ? `/tableau-de-bord?q=${encodeURIComponent(local)}`
          : "/tableau-de-bord"
      );
    }
  };

  return (
    <form onSubmit={soumettre} role="search" className="min-w-0 flex-1 sm:max-w-sm">
      <label htmlFor="recherche-globale" className="sr-only">
        Rechercher une matière, un chapitre ou un exercice
      </label>
      <div className="relative">
        <input
          id="recherche-globale"
          type="search"
          value={valeur}
          onChange={(e) => changer(e.target.value)}
          placeholder="Rechercher…"
          className="w-full rounded-full border border-transparent bg-ink-100 py-2.5 pr-12 pl-5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 dark:bg-ink-800 dark:text-white dark:focus:bg-ink-900"
        />
        <button
          type="submit"
          aria-label="Lancer la recherche"
          className="absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-flame-500 text-white transition-colors hover:bg-flame-600"
        >
          <Icon name="search" className="size-4" />
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

function Pastille({ profil, session, taille = "size-10" }) {
  const avatar = getAvatar(profil.avatarId);
  const aUnProfil = Boolean(profil.pseudo.trim() || profil.nomComplet.trim());

  // Anneau dégradé autour de la vignette, comme sur la maquette.
  return (
    <span
      className={cx(
        "block rounded-full bg-gradient-to-br from-violet-500 via-rose-500 to-flame-400 p-0.5",
        taille
      )}
    >
      <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white dark:bg-ink-900">
        {aUnProfil ? (
          <span className="scale-[0.92]">{avatar.svg}</span>
        ) : (
          <span className="text-xs font-bold text-ink-500 dark:text-ink-300">
            {initiales(session?.nom)}
          </span>
        )}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Menu déroulant du profil                                            */
/* ------------------------------------------------------------------ */

function MenuProfil() {
  const { session, sortir } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [ouvert, setOuvert] = useState(false);
  const [profil, setProfil] = useState(lireProfil);
  const conteneur = useRef(null);

  // La fiche peut changer sur la page profil : on la relit à chaque
  // navigation plutôt que de la recharger en permanence.
  useEffect(() => {
    setProfil(lireProfil());
    setOuvert(false);
  }, [pathname]);

  useEffect(() => {
    if (!ouvert) return undefined;
    const surClic = (e) => {
      if (!conteneur.current?.contains(e.target)) setOuvert(false);
    };
    const surTouche = (e) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", surClic);
    window.addEventListener("keydown", surTouche);
    return () => {
      document.removeEventListener("mousedown", surClic);
      window.removeEventListener("keydown", surTouche);
    };
  }, [ouvert]);

  if (!session) {
    return (
      <Link
        to="/connexion"
        className="shrink-0 rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200"
      >
        Se connecter
      </Link>
    );
  }

  const invite = session.mode === "invite";
  const nom = nomAffiche(profil, session);
  // Le badge invite à compléter la fiche, pas à s'inscrire : il dépend
  // donc du profil, pas du mode de session.
  const profilVide = !profil.pseudo.trim() && !profil.nomComplet.trim();
  const sousTitre =
    profil.email.trim() || (invite ? "Mode invité" : "Compte de démonstration");

  return (
    <div ref={conteneur} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label="Ouvrir le menu du profil"
        className={cx(
          "flex items-center gap-3 rounded-2xl border p-1.5 transition-all duration-200 sm:p-2",
          ouvert
            ? "border-ink-300 bg-ink-50 dark:border-ink-700 dark:bg-ink-800/50"
            : "border-transparent hover:border-ink-200 hover:bg-ink-50 dark:hover:border-ink-700 dark:hover:bg-ink-800/40"
        )}
      >
        <span className="hidden text-left leading-tight md:block">
          <span className="block max-w-36 truncate text-sm font-medium tracking-tight text-ink-900 dark:text-ink-100">
            {nom}
          </span>
          <span className="block max-w-36 truncate text-xs tracking-tight text-ink-500 dark:text-ink-400">
            {sousTitre}
          </span>
        </span>
        <Pastille profil={profil} session={session} />
      </button>

      {ouvert && (
        <div
          role="menu"
          aria-label="Menu du profil"
          className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl border border-ink-200/70 bg-white/95 p-2 shadow-xl backdrop-blur-sm dark:border-ink-800/70 dark:bg-ink-900/95"
        >
          {/* En-tête */}
          <div className="flex items-center gap-3 rounded-xl px-3 py-3">
            <Pastille profil={profil} session={session} taille="size-9" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                {nom}
              </span>
              <span className="block truncate text-xs text-ink-500 dark:text-ink-400">
                {sousTitre}
              </span>
            </span>
          </div>

          <div className="my-1 h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent dark:via-ink-800" />

          <ul className="space-y-1">
            {menuProfil
              .filter((item) => !item.auteur)
              .map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    role="menuitem"
                    className="group flex items-center gap-2.5 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-ink-200/60 hover:bg-ink-100/80 dark:hover:border-ink-700/60 dark:hover:bg-ink-800/60"
                  >
                    <Icon
                      name={item.icone}
                      className="size-4 text-ink-500 dark:text-ink-400"
                    />
                    <span className="text-sm font-medium tracking-tight whitespace-nowrap text-ink-900 dark:text-ink-100">
                      {item.label}
                    </span>
                    {item.to === "/profil" && profilVide && (
                      <span className="ml-auto rounded-md border border-brand-500/10 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        à remplir
                      </span>
                    )}
                  </Link>
                </li>
              ))}
          </ul>

          {/* Entrées d'auteur, séparées de celles de l'étudiant. */}
          {menuProfil.some((item) => item.auteur) && (
            <>
              <div className="my-2 h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent dark:via-ink-800" />
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-ink-400 uppercase">
                Coulisses
              </p>
              <ul className="space-y-1">
                {menuProfil
                  .filter((item) => item.auteur)
                  .map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        role="menuitem"
                        className="group flex items-center gap-2.5 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-ink-200/60 hover:bg-ink-100/80 dark:hover:border-ink-700/60 dark:hover:bg-ink-800/60"
                      >
                        <Icon
                          name={item.icone}
                          className="size-4 text-ink-500 dark:text-ink-400"
                        />
                        <span className="text-sm font-medium tracking-tight whitespace-nowrap text-ink-900 dark:text-ink-100">
                          {item.label}
                        </span>
                        <span className="ml-auto rounded-md border border-sun-400/20 bg-sun-100 px-2 py-0.5 text-[11px] font-medium text-sun-800 dark:bg-sun-500/15 dark:text-sun-300">
                          amorce
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </>
          )}

          <div className="my-2 h-px bg-gradient-to-r from-transparent via-ink-200 to-transparent dark:via-ink-800" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOuvert(false);
              sortir();
              navigate("/");
            }}
            className="group flex w-full items-center gap-3 rounded-xl border border-transparent bg-red-500/10 p-3 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/20"
          >
            <Icon name="external" className="size-4 text-red-500" />
            <span className="text-sm font-medium text-red-500 group-hover:text-red-600">
              Quitter la session
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Barre du haut                                                       */
/* ------------------------------------------------------------------ */

function BarreDuHaut({ ouvert, setOuvert }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white/90 backdrop-blur-md dark:border-ink-800 dark:bg-ink-900/90">
      <div className="flex h-18 items-center gap-3 px-4 sm:gap-5 sm:px-7">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
          className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
        >
          <Icon name={ouvert ? "close" : "menu"} className="size-5" />
        </button>

        <Link
          to="/tableau-de-bord"
          className="hidden shrink-0 items-center gap-2 sm:flex"
        >
          <Logo className="size-8 lg:hidden" />
          <Signature />
        </Link>

        <div className="flex flex-1 justify-center">
          <Recherche />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          title="Notifications : disponibles avec les comptes, en version 3"
          className="relative hidden size-10 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-100 sm:grid dark:text-ink-400 dark:hover:bg-ink-800"
        >
          <Icon name="bell" className="size-5" />
          <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-flame-500" />
        </button>

        <MenuProfil />
      </div>

      {ouvert && (
        <nav
          className="border-t border-ink-200 px-4 py-3 lg:hidden dark:border-ink-800"
          aria-label="Navigation mobile"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === "/tableau-de-bord"}
                  className={({ isActive }) =>
                    cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      isActive
                        ? "bg-flame-500 text-white"
                        : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                    )
                  }
                >
                  <Icon name={icones[l.to] ?? "grid"} className="size-4.5" />
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Pied de page compact                                                */
/* ------------------------------------------------------------------ */

function PiedDePage() {
  return (
    <footer className="border-t border-ink-200 px-4 py-6 sm:px-7 dark:border-ink-800">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-400 dark:text-ink-500">
          © {site.annee} {site.nom} — {site.filiere}. Contenus de démonstration.
          Aucun document universitaire n'est publié sans autorisation.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/conditions"
            className="text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            Conditions d'utilisation
          </Link>
          <Link
            to="/projet"
            className="text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            La démarche du projet
          </Link>
          <a
            href={`mailto:${site.contact}`}
            className="text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
          >
            Nous écrire
          </a>
          <BoutonTheme className="lg:hidden" />
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

function RetourEnHaut() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function Layout() {
  const [ouvert, setOuvert] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOuvert(false), [pathname]);

  return (
    <div className="min-h-screen bg-ink-200 lg:p-5 dark:bg-ink-950">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Aller au contenu principal
      </a>
      <RetourEnHaut />

      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] overflow-hidden bg-white lg:min-h-[calc(100vh-2.5rem)] lg:rounded-3xl lg:shadow-xl lg:ring-1 lg:ring-ink-300/50 dark:bg-ink-900 dark:lg:ring-ink-800">
        <BarreLaterale />
        <div className="flex min-w-0 flex-1 flex-col">
          <BarreDuHaut ouvert={ouvert} setOuvert={setOuvert} />
          <main id="contenu" className="flex-1">
            <Outlet />
          </main>
          <PiedDePage />
        </div>
      </div>
    </div>
  );
}
