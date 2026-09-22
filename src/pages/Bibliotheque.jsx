import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import {
  Badge,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  cx,
} from "../components/ui";
import { ressources } from "../data/bibliotheque";
import { matieres, nomMatiere } from "../data/matieres";

export default function Bibliotheque() {
  const [matiere, setMatiere] = useState("toutes");

  const options = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres
      .filter((m) => ressources.some((r) => r.matiere === m.id))
      .map((m) => ({ value: m.id, label: m.nom })),
  ];

  const { libres, attente } = useMemo(() => {
    const filtrees = ressources.filter(
      (r) => matiere === "toutes" || r.matiere === matiere
    );
    return {
      libres: filtrees.filter((r) => r.statut === "libre"),
      attente: filtrees.filter((r) => r.statut === "attente"),
    };
  }, [matiere]);

  return (
    <>
      <EnTetePage
        surtitre="Documents"
        titre="Bibliothèque"
        texte="Uniquement des ressources dont la diffusion est autorisée par leurs auteurs. Les documents appartenant à l'université ou aux enseignants n'apparaissent ici qu'à titre de projet, sans être hébergés."
      />

      <Container className="py-10">
        {/* Règle de publication */}
        <div className="card flex gap-4 p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300">
            <Icon name="shield" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-ink-900 dark:text-white">
              Règle de publication
            </h2>
            <p className="mt-1.5 text-sm/6 text-ink-600 dark:text-ink-400">
              Un document n'est publié que si sa licence l'autorise
              explicitement, ou si son auteur a donné son accord. Les liens
              ci-dessous pointent vers les sites officiels des auteurs : rien
              n'est recopié ni réhébergé.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Filtres
            label="Filtrer par matière"
            options={options}
            actif={matiere}
            onChange={setMatiere}
          />
        </div>

        {/* Ressources en accès libre */}
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
            <Icon name="book" className="size-5 text-brand-600 dark:text-brand-400" />
            Ressources en accès libre
            <Badge ton="accent">{libres.length}</Badge>
          </h2>

          {libres.length === 0 ? (
            <div className="mt-4">
              <EtatVide
                titre="Aucune ressource libre pour cette matière"
                texte="D'autres références seront ajoutées progressivement."
              />
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {libres.map((r) => (
                <li key={r.titre}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card group flex h-full flex-col p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton="brand">{r.type}</Badge>
                      <Badge>{nomMatiere(r.matiere)}</Badge>
                      <Badge ton="accent" icone="check">
                        {r.licence}
                      </Badge>
                    </div>

                    <h3 className="mt-3 font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300">
                      {r.titre}
                    </h3>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                      {r.auteurs} · {r.langue}
                    </p>
                    <p className="mt-2.5 flex-1 text-sm/6 text-ink-600 dark:text-ink-400">
                      {r.note}
                    </p>

                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400">
                      Consulter sur le site de l'auteur
                      <Icon name="external" className="size-3.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Ressources en attente d'autorisation */}
        {attente.length > 0 && (
          <section className="mt-12">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
              <Icon name="lock" className="size-5 text-ink-400" />
              En attente d'autorisation
              <Badge ton="sun">{attente.length}</Badge>
            </h2>
            <p className="mt-2 max-w-2xl text-sm/6 text-ink-600 dark:text-ink-400">
              Ces ressources ne sont pas hébergées et ne le seront qu'après un
              accord écrit. Elles figurent ici pour montrer la structure prévue
              et rester transparent sur la démarche.
            </p>

            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              {attente.map((r) => (
                <li
                  key={r.titre}
                  className={cx(
                    "rounded-2xl border border-dashed border-ink-300 bg-ink-100/40 p-5",
                    "dark:border-ink-700 dark:bg-ink-900/60"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{r.type}</Badge>
                    <Icon name="lock" className="size-4 text-ink-400" />
                  </div>
                  <h3 className="mt-3 font-semibold text-ink-700 dark:text-ink-200">
                    {r.titre}
                  </h3>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    {r.auteurs}
                  </p>
                  <p className="mt-2.5 text-sm/6 text-ink-600 dark:text-ink-400">
                    {r.note}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </>
  );
}
