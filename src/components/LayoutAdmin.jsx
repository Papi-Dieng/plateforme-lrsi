import { Suspense } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Icon from "./Icon";
import FiletErreur from "./FiletErreur";
import { BoutonTheme, ChargementPage } from "./Layout";
import { cx } from "./classes";
import { ecrireSessionAdmin, useSessionAdmin } from "../sessionAdmin";
import { site } from "../data/site";
import { comptes } from "../data/comptes";
import { PAGES_ADMIN, QUADRILLAGE, mono, numeroPage } from "./styleAdmin";

/* ==================================================================
   La coque de l'espace d'administration, à part de celle du site.

   D'après la maquette « admin Sunu Cours » (6 octobre 2026) : une
   barre latérale sombre et quadrillée (les quatre pages des
   « coulisses », des liens utiles, la session admin en bas), puis un
   fil d'Ariane et le contenu de la page sur fond gris clair. Sur
   téléphone, la barre latérale passe en haut et ses liens défilent
   à l'horizontale.

   Les étudiants n'y arrivent jamais : rien n'y renvoie depuis le site,
   et les pages sont téléchargées à la demande.
   ================================================================== */

// « coszkdebnemjfxbprmfi » dans https://coszkdebnemjfxbprmfi.supabase.co
const projetSupabase = /^https:\/\/([a-z0-9]+)\.supabase\.co/.exec(comptes.url)?.[1];

const LIENS = [
  { to: "/tableau-de-bord", label: "Voir le site", icone: "oeil" },
  ...(projetSupabase
    ? [{ href: `https://supabase.com/dashboard/project/${projetSupabase}/auth/users`, label: "Comptes · Supabase", icone: "users" }]
    : []),
  { to: "/projet", label: "Feuille de route", icone: "route" },
];

function Marque() {
  return (
    <Link to="/admin" className="inline-flex items-center gap-2.5 text-[21px] font-extrabold tracking-tight text-white">
      <span>
        <span className="text-[#8eaaff]">{site.nomAccent}</span>
        {site.nom.slice(site.nomAccent.length)}
      </span>
      <span className={cx("rounded-md bg-lime-400 px-1.5 py-0.5 text-[10px] font-bold text-ink-950", mono)}>ADMIN</span>
    </Link>
  );
}

function SessionAdmin() {
  const session = useSessionAdmin();
  if (!session) return null;
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/4 p-4">
      <p className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon name="cle" className="size-4 text-lime-400" />
        Session admin
      </p>
      <p className="mt-1.5 text-[13px]/snug text-ink-300">Mot de passe vérifié par le relais, gardé le temps de l&apos;onglet.</p>
      <button
        type="button"
        onClick={() => {
          if (window.confirm("Se déconnecter ? Un brouillon non publié ou une fiche non enregistrée serait perdu.")) ecrireSessionAdmin("");
        }}
        className="mt-3.5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3.5 text-sm font-bold text-white transition-colors hover:bg-white/8"
      >
        <Icon name="sortie" className="size-4" />
        Se déconnecter
      </button>
    </div>
  );
}

function BarreLaterale() {
  const titre = cx("px-3 text-[10.5px] font-bold text-ink-400", mono);
  return (
    <aside
      className="bg-[#0b0e17] text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-66 lg:shrink-0 lg:flex-col lg:overflow-y-auto"
      style={QUADRILLAGE}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 lg:px-7 lg:pt-8 lg:pb-6">
        <Marque />
        <BoutonTheme className="text-ink-300 hover:bg-white/10 hover:text-white lg:hidden dark:hover:bg-white/10" />
      </div>

      <nav aria-label="Coulisses" className="px-3 lg:px-4.5">
        <p className={cx(titre, "hidden lg:block")}>COULISSES</p>
        <ul className="flex gap-1 overflow-x-auto pb-3 lg:mt-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {PAGES_ADMIN.map((p, i) => (
            <li key={p.to} className="shrink-0">
              <NavLink
                to={p.to}
                end
                className={({ isActive }) =>
                  cx(
                    "flex min-h-11 items-center gap-3.5 rounded-[14px] px-3 py-2 text-[14.5px]/tight font-semibold transition-colors lg:min-h-12",
                    isActive ? "bg-white font-extrabold text-ink-950" : "text-ink-200 hover:bg-white/7 hover:text-white"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className={cx("text-[11px]", mono, isActive ? "text-brand-600" : "text-ink-400")}>
                      {numeroPage(i)}
                    </span>
                    {p.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <nav aria-label="Liens utiles" className="hidden px-4.5 lg:mt-9 lg:block">
        <p className={titre}>LIENS UTILES</p>
        <ul className="mt-3 flex flex-col gap-1">
          {LIENS.map((l) => {
            const classe =
              "flex min-h-12 items-center gap-3.5 rounded-[14px] px-3 text-[14.5px] font-semibold text-ink-200 transition-colors hover:bg-white/7 hover:text-white";
            const contenu = (
              <>
                <Icon name={l.icone} className="size-4.5 shrink-0 text-ink-400" />
                <span className="flex-1">{l.label}</span>
                <Icon name="external" className="size-3.5 text-ink-400" />
              </>
            );
            return (
              <li key={l.label}>
                {l.to ? (
                  <Link to={l.to} className={classe}>
                    {contenu}
                  </Link>
                ) : (
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className={classe}>
                    {contenu}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="hidden px-4.5 pt-8 pb-5 lg:mt-auto lg:block">
        <SessionAdmin />
      </div>
    </aside>
  );
}

function BarreDuHaut() {
  const { pathname } = useLocation();
  const i = PAGES_ADMIN.findIndex((p) => p.to === pathname);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 py-4 lg:py-5.5 dark:border-ink-800">
      <nav aria-label="Fil d'Ariane" className={cx("flex flex-wrap gap-2 text-xs text-ink-600 dark:text-ink-400", mono)}>
        <span>COULISSES</span>
        <span aria-hidden="true">/</span>
        {i >= 0 && (
          <b className="font-medium text-ink-950 dark:text-white" aria-current="page">
            {numeroPage(i)} · {PAGES_ADMIN[i].label.toUpperCase()}
          </b>
        )}
      </nav>
      <div className="flex items-center gap-2.5">
        <BoutonTheme className="hidden lg:grid" />
        <Link
          to="/tableau-de-bord"
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-ink-200 bg-white px-4 text-sm font-bold text-ink-950 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:bg-ink-800"
        >
          <Icon name="oeil" className="size-4" />
          Voir le site
        </Link>
      </div>
    </div>
  );
}

export default function LayoutAdmin() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#eef0f4] lg:flex dark:bg-ink-950">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Aller au contenu principal
      </a>
      <BarreLaterale />
      <div className="min-w-0 flex-1 px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-[1100px]">
          <BarreDuHaut />
          <main id="contenu" className="pb-16">
            <FiletErreur key={pathname}>
              <Suspense fallback={<ChargementPage />}>
                <Outlet />
              </Suspense>
            </FiletErreur>
          </main>
          {/* Sur téléphone, la session se ferme en bas de page. */}
          <div className="pb-8 lg:hidden [&>div]:bg-[#0b0e17]">
            <SessionAdmin />
          </div>
        </div>
      </div>
    </div>
  );
}

/* L'en-tête de chaque page : surtitre, très grand titre, texte, et le
   numéro de la page en grand, évidé, à droite. */
export function EnTeteAdmin({ titre, texte, children }) {
  const { pathname } = useLocation();
  const i = Math.max(0, PAGES_ADMIN.findIndex((p) => p.to === pathname));
  return (
    <header className="relative pt-10 pb-8 sm:pt-14">
      <p aria-hidden="true" className="pointer-events-none absolute top-10 right-0 hidden text-[180px] leading-[0.8] font-extrabold tracking-[-0.06em] text-transparent select-none [-webkit-text-stroke:2px_rgb(31_71_224/0.18)] md:block dark:[-webkit-text-stroke:2px_rgb(142_170_255/0.18)]">
        {numeroPage(i)}
      </p>
      <p className={cx("relative flex items-center gap-2.5 text-xs font-bold text-brand-600 dark:text-brand-400", mono)}>
        <span className="block h-0.5 w-6 bg-current" aria-hidden="true" />
        {numeroPage(i)} · {PAGES_ADMIN[i].label.toUpperCase()}
      </p>
      <h1 className="relative mt-5 max-w-[640px] text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] font-extrabold tracking-[-0.045em] text-ink-950 dark:text-white">
        {titre}
      </h1>
      {texte && <p className="relative mt-5 max-w-[640px] text-[17px]/7 text-ink-600 sm:text-lg/8 dark:text-ink-300">{texte}</p>}
      {children && <div className="relative mt-5 flex flex-wrap gap-2.5">{children}</div>}
    </header>
  );
}
