import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import {
  Badge,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
} from "../components/ui";
import { ressources } from "../data/bibliotheque";
import { urlPdf } from "../contenu";
import { matieres, nomMatiere } from "../data/matieres";

export default function Bibliotheque() {
  const [matiere, setMatiere] = useState("toutes");

  const options = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres
      .filter((m) => ressources.some((r) => r.matiere === m.id))
      .map((m) => ({ value: m.id, label: m.nom })),
  ];

  // Seules les ressources dont la diffusion est autorisée s'affichent.
  const libres = useMemo(
    () => ressources.filter((r) => r.statut === "libre" && (matiere === "toutes" || r.matiere === matiere)),
    [matiere]
  );

  return (
    <>
      <EnTetePage
        surtitre="Documents"
        titre="Bibliothèque"
        texte="Uniquement des ressources dont la diffusion est autorisée par leurs auteurs. Un document de l'université ou d'un enseignant n'est mis à disposition qu'avec son accord écrit."
      />

      <Container className="py-10">
        <div>
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
                <li key={r.id ?? r.titre}>
                  <a
                    href={r.url || (r.pdf ? urlPdf(r.pdf.id) : undefined)}
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
                      {r.url ? "Consulter sur le site de l'auteur" : "Ouvrir le PDF"}
                      <Icon name={r.url ? "external" : "file"} className="size-3.5" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

      </Container>
    </>
  );
}
