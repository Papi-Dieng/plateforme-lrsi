import Icon from "../components/Icon";
import {
  Badge,
  Bouton,
  Container,
  EnTetePage,
  TitreSection,
} from "../components/ui";
import { cx } from "../components/classes";
import {
  engagements,
  feuilleDeRoute,
  principesSecurite,
  roles,
  site,
} from "../data/site";

const etatsRoute = {
  "en-cours": { ton: "accent", label: "En cours" },
  prevu: { ton: "brand", label: "Prévu" },
  vision: { ton: "neutre", label: "Vision" },
};

const pile = [
  { element: "Interface", techno: "React et Tailwind CSS", etat: "en place" },
  { element: "Routage", techno: "React Router", etat: "en place" },
  { element: "Contenu", techno: "Fichiers de données JavaScript", etat: "en place" },
  { element: "Serveur et API", techno: "Node.js et Express", etat: "version 2" },
  { element: "Base de données", techno: "MongoDB ou PostgreSQL", etat: "version 2" },
  { element: "Authentification", techno: "Sessions ou jetons signés", etat: "version 3" },
  { element: "Assistant IA", techno: "API d'un modèle de langage", etat: "version 4" },
];

const usagesIA = [
  {
    icone: "sparkles",
    titre: "Assistant de révision",
    texte:
      "Poser une question sur une notion du cours et recevoir une explication adaptée à son niveau.",
  },
  {
    icone: "code",
    titre: "Génération d'exercices",
    texte:
      "Produire des exercices sur une matière précise, avec plusieurs niveaux de difficulté.",
  },
  {
    icone: "bulb",
    titre: "Explication des erreurs",
    texte:
      "Après un QCM, revenir sur les erreurs et clarifier le concept mal compris.",
  },
  {
    icone: "target",
    titre: "Accompagnement personnalisé",
    texte:
      "S'adapter aux difficultés repérées dans les exercices, sans remplacer le rôle des enseignants.",
  },
];

export default function Projet() {
  return (
    <>
      <EnTetePage
        surtitre="Le projet"
        titre="Une plateforme construite dans un cadre clair"
        texte={`${site.nom} est un projet étudiant, gratuit et sans objectif commercial. Il sert à la fois à faciliter les révisions de la filière et à mettre en pratique des compétences en développement web, réseaux et cybersécurité.`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge ton="brand" icone="graduation">
            {site.filiere}
          </Badge>
          <Badge ton="accent" icone="check">
            Gratuit et non commercial
          </Badge>
          <Badge ton="sun">{site.version}</Badge>
        </div>
      </EnTetePage>

      <Container className="py-12">
        <div className="space-y-16">
          {/* ------------------------------------------------ */}
          {/* Autorisations                                     */}
          {/* ------------------------------------------------ */}
          <section>
            <TitreSection
              surtitre="Autorisations"
              titre="Rien n'est publié sans accord"
              texte="Avant de publier des ressources liées à l'université, l'accord du département et des enseignants concernés sera demandé. Si les autorisations ne sont pas accordées, les ressources concernées ne seront pas mises en ligne."
            />

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {engagements.map((e) => (
                <li key={e} className="card flex gap-3 p-4">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent-500/15 text-accent-600 dark:text-accent-400">
                    <Icon name="check" className="size-3" />
                  </span>
                  <span className="text-sm/6 text-ink-700 dark:text-ink-300">
                    {e}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------ */}
          {/* Feuille de route                                  */}
          {/* ------------------------------------------------ */}
          <section>
            <TitreSection
              surtitre="Développement par étapes"
              titre="Cinq versions, une seule à la fois"
              texte="Chaque version n'ajoute une couche qu'une fois la précédente stable. C'est ce qui évite de construire un projet trop complexe dès le départ."
            />

            <ol className="mt-8 space-y-4">
              {feuilleDeRoute.map((v, i) => {
                const etat = etatsRoute[v.etat];
                const actif = v.etat === "en-cours";
                return (
                  <li
                    key={v.version}
                    className={cx(
                      "relative flex gap-5 rounded-2xl border p-5 sm:p-6",
                      actif
                        ? "border-accent-500/40 bg-accent-50/50 dark:border-accent-500/30 dark:bg-accent-500/10"
                        : "border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900"
                    )}
                  >
                    <span
                      className={cx(
                        "grid size-10 shrink-0 place-items-center rounded-xl font-mono text-sm font-bold",
                        actif
                          ? "bg-accent-500 text-white"
                          : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
                      )}
                    >
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
                          {v.version}
                        </span>
                        <Badge ton={etat.ton}>{etat.label}</Badge>
                      </div>
                      <h3 className="mt-1 text-lg font-semibold text-ink-900 dark:text-white">
                        {v.titre}
                      </h3>
                      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                        {v.points.map((p) => (
                          <li
                            key={p}
                            className="flex gap-2 text-sm/6 text-ink-600 dark:text-ink-400"
                          >
                            <Icon
                              name="check"
                              className="mt-1 size-3.5 shrink-0 text-ink-400"
                            />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ------------------------------------------------ */}
          {/* Rôles                                             */}
          {/* ------------------------------------------------ */}
          <section>
            <TitreSection
              surtitre="Comptes et accès"
              titre="Trois rôles envisagés"
              texte="Cette répartition est une proposition de conception. Elle ne signifie pas que les enseignants ou le département auront automatiquement accès à la plateforme."
            />

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {roles.map((r) => (
                <div key={r.nom} className="card p-6">
                  <div className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon name={r.icone} className="size-5" />
                  </div>
                  <h3 className="mt-4 font-semibold text-ink-900 dark:text-white">
                    {r.nom}
                  </h3>
                  <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
                    {r.texte}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-5 max-w-3xl text-sm/6 text-ink-500 dark:text-ink-400">
              L'identification pourrait s'appuyer sur le matricule étudiant et le
              niveau, mais le fonctionnement exact devra être défini avec le
              département et respecter les règles de protection des données.
            </p>
          </section>

          {/* ------------------------------------------------ */}
          {/* Sécurité                                          */}
          {/* ------------------------------------------------ */}
          <section className="rounded-3xl border border-ink-200 bg-white p-6 sm:p-10 dark:border-ink-800 dark:bg-ink-900">
            <TitreSection
              surtitre="Sécurité"
              titre="La sécurité fait partie de la conception"
              texte="L'objectif n'est pas un site qui affiche des documents, mais une plateforme qui applique de bonnes pratiques dès le départ."
            />

            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {principesSecurite.map((p) => (
                <div
                  key={p.titre}
                  className="rounded-2xl border border-ink-200 bg-ink-50 p-5 dark:border-ink-800 dark:bg-ink-950"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      name="lock"
                      className="size-4.5 text-brand-600 dark:text-brand-400"
                    />
                    <h3 className="font-semibold text-ink-900 dark:text-white">
                      {p.titre}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-400">
                    {p.texte}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* IA                                                */}
          {/* ------------------------------------------------ */}
          <section>
            <TitreSection
              surtitre="Version 4"
              titre="L'intelligence artificielle, plus tard et avec des limites"
              texte="L'IA n'arrivera qu'une fois la base fonctionnelle. Elle ne doit ni inventer d'informations pédagogiques, ni donner accès à des documents non autorisés."
            />

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {usagesIA.map((u) => (
                <div key={u.titre} className="card flex gap-4 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-600 dark:bg-sun-500/15 dark:text-sun-400">
                    <Icon name={u.icone} className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-white">
                      {u.titre}
                    </h3>
                    <p className="mt-1.5 text-sm/6 text-ink-600 dark:text-ink-400">
                      {u.texte}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Pile technique                                    */}
          {/* ------------------------------------------------ */}
          <section>
            <TitreSection
              surtitre="Technique"
              titre="Organisation technique"
              texte="La pile reste modifiable. Ce tableau décrit ce qui est en place aujourd'hui et ce qui est prévu."
            />

            <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Élément
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Technologie
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-200 bg-white dark:divide-ink-800 dark:bg-ink-900">
                  {pile.map((p) => (
                    <tr key={p.element}>
                      <td className="px-5 py-3.5 font-medium text-ink-900 dark:text-white">
                        {p.element}
                      </td>
                      <td className="px-5 py-3.5 text-ink-600 dark:text-ink-400">
                        {p.techno}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge ton={p.etat === "en place" ? "accent" : "neutre"}>
                          {p.etat}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Vision                                            */}
          {/* ------------------------------------------------ */}
          <section className="rounded-3xl bg-brand-700 p-8 sm:p-12 dark:bg-brand-800">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold tracking-wide text-brand-200 uppercase">
                Vision à long terme
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-balance text-white sm:text-3xl">
                Au-delà de la filière LRSI
              </h2>
              <p className="mt-4 text-base/7 text-brand-100">
                À terme, la plateforme pourrait devenir un espace de ressources
                pour différentes formations informatiques au Sénégal, puis dans
                d'autres pays africains. Cela passerait par des partenariats avec
                d'autres établissements, la collaboration avec des enseignants et
                des étudiants, et l'ajout de nouvelles filières.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Bouton
                  href={`mailto:${site.contact}`}
                  className="bg-white text-brand-700 hover:bg-brand-50 dark:bg-white dark:text-brand-700"
                >
                  Proposer une contribution
                  <Icon name="arrow" className="size-4" />
                </Bouton>
                <Bouton
                  to="/cours"
                  className="bg-brand-600/60 text-white ring-1 ring-white/25 ring-inset hover:bg-brand-600 dark:bg-brand-700/60"
                >
                  Découvrir les ressources
                </Bouton>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Note sur le nom                                   */}
          {/* ------------------------------------------------ */}
          <section className="card flex gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ink-100 text-ink-500 dark:bg-ink-800">
              <Icon name="bulb" className="size-5" />
            </span>
            <p className="text-sm/6 text-ink-600 dark:text-ink-400">
              <span className="font-semibold text-ink-900 dark:text-white">
                Le nom n'est pas définitif.
              </span>{" "}
              {site.origineNom}
            </p>
          </section>
        </div>
      </Container>
    </>
  );
}
