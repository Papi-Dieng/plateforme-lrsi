import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import { Container } from "./ui";
import { cx } from "./classes";
import { initiales } from "../session";
import { site } from "../data/site";

/* ==================================================================
   Mise en page commune aux pages juridiques : conditions
   d'utilisation, politique de confidentialité, mentions légales.

   D'après la maquette « Pages juridiques Sunu Cours » (seconde version,
   6 octobre 2026) : en-tête sombre quadrillé, fil d'Ariane, très grand
   titre dont le dernier mot passe en vert, pastilles, onglets 01 / 02 /
   03, et à droite une carte propre à chaque page qui déborde sur la
   suite. Puis un sommaire collant avec barre de progression, et un
   article par carte, au grand numéro évidé. Les polices de la maquette
   (Google Fonts) ne sont pas reprises : le site garde les siennes et ne
   télécharge rien chez Google. L'en-tête et le pied de page du site
   restent ceux de la coque.

   Chaque page fournit :
     - `visuel` : la carte de l'en-tête (FicheIdentite, EtiquetteDonnees
       ou PermisInterdit, exportées plus bas) ;
     - `articles` : [{ icone, titre, paragraphes, liens? }], où un
       paragraphe est un texte (le premier sert de chapeau), ou
         { liste: [[terme, explication], …] }  des lignes numérotées 1.1…,
         { hebergeurs: [{ role, nom, service, lieu }, …] }  par pays,
         { equipe: [{ nom, role, photo }, …] }  les portraits,
         { note: "…" }  un encadré « À retenir » ;
       `liens` : [{ to | href, label }].

   La date de mise à jour vient de `site.pagesJuridiquesMisesAJour`.
   ================================================================== */

const PAGES = [
  { to: "/conditions", label: "Conditions d'utilisation" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/mentions-legales", label: "Mentions légales" },
];

const numero = (i) => String(i + 1).padStart(2, "0");
const ancre = (i) => `article-${numero(i)}`;

// « Licence Réseaux et Systèmes Informatiques (LRSI) » → « LRSI ».
const sigle = /\(([^)]+)\)\s*$/.exec(site.filiere)?.[1] ?? "";
const filiereLongue = site.filiere.replace(/\s*\([^)]*\)\s*$/, "");

// Les couleurs des portraits sans photo, dans l'ordre de la maquette.
const FONDS_PORTRAIT = ["#1f47e0", "#0d101a", "#1a37b5", "#2a3350"];
const PASTILLES = [
  "bg-brand-600 text-white",
  "bg-lime-400 text-ink-950",
  "bg-[#ff5a2b] text-ink-950",
  "bg-ink-950 text-white dark:bg-ink-700",
];

const mono = "font-mono tracking-[0.06em]";
const carteVisuel =
  "rounded-[28px] bg-white text-ink-900 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.63),0_0_0_1px_rgb(0_0_0/0.05)] dark:bg-ink-800 dark:text-ink-100 dark:ring-1 dark:ring-white/10";

/* « Mentions légales » → « Mentions » + « légales. » en vert, à la ligne. */
function TitreGeant({ titre }) {
  const coupe = titre.lastIndexOf(" ");
  const debut = coupe < 0 ? "" : titre.slice(0, coupe);
  const fin = coupe < 0 ? titre : titre.slice(coupe + 1);
  return (
    <h1 className="mt-5 text-[clamp(3rem,8.6vw,7.75rem)] leading-[0.9] font-extrabold tracking-[-0.055em] break-words text-white">
      {debut}
      {debut && " "}
      <span className="block text-lime-400">
        {fin}
        <span aria-hidden="true">.</span>
      </span>
    </h1>
  );
}

function Lien({ lien }) {
  const classe =
    "inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-50 dark:border-ink-700 dark:bg-ink-900 dark:text-brand-300 dark:hover:bg-ink-800";
  if (lien.to) {
    return (
      <Link to={lien.to} className={classe}>
        {lien.label}
        <Icon name="arrow" className="size-4" />
      </Link>
    );
  }
  return (
    <a href={lien.href} target="_blank" rel="noopener noreferrer" className={classe}>
      {lien.label}
      <Icon name="external" className="size-4" />
    </a>
  );
}

function Portrait({ membre, rang }) {
  // Photo introuvable (version hors ligne, fichier absent) : les initiales.
  const [echec, setEchec] = useState(false);
  const photo = membre.photo && !echec;
  return (
    <figure className="m-0">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-[20px] text-white"
        style={{ background: FONDS_PORTRAIT[rang % FONDS_PORTRAIT.length] }}
      >
        {photo ? (
          <>
            <img src={membre.photo} alt="" loading="lazy" className="size-full object-cover" onError={() => setEchec(true)} />
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
          </>
        ) : (
          <>
            <span className={cx("absolute top-3 left-3 rounded-full bg-white/12 px-2.5 py-1 text-[10px]", mono)}>PHOTO À VENIR</span>
            {/* Décor : écrit par CSS, pour ne pas être lu ni compté comme texte. */}
            <span
              aria-hidden="true"
              data-i={initiales(membre.nom)}
              className="absolute top-7 -right-1.5 text-8xl leading-none font-extrabold tracking-[-0.06em] text-white/11 before:content-[attr(data-i)]"
            />
          </>
        )}
        <figcaption className="absolute inset-x-3.5 bottom-3.5 text-[19px]/tight font-bold tracking-tight">{membre.nom}</figcaption>
      </div>
      <p className="mx-0.5 mt-2.5 text-[13.5px]/snug text-ink-500 dark:text-ink-400">{membre.role}</p>
    </figure>
  );
}

/* Les hébergeurs regroupés par pays : « San Francisco, États-Unis ». */
function parPays(hebergeurs) {
  const pays = new Map();
  for (const h of hebergeurs) {
    const [ville, nomPays = ville] = h.lieu.split(/,\s*/);
    if (!pays.has(nomPays)) pays.set(nomPays, []);
    pays.get(nomPays).push({ ...h, ville });
  }
  return [...pays];
}

function Paragraphe({ contenu, article, chapeau }) {
  if (typeof contenu === "string") {
    return chapeau ? (
      <p className="text-[19px]/[1.6] font-medium text-ink-900 dark:text-white">{contenu}</p>
    ) : (
      <p className="text-[16.5px]/7 text-ink-600 dark:text-ink-300">{contenu}</p>
    );
  }
  if (contenu.liste) {
    return (
      <dl className="my-2.5 border-t border-ink-100 dark:border-ink-800">
        {contenu.liste.map(([terme, explication], k) => (
          <div key={terme} className="relative border-b border-ink-100 py-4.5 pl-14.5 dark:border-ink-800">
            {/* Le numéro 1.1 est posé par CSS : une ligne de <dl> ne contient que <dt> et <dd>. */}
            <dt
              data-n={`${article + 1}.${k + 1}`}
              className={cx(
                "text-base font-extrabold text-ink-950 dark:text-white",
                "before:absolute before:top-5 before:left-0 before:font-mono before:text-[12.5px] before:font-bold before:tracking-[0.06em] before:text-brand-600 before:content-[attr(data-n)] dark:before:text-brand-400"
              )}
            >
              {terme}
            </dt>
            <dd className="m-0 mt-1 text-[15.5px]/7 text-ink-600 dark:text-ink-300">{explication}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (contenu.hebergeurs) {
    return (
      <div className="flex flex-wrap gap-3.5">
        {parPays(contenu.hebergeurs).map(([pays, liste]) => (
          <div key={pays} className="min-w-0 flex-[1_1_min(280px,100%)] rounded-[22px] border border-ink-200 bg-ink-50 px-5 pt-1.5 pb-2 dark:border-ink-800 dark:bg-ink-950/60">
            <div className="flex items-baseline justify-between border-b-2 border-ink-950 pt-3.5 pb-3 dark:border-white">
              <span className="text-[22px] font-extrabold tracking-tight text-ink-950 dark:text-white">{pays}</span>
              <span className={cx("text-[11.5px] text-ink-500 dark:text-ink-400", mono)}>
                {liste.length} service{liste.length > 1 ? "s" : ""}
              </span>
            </div>
            {liste.map((h) => (
              <div key={h.nom} className="border-b border-ink-200 py-3.5 last:border-b-0 dark:border-ink-800">
                <b className="block text-[17px] text-ink-950 dark:text-white">{h.nom}</b>
                <span className="block text-[14.5px] text-ink-600 dark:text-ink-300">{h.role}</span>
                <small className="mt-1.5 block font-mono text-[11.5px] text-brand-700 dark:text-brand-300">
                  {h.service.replace(/^Service de\s+/, "")} · {h.ville}
                </small>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (contenu.equipe) {
    return (
      <div>
        <p className={cx("mt-7 mb-3.5 text-[11.5px] font-bold text-ink-500 dark:text-ink-400", mono)}>L&apos;ÉQUIPE</p>
        <ul className="grid grid-cols-2 gap-3.5">
          {contenu.equipe.map((m, k) => (
            <li key={m.nom}>
              <Portrait membre={m} rang={k} />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (contenu.note) {
    return (
      <aside className="my-3 rounded-[20px] bg-ink-950 px-6 py-5.5 text-white dark:bg-ink-800">
        <span className={cx("text-[11.5px] font-bold text-lime-400", mono)}>À RETENIR</span>
        <p className="mt-2 text-base/7 text-ink-100">{contenu.note}</p>
      </aside>
    );
  }
  return null;
}

/* Le sommaire suit la lecture : l'article le plus haut à l'écran est
   surligné. */
function useArticleVisible(nombre) {
  const [actif, setActif] = useState(0);
  useEffect(() => {
    const sections = Array.from({ length: nombre }, (_, i) => document.getElementById(ancre(i))).filter(Boolean);
    if (!sections.length || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      (entrees) => {
        const visibles = entrees.filter((e) => e.isIntersecting).map((e) => sections.indexOf(e.target));
        if (visibles.length) setActif(Math.min(...visibles));
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [nombre]);
  return actif;
}

/* ---- Les trois cartes de l'en-tête ---- */

/* Mentions légales : la fiche d'identité du site. */
export function FicheIdentite({ lignes, equipe = [] }) {
  return (
    <div className={cx(carteVisuel, "p-7.5")}>
      <div className={cx("flex justify-between gap-2.5 border-b border-dashed border-ink-200 pb-4.5 text-[11.5px] text-ink-500 dark:border-ink-700 dark:text-ink-400", mono)}>
        <span>FICHE D&apos;IDENTITÉ DU SITE</span>
        <span className="text-brand-600 dark:text-brand-400">
          {sigle}
          {sigle && " · "}
          {site.annee}
        </span>
      </div>
      <p className="mt-5.5 text-[44px] leading-none font-extrabold tracking-[-0.04em]">{site.nom}</p>
      <p className="mt-2 mb-4.5 text-[14.5px]/normal text-ink-500 dark:text-ink-400">Plateforme de révision de la {filiereLongue}.</p>
      <dl className="m-0">
        {lignes.map((l) => (
          <div key={l.label} className="flex justify-between gap-4 border-t border-ink-100 py-2.75 text-[14.5px] dark:border-ink-800">
            <dt className="font-semibold text-ink-500 dark:text-ink-400">{l.label}</dt>
            <dd className="m-0 text-right font-extrabold break-words">{l.valeur}</dd>
          </div>
        ))}
      </dl>
      {equipe.length > 0 && (
        <div className="mt-4.5 flex items-center gap-3.5 border-t border-dashed border-ink-200 pt-4.5 text-sm font-bold text-ink-600 dark:border-ink-700 dark:text-ink-300">
          <div className="flex" aria-hidden="true">
            {equipe.map((m, k) => (
              <span
                key={m.nom}
                className={cx(
                  "-ml-2.25 grid size-9.5 place-items-center rounded-full border-3 border-white text-[13px] font-extrabold first:ml-0 dark:border-ink-900",
                  PASTILLES[k % PASTILLES.length]
                )}
              >
                {initiales(m.nom)}
              </span>
            ))}
          </div>
          <span>
            L&apos;équipe · {equipe.length} membre{equipe.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}

/* Confidentialité : une étiquette, à la manière des valeurs nutritives. */
export function EtiquetteDonnees({ nonFait, garde, pied }) {
  const ligne = "flex justify-between gap-4 border-b border-ink-300 py-2 text-[15px] dark:border-ink-700";
  const rubrique = cx("border-b border-ink-950 pt-1 pb-1.5 text-[11px] font-bold dark:border-white", mono);
  return (
    <div className={cx(carteVisuel, "border-3 border-ink-950 px-6 py-5.5 dark:border-white")}>
      <p className="text-[40px] leading-none font-extrabold tracking-[-0.035em]">Étiquette données</p>
      <p className="mt-1.5 text-sm font-semibold text-ink-600 dark:text-ink-300">Ce que {site.nom} fait de tes informations</p>
      <div className="mt-3.5 mb-2.5 h-3 bg-ink-950 dark:bg-white" aria-hidden="true" />
      <p className={rubrique}>CE QUE LA PLATEFORME NE FAIT PAS</p>
      <dl className="m-0">
        {nonFait.map(([quoi, valeur]) => (
          <div key={quoi} className={ligne}>
            <dt>{quoi}</dt>
            <dd className="m-0 text-right font-extrabold">{valeur}</dd>
          </div>
        ))}
      </dl>
      <div className="my-2.5 h-1.25 bg-ink-950 dark:bg-white" aria-hidden="true" />
      <p className={rubrique}>CE QU&apos;ELLE GARDE</p>
      <dl className="m-0">
        {garde.map(([quoi, valeur]) => (
          <div key={quoi} className={ligne}>
            <dt>{quoi}</dt>
            <dd className="m-0 text-right font-extrabold">{valeur}</dd>
          </div>
        ))}
      </dl>
      <div className="my-2.5 h-1.25 bg-ink-950 dark:bg-white" aria-hidden="true" />
      {pied && <p className="mt-2 text-[12.5px]/normal text-ink-600 dark:text-ink-300">{pied}</p>}
    </div>
  );
}

/* Conditions : ce qui est permis, ce qui est interdit. */
export function PermisInterdit({ permis, interdit }) {
  const puce = "grid size-6 shrink-0 place-items-center rounded-lg";
  const element = "flex items-start gap-3 text-[15.5px]/snug font-semibold";
  return (
    <div className={cx(carteVisuel, "overflow-hidden")}>
      <div className="px-7 py-6.5">
        <p className={cx("mb-3 text-[11.5px] font-bold text-brand-700 dark:text-brand-300", mono)}>CE QUE TU PEUX FAIRE</p>
        <ul className="flex flex-col gap-3">
          {permis.map((p) => (
            <li key={p} className={element}>
              <span className={cx(puce, "bg-lime-400 text-ink-950")} aria-hidden="true">
                <Icon name="check" className="size-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[#f1dfd6] bg-[#fbf3ef] px-7 py-6.5 dark:border-ink-800 dark:bg-[#2a1810]">
        <p className={cx("mb-3 text-[11.5px] font-bold text-[#a33a12] dark:text-[#ff8a63]", mono)}>CE QUI EST INTERDIT</p>
        <ul className="flex flex-col gap-3">
          {interdit.map((p) => (
            <li key={p} className={element}>
              <span className={cx(puce, "bg-[#ff5a2b] text-white")} aria-hidden="true">
                <Icon name="close" className="size-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PageJuridique({ surtitre, titre, texte, articles, visuel }) {
  const actif = useArticleVisible(articles.length);
  const total = numero(articles.length - 1);

  return (
    <>
      {/* ---- En-tête sombre ---- */}
      <header
        className="bg-[#0b0e17] text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgb(255 255 255/0.035) 1px,transparent 1px),linear-gradient(90deg,rgb(255 255 255/0.035) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      >
        <Container>
          <nav aria-label="Fil d'Ariane" className={cx("flex flex-wrap gap-2.5 pt-10 text-xs text-ink-400 sm:pt-14", mono)}>
            <Link to="/" className="hover:text-white">
              ACCUEIL
            </Link>
            <span aria-hidden="true">/</span>
            <span>{surtitre.toUpperCase()}</span>
            <span aria-hidden="true">/</span>
            <b className="font-medium text-lime-400" aria-current="page">
              {titre.toUpperCase()}
            </b>
          </nav>
          <TitreGeant titre={titre} />

          <div className="mt-11 flex flex-wrap items-start justify-between gap-12">
            <div className={cx("min-w-0 flex-[1_1_min(420px,100%)]", visuel ? "pb-6 lg:pb-16" : "pb-16")}>
              <p className="max-w-[500px] text-[21px]/normal text-ink-200">{texte}</p>
              <ul className="mt-7 flex flex-wrap gap-2.5">
                {[
                  { icone: "clock", texte: `Mis à jour le ${site.pagesJuridiquesMisesAJour}` },
                  { icone: "file", texte: `${articles.length} article${articles.length > 1 ? "s" : ""}` },
                  { icone: "graduation", texte: `Projet étudiant${sigle ? ` · ${sigle}` : ""}` },
                ].map((c) => (
                  <li key={c.icone} className="inline-flex items-center gap-2 rounded-full border border-white/14 px-3.5 py-2 text-[13.5px] font-semibold text-ink-100">
                    <Icon name={c.icone} className="size-4 text-lime-400" />
                    {c.texte}
                  </li>
                ))}
              </ul>
              <nav
                aria-label="Pages juridiques"
                className="mt-9 flex w-fit max-w-full flex-wrap gap-1 rounded-2xl border border-white/12 bg-white/4 p-1.25"
              >
                {PAGES.map((p, i) => (
                  <NavLink
                    key={p.to}
                    to={p.to}
                    className={({ isActive }) =>
                      cx(
                        "inline-flex min-h-11.5 items-center gap-2.5 rounded-xl px-4 text-[14.5px] font-bold transition-colors",
                        isActive ? "bg-lime-400 text-ink-950" : "text-ink-300 hover:bg-white/7 hover:text-white"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span aria-hidden="true" className={cx("text-[11.5px]", mono, isActive ? "text-[#3a4a00]" : "text-ink-400")}>
                          {numero(i)}
                        </span>
                        {p.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
            {visuel && <div className="relative z-10 -mb-15 min-w-0 flex-[0_1_min(470px,100%)] lg:-mb-24">{visuel}</div>}
          </div>
        </Container>
      </header>

      <Container>
        <div className={cx("flex flex-col gap-10 pb-20 lg:flex-row lg:items-start lg:gap-14", visuel ? "pt-25 lg:pt-37.5" : "pt-12")}>
          {/* ---- Sommaire ---- */}
          <aside className="min-w-0 lg:sticky lg:top-24 lg:w-65 lg:shrink-0">
            <p className={cx("text-[11.5px] font-bold text-ink-500 dark:text-ink-400", mono)}>SOMMAIRE</p>
            <div className="mt-3 mb-4.5 flex items-center gap-3 text-xs font-bold text-brand-600 dark:text-brand-400" aria-hidden="true">
              <span className={mono}>
                {numero(actif)} / {total}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded bg-ink-200 dark:bg-ink-800">
                <i
                  className="block h-full rounded bg-brand-600 transition-[width] duration-300 dark:bg-brand-400"
                  style={{ width: `${((actif + 1) / articles.length) * 100}%` }}
                />
              </span>
            </div>
            <nav aria-label="Sommaire">
              <ol>
                {articles.map((a, i) => (
                  <li key={a.titre}>
                    <a
                      href={`#${ancre(i)}`}
                      onClick={(e) => {
                        // Les adresses du site sont à dièse : on fait défiler au lieu de changer d'adresse.
                        e.preventDefault();
                        document.getElementById(ancre(i))?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      aria-current={actif === i ? "true" : undefined}
                      className={cx(
                        "flex items-baseline gap-3.5 rounded-xl px-3 py-2.5 text-[14.5px]/snug font-semibold transition-colors",
                        actif === i
                          ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950"
                          : "text-ink-600 hover:bg-ink-100 hover:text-ink-950 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx("font-mono text-[11.5px]", actif === i ? "text-lime-400 dark:text-brand-600" : "text-ink-500 dark:text-ink-400")}
                      >
                        {numero(i)}
                      </span>
                      {a.titre}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-5.5 rounded-[20px] border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-950">
              <p className="text-[15.5px] font-bold text-ink-950 dark:text-white">Une question sur ce texte ?</p>
              <p className="mt-1 mb-3 text-sm/normal text-ink-500 dark:text-ink-400">Écris à l&apos;adresse de contact du projet.</p>
              <a
                href={`mailto:${site.contact}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-extrabold break-all text-brand-600 hover:text-brand-700 dark:text-brand-400"
              >
                <Icon name="external" className="size-4 shrink-0" />
                {site.contact}
              </a>
            </div>
          </aside>

          {/* ---- Articles ---- */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {articles.map((a, i) => (
              <section
                key={a.titre}
                id={ancre(i)}
                className="flex scroll-mt-24 flex-wrap gap-x-10 gap-y-3 rounded-[24px] border border-ink-200 bg-white px-5.5 py-7 sm:rounded-[30px] sm:px-12 sm:py-11 dark:border-ink-800 dark:bg-ink-950"
              >
                <p
                  aria-hidden="true"
                  className="basis-full text-[64px] leading-[0.82] font-extrabold tracking-[-0.06em] text-transparent [-webkit-text-stroke:1.6px_var(--color-brand-600)] sm:basis-27 sm:text-[92px] dark:[-webkit-text-stroke-color:var(--color-brand-400)]"
                >
                  {numero(i)}
                </p>
                <div className="min-w-0 flex-[1_1_min(420px,100%)]">
                  <p className={cx("flex items-center gap-2.5 text-[11.5px] font-bold text-ink-500 dark:text-ink-400", mono)}>
                    <span className="grid size-7.5 place-items-center rounded-[9px] bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" aria-hidden="true">
                      <Icon name={a.icone} className="size-4" />
                    </span>
                    ARTICLE {numero(i)} / {total}
                  </p>
                  <h2 className="mt-3.5 mb-5 text-[27px] leading-[1.1] font-extrabold tracking-[-0.035em] text-ink-950 sm:text-[34px] dark:text-white">
                    {a.titre}
                  </h2>
                  <div className="space-y-3.5">
                    {a.paragraphes.map((p, k) => (
                      <Paragraphe key={k} contenu={p} article={i} chapeau={k === 0} />
                    ))}
                  </div>
                  {a.liens && (
                    <div className="mt-4 flex flex-wrap gap-2.5">
                      {a.liens.map((l) => (
                        <Lien key={l.label} lien={l} />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* ---- Contact ---- */}
        <section className="mb-18 flex flex-wrap items-end justify-between gap-9 rounded-[28px] bg-lime-400 px-6 py-8 sm:rounded-[36px] sm:p-14">
          <div>
            <h2 className="mb-4 max-w-[560px] text-[clamp(2.25rem,5vw,4rem)] leading-[0.98] font-extrabold tracking-[-0.045em] text-ink-950">
              Une question, une demande ?
            </h2>
            <p className="max-w-[560px] text-[17px] text-[#2a3310]">
              Pour une question sur ces règles ou sur tes données, signaler une erreur, demander le retrait
              d&apos;une ressource ou proposer une contribution, écris à l&apos;adresse de contact du projet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={`mailto:${site.contact}`}
              className="inline-flex min-h-13.5 items-center gap-2.5 rounded-[14px] bg-ink-950 px-5.5 text-[15.5px] font-extrabold text-white transition-colors hover:bg-brand-600"
            >
              <Icon name="external" className="size-4" />
              {site.contact}
            </a>
            <Link
              to="/projet"
              className="inline-flex min-h-13.5 items-center gap-2.5 rounded-[14px] border-2 border-ink-950 px-5.5 text-[15.5px] font-extrabold text-ink-950 transition-colors hover:bg-white/40"
            >
              La démarche du projet
              <Icon name="arrow" className="size-4" />
            </Link>
          </div>
        </section>
      </Container>
    </>
  );
}
