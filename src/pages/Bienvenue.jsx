import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { Logo, Signature } from "../components/Layout";
import { Baobab } from "../components/Logo";
import { cx } from "../components/classes";
import { useSession } from "../session";
import { site } from "../data/site";
import { matieres } from "../data/matieres";
import { exercices } from "../data/exercices";

const nbChapitres = matieres.reduce((n, m) => n + m.chapitres.length, 0);

const reperes = [
  {
    icone: "layers",
    valeur: matieres.length,
    titre: "matières couvertes",
    detail: "des réseaux à la cybersécurité",
  },
  {
    icone: "book",
    valeur: nbChapitres,
    titre: "chapitres structurés",
    detail: "classés par semestre",
  },
  {
    icone: "pencil",
    valeur: exercices.length,
    titre: "exercices corrigés",
    detail: "avec la méthode détaillée",
  },
];

const liensPublics = [
  { to: "/cours", label: "Cours" },
  { to: "/exercices", label: "Exercices" },
  { to: "/qcm", label: "QCM" },
  { to: "/bibliotheque", label: "Bibliothèque" },
  { to: "/projet", label: "Le projet" },
];

export default function Bienvenue() {
  const navigate = useNavigate();
  const { entrer } = useSession();
  const [requete, setRequete] = useState("");

  const chercher = (e) => {
    e.preventDefault();
    navigate(requete.trim() ? `/cours?q=${encodeURIComponent(requete.trim())}` : "/cours");
  };

  const entrerEnInvite = () => {
    entrer("invite");
    navigate("/tableau-de-bord");
  };

  return (
    <div className="min-h-screen bg-ink-200 lg:p-5 dark:bg-ink-950">
      <div className="mx-auto w-full max-w-[1440px] overflow-hidden bg-white lg:rounded-3xl lg:shadow-xl lg:ring-1 lg:ring-ink-300/50 dark:bg-ink-900 dark:lg:ring-ink-800">
        {/* ------------------------------------------------------ */}
        {/* En-tête public                                          */}
        {/* ------------------------------------------------------ */}
        <header className="flex flex-wrap items-center gap-4 px-5 py-5 sm:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <Logo className="size-9" />
            <Signature />
          </Link>

          <nav
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="Navigation publique"
          >
            {liensPublics.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              to="/connexion"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
            >
              <Icon name="lock" className="size-4" />
              Se connecter
            </Link>
            <Link
              to="/inscription"
              className="rounded-xl bg-ink-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200"
            >
              Créer un compte
            </Link>
          </div>
        </header>

        {/* ------------------------------------------------------ */}
        {/* Héros                                                   */}
        {/* ------------------------------------------------------ */}
        <section className="grid items-center gap-10 px-5 pt-6 pb-12 sm:px-8 lg:grid-cols-2 lg:gap-8 lg:pt-10 lg:pb-16">
          <div>
            <h1 className="text-4xl leading-[1.08] font-bold tracking-tight text-balance text-ink-950 sm:text-5xl xl:text-[3.4rem] dark:text-white">
              Apprendre, réviser,{" "}
              <span className="text-brand-600 dark:text-brand-400">
                s'entraîner
              </span>{" "}
              au même endroit.
            </h1>

            <p className="mt-6 max-w-md text-base/7 text-ink-600 dark:text-ink-400">
              Les cours, les exercices corrigés et les QCM de la filière Réseaux
              et Systèmes Informatiques, réunis sur une plateforme gratuite,
              construite par un étudiant.
            </p>

            <form onSubmit={chercher} role="search" className="mt-9 max-w-md">
              <label htmlFor="recherche-accueil" className="sr-only">
                Rechercher une matière ou un chapitre
              </label>
              <div className="flex items-stretch gap-0 rounded-xl border-b-2 border-ink-900 sm:gap-3 sm:border-0 dark:border-ink-100">
                <div className="relative flex-1">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute top-1/2 left-0 size-4.5 -translate-y-1/2 text-ink-500 dark:text-ink-400"
                  />
                  <input
                    id="recherche-accueil"
                    type="search"
                    value={requete}
                    onChange={(e) => setRequete(e.target.value)}
                    placeholder="Rechercher une matière…"
                    className="w-full bg-transparent py-3.5 pr-3 pl-7 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  className="shrink-0 rounded-lg bg-ink-950 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-800 sm:rounded-xl dark:bg-white dark:text-ink-950 dark:hover:bg-ink-200"
                >
                  Rechercher
                </button>
              </div>
            </form>

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={entrerEnInvite}
                className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-5 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-lime-300"
              >
                Entrer en mode invité
                <Icon name="arrow" className="size-4" />
              </button>
              <span className="text-sm text-ink-500 dark:text-ink-400">
                Sans compte, sans inscription.
              </span>
            </div>
          </div>

          {/* Illustration */}
          <Illustration />
        </section>

        {/* ------------------------------------------------------ */}
        {/* Repères chiffrés                                        */}
        {/* ------------------------------------------------------ */}
        <section className="border-t border-ink-200 px-5 py-8 sm:px-8 dark:border-ink-800">
          <h2 className="sr-only">La plateforme en chiffres</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {reperes.map((r) => (
              <li key={r.titre} className="grid grid-cols-[auto_1fr] items-center gap-x-4">
                <span aria-hidden="true" className="row-span-2 grid size-12 shrink-0 place-items-center rounded-2xl bg-lime-400/25 text-accent-700 dark:bg-lime-400/15 dark:text-lime-300">
                  <Icon name={r.icone} className="size-6" />
                </span>
                <p className="self-end text-sm text-ink-600 dark:text-ink-400">
                  <span className="mr-1 text-lg font-bold text-ink-950 dark:text-white">
                    {r.valeur}
                  </span>
                  {r.titre}
                </p>
                <p className="self-start text-xs text-ink-500 dark:text-ink-400">
                  {r.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ------------------------------------------------------ */}
        {/* Pied de page                                            */}
        {/* ------------------------------------------------------ */}
        <footer className="border-t border-ink-200 px-5 py-6 sm:px-8 dark:border-ink-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-ink-500 dark:text-ink-400">
              © {site.annee} {site.nom} — {site.filiere}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {[
                ["/conditions", "Conditions d'utilisation"],
                ["/confidentialite", "Confidentialité"],
                ["/mentions-legales", "Mentions légales"],
                ["/projet", "La démarche du projet"],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className="text-xs font-medium text-ink-500 hover:text-brand-600 dark:text-ink-400"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composition illustrée : le logo du site, en grand                   */
/* ------------------------------------------------------------------ */

function Illustration() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Halo */}
      <div
        className="pointer-events-none absolute -top-8 left-4 size-56 rounded-full bg-lime-400/40 blur-3xl dark:bg-lime-400/15"
        aria-hidden="true"
      />

      {/* Le baobab de Sunu Cours sur son panneau bleu, comme sur la
          fiche d'identité. Le bleu est celui du logo (brand-600, soit
          #1f47e0) : les cernes des nœuds et des feuilles sont dessinés
          avec cette couleur exacte, donc changer le fond du panneau
          oblige à changer `fond` ci-dessous. */}
      <div className="relative ml-auto flex aspect-4/3 w-[88%] items-center justify-center overflow-hidden rounded-3xl bg-brand-600">
        {/* La grille en pointillés du fond */}
        <div
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(#ffffff4d_1.5px,transparent_1.5px)] [background-size:22px_22px]"
          aria-hidden="true"
        />
        <svg
          viewBox="0 0 120 120"
          className="relative w-[56%] drop-shadow-[0_14px_26px_rgba(8,16,54,0.35)]"
          aria-hidden="true"
        >
          <Baobab trait="#ffffff" fond="#1f47e0" />
        </svg>

        {/* Repère vertical. Caché sur téléphone : le panneau y est trop
            étroit, le texte passait sur deux colonnes par-dessus l'arbre. */}
        <div className="absolute top-5 right-4 bottom-5 hidden items-center sm:flex">
          <span className="rotate-180 text-[11px] font-medium tracking-wide text-white/70 [writing-mode:vertical-rl]">
            Filière Réseaux et Systèmes Informatiques
          </span>
        </div>
      </div>

      {/* Pastille tournante */}
      <div className="absolute top-2 left-0 grid size-28 place-items-center sm:size-32">
        <svg
          viewBox="0 0 120 120"
          className="absolute inset-0 size-full animate-spin [animation-duration:22s]"
          aria-hidden="true"
        >
          <defs>
            <path
              id="cercle-baseline"
              d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"
            />
          </defs>
          {/* La phrase fait le tour exact du cercle : l'allonger demande
              de réduire la taille du texte, sinon la fin recouvre le
              début. */}
          <text className="fill-ink-900 text-[9.2px] font-semibold tracking-[0.18em] dark:fill-white">
            <textPath href="#cercle-baseline">
              · APPRENDRE ENSEMBLE · RÉUSSIR DEMAIN ·
            </textPath>
          </text>
        </svg>
        <span
          className={cx(
            "grid size-14 place-items-center rounded-full bg-ink-950 text-lime-400 sm:size-16",
            "dark:bg-white dark:text-ink-950"
          )}
        >
          <Icon name="graduation" className="size-7" />
        </span>
      </div>
    </div>
  );
}
