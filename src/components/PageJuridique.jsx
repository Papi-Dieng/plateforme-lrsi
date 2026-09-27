import { Link, NavLink } from "react-router-dom";
import Icon from "./Icon";
import { Badge, Container, EnTetePage } from "./ui";
import { cx } from "./classes";
import { site } from "../data/site";

/* ==================================================================
   Mise en page commune aux pages juridiques : conditions
   d'utilisation, politique de confidentialité, mentions légales.

   Chaque page fournit ses articles :
     { icone, titre, paragraphes, liens? }
   où un paragraphe est un texte, ou { liste: [[terme, explication], …] }
   pour une liste de définitions ; `liens` : [{ to | href, label }].

   Les trois pages se renvoient l'une à l'autre par les onglets du
   haut, et portent la date de leur dernière mise à jour
   (`site.pagesJuridiquesMisesAJour`).
   ================================================================== */

const PAGES = [
  { to: "/conditions", label: "Conditions d'utilisation" },
  { to: "/confidentialite", label: "Confidentialité" },
  { to: "/mentions-legales", label: "Mentions légales" },
];

const classeLien = "text-sm font-medium text-brand-600 hover:underline dark:text-brand-400";

function Lien({ lien }) {
  if (lien.to) {
    return (
      <Link to={lien.to} className={classeLien}>
        {lien.label}
      </Link>
    );
  }
  return (
    <a href={lien.href} target="_blank" rel="noopener noreferrer" className={classeLien}>
      {lien.label} ↗
    </a>
  );
}

function Paragraphe({ contenu }) {
  if (typeof contenu === "string") {
    return <p className="text-sm/7 text-ink-600 dark:text-ink-400">{contenu}</p>;
  }
  return (
    <dl className="space-y-3 rounded-xl bg-ink-50 p-4 dark:bg-ink-950/60">
      {contenu.liste.map(([terme, explication]) => (
        <div key={terme}>
          <dt className="text-sm font-semibold text-ink-900 dark:text-white">{terme}</dt>
          <dd className="mt-0.5 text-sm/6 text-ink-600 dark:text-ink-400">{explication}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function PageJuridique({ surtitre, titre, texte, articles }) {
  return (
    <>
      <EnTetePage surtitre={surtitre} titre={titre} texte={texte}>
        <Badge ton="accent" icone="check">
          Mise à jour le {site.pagesJuridiquesMisesAJour}
        </Badge>
      </EnTetePage>

      <Container className="py-10">
        <nav aria-label="Pages juridiques" className="mb-6 flex max-w-3xl flex-wrap gap-2">
          {PAGES.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              className={({ isActive }) =>
                cx(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-ink-900 text-white dark:bg-white dark:text-ink-950"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                )
              }
            >
              {p.label}
            </NavLink>
          ))}
        </nav>

        <div className="max-w-3xl space-y-5">
          {articles.map((a, i) => (
            <section key={a.titre} className="card p-6 sm:p-7">
              <h2 className="flex items-center gap-3 text-lg font-semibold text-ink-900 dark:text-white">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                  <Icon name={a.icone} className="size-4.5" />
                </span>
                <span>
                  <span className="mr-2 font-mono text-sm text-ink-500 dark:text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                  {a.titre}
                </span>
              </h2>
              <div className="mt-4 space-y-3">
                {a.paragraphes.map((p, k) => (
                  <Paragraphe key={k} contenu={p} />
                ))}
              </div>
              {a.liens && (
                <div className="mt-4 flex flex-wrap gap-4">
                  {a.liens.map((l) => (
                    <Lien key={l.label} lien={l} />
                  ))}
                </div>
              )}
            </section>
          ))}

          <section className="card p-6 sm:p-7">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-white">Une question, une demande ?</h2>
            <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
              Pour une question sur ces règles ou sur tes données, signaler une erreur, demander le
              retrait d&apos;une ressource ou proposer une contribution, écris à l&apos;adresse de
              contact du projet.
            </p>
            <div className="mt-5 flex flex-wrap gap-4">
              <a href={`mailto:${site.contact}`} className={classeLien}>
                {site.contact}
              </a>
              <Link to="/projet" className={classeLien}>
                La démarche du projet
              </Link>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
