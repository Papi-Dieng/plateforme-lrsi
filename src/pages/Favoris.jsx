import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  Badge,
  Bouton,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  NoteDemo,
  cx,
} from "../components/ui";
import {
  dateLisible,
  lireFavoris,
  lireVideos,
  litRefChapitre,
  retirerFavori,
} from "../progression";
import { getMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { getExercice } from "../data/exercices";
import { getQcm } from "../data/qcm";
import { videosSuggerees } from "../data/videos";

/* ==================================================================
   Mes favoris.

   Un favori ne conserve qu'un type et une référence. La page résout
   chaque référence au moment de l'affichage : si un contenu a été
   supprimé ou renommé depuis, le favori est signalé comme introuvable
   plutôt que de faire disparaître la ligne sans explication.
   ================================================================== */

const libellesType = {
  matiere: { label: "Matières", singulier: "Matière", icone: "folder" },
  chapitre: { label: "Chapitres", singulier: "Chapitre", icone: "book" },
  exercice: { label: "Exercices", singulier: "Exercice", icone: "pencil" },
  qcm: { label: "QCM", singulier: "QCM", icone: "target" },
  video: { label: "Vidéos", singulier: "Vidéo", icone: "video" },
};

/* ---- Résolution d'un favori vers le contenu qu'il désigne ---- */

function resoudre(favori, videosPerso) {
  const { type, reference } = favori;

  if (type === "matiere") {
    const m = getMatiere(reference);
    if (!m) return null;
    return {
      titre: m.nom,
      detail: m.resume,
      matiere: m,
      lien: `/cours/${m.id}`,
    };
  }

  if (type === "chapitre") {
    const { matiere, titre } = litRefChapitre(reference);
    const m = getMatiere(matiere);
    const chapitre = m?.chapitres.find((c) => c.titre === titre);
    if (!m || !chapitre) return null;
    return {
      titre: chapitre.titre,
      detail: chapitre.resume,
      matiere: m,
      lien: `/cours/${m.id}`,
      complement: chapitre.statut === "disponible" ? null : "Bientôt",
    };
  }

  if (type === "exercice") {
    const e = getExercice(reference);
    if (!e) return null;
    return {
      titre: e.titre,
      detail: e.enonce,
      matiere: getMatiere(e.matiere),
      lien: `/exercices/${e.id}`,
      complement: e.difficulte,
    };
  }

  if (type === "qcm") {
    const q = getQcm(reference);
    if (!q) return null;
    return {
      titre: q.titre,
      detail: q.description,
      matiere: getMatiere(q.matiere),
      lien: `/qcm/${q.id}`,
      complement: `${q.questions.length} questions`,
    };
  }

  if (type === "video") {
    const v =
      videosPerso.find((x) => x.id === reference) ??
      videosSuggerees.find((x) => x.id === reference);
    if (!v) return null;
    return {
      titre: v.titre,
      detail: v.resume ?? "",
      matiere: getMatiere(v.matiere),
      lien: "/videos",
      complement: v.youtubeId ? "Lien prêt" : "Lien à ajouter",
    };
  }

  return null;
}

/* ================================================================== */

export default function Favoris() {
  const [favoris, setFavoris] = useState(lireFavoris);
  const [videosPerso] = useState(lireVideos);
  const [type, setType] = useState("tous");

  // Lus à la création de l'état ; l'effet ne fait que suivre les
  // changements faits ailleurs sur la page.
  useEffect(() => {
    const charger = () => setFavoris(lireFavoris());
    window.addEventListener("lrsi-favoris", charger);
    return () => window.removeEventListener("lrsi-favoris", charger);
  }, []);

  const resolus = useMemo(
    () =>
      favoris.map((f) => ({
        ...f,
        contenu: resoudre(f, videosPerso),
      })),
    [favoris, videosPerso]
  );

  const comptes = useMemo(() => {
    const c = {};
    resolus.forEach((f) => {
      c[f.type] = (c[f.type] ?? 0) + 1;
    });
    return c;
  }, [resolus]);

  const options = [
    { value: "tous", label: `Tous (${resolus.length})` },
    ...Object.keys(libellesType)
      .filter((t) => comptes[t])
      .map((t) => ({
        value: t,
        label: `${libellesType[t].label} (${comptes[t]})`,
      })),
  ];

  const affiches = resolus.filter((f) => type === "tous" || f.type === type);

  const retirer = (f) => setFavoris(retirerFavori(f.type, f.reference));

  return (
    <>
      <EnTetePage
        surtitre="Ma sélection"
        titre="Mes favoris"
        texte="Tout ce que tu as mis de côté : matières, chapitres, exercices, QCM et vidéos. Le marque-page se trouve sur chaque carte."
      />

      <Container className="py-10">
        {resolus.length === 0 ? (
          <EtatVide
            titre="Aucun favori pour l'instant"
            texte="Clique sur le marque-page d'une matière, d'un chapitre, d'un exercice, d'un QCM ou d'une vidéo pour la retrouver ici."
          >
            <div className="flex flex-wrap justify-center gap-3">
              <Bouton to="/cours">Parcourir les cours</Bouton>
              <Bouton to="/exercices" variante="secondaire">
                Voir les exercices
              </Bouton>
            </div>
          </EtatVide>
        ) : (
          <>
            <Filtres
              label="Filtrer par type de contenu"
              options={options}
              actif={type}
              onChange={setType}
            />

            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {affiches.map((f) => {
                const info = libellesType[f.type];
                const theme = themeMatiere(f.contenu?.matiere);

                return (
                  <li key={`${f.type}-${f.reference}`}>
                    <div className="card flex h-full gap-4 p-5">
                      <span
                        className={cx(
                          "grid size-10 shrink-0 place-items-center rounded-xl",
                          f.contenu ? theme.pastille : "bg-ink-100 text-ink-400 dark:bg-ink-800"
                        )}
                      >
                        <Icon name={info.icone} className="size-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{info.singulier}</Badge>
                          {f.contenu?.complement && (
                            <Badge ton="neutre">{f.contenu.complement}</Badge>
                          )}
                        </div>

                        {f.contenu ? (
                          <>
                            <Link
                              to={f.contenu.lien}
                              className="mt-2 block font-semibold text-ink-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300"
                            >
                              {f.contenu.titre}
                            </Link>
                            {f.contenu.detail && (
                              <p className="mt-1 line-clamp-2 text-sm/6 text-ink-600 dark:text-ink-400">
                                {f.contenu.detail}
                              </p>
                            )}
                            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-500 dark:text-ink-400">
                              {f.contenu.matiere && (
                                <span className={theme.texte}>
                                  {f.contenu.matiere.nom}
                                </span>
                              )}
                              {f.date && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>ajouté le {dateLisible(f.date)}</span>
                                </>
                              )}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="mt-2 font-semibold text-ink-700 dark:text-ink-200">
                              Contenu introuvable
                            </p>
                            <p className="mt-1 text-sm/6 text-ink-500 dark:text-ink-400">
                              Cette référence n'existe plus. Elle a sans doute
                              été renommée ou retirée.
                            </p>
                            <p className="mt-2 font-mono text-[11px] text-ink-400">
                              {f.type} · {f.reference}
                            </p>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => retirer(f)}
                        aria-label={`Retirer ${f.contenu?.titre ?? f.reference} des favoris`}
                        title="Retirer des favoris"
                        className="grid size-8 shrink-0 self-start place-items-center rounded-lg text-sun-600 transition-colors hover:bg-sun-100 dark:text-sun-400 dark:hover:bg-sun-500/15"
                      >
                        <Icon
                          name="bookmark"
                          className="size-5"
                          fill="currentColor"
                        />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-8">
          <NoteDemo>
            Tes favoris sont enregistrés dans ce navigateur uniquement. Ils ne
            te suivent pas d'un appareil à l'autre tant que les comptes
            n'existent pas.
          </NoteDemo>
        </div>
      </Container>
    </>
  );
}
