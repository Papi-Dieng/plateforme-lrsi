import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bouton,
  ChampRecherche,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
} from "../components/ui";
import { CarteVideo, Lecteur } from "../components/videos";
import { useVideos } from "../components/useVideos";
import { getMatiere, matieres } from "../data/matieres";

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function Videos() {
  const v = useVideos();
  // `?m=reseaux` : arrivée depuis le tableau de bord, déjà filtrée.
  const [params] = useSearchParams();
  const [matiere, setMatiere] = useState(() =>
    matieres.some((m) => m.id === params.get("m")) ? params.get("m") : "toutes"
  );
  const [recherche, setRecherche] = useState("");

  // Un seul niveau de filtre : dans cette version, une filière
  // correspond à une matière. Le jour où la plateforme s'ouvrira à
  // d'autres formations, la filière deviendra un niveau au-dessus.
  const optionsMatiere = [
    { value: "toutes", label: "Toutes les matières" },
    ...matieres.map((m) => ({ value: m.id, label: m.nom })),
  ];

  const resultats = useMemo(() => {
    const q = normalise(recherche.trim());
    return v.toutes.filter((video) => {
      if (matiere !== "toutes" && video.matiere !== matiere) return false;
      if (!q) return true;
      const m = getMatiere(video.matiere);
      return normalise(`${video.titre} ${m?.nom ?? ""}`).includes(q);
    });
  }, [v.toutes, matiere, recherche]);

  const reinitialiser = () => {
    setMatiere("toutes");
    setRecherche("");
  };


  return (
    <>
      <EnTetePage
        surtitre="Comprendre autrement"
        titre="Vidéos d'explication"
        texte="Des vidéos choisies pour débloquer une notion avant de reprendre le cours. Elles restent hébergées par YouTube : la plateforme n'en garde que le lien."
      />

      <Container className="py-10">
        {/* ---- Filtres ---- */}
        <div className="space-y-4">
          <div className="sm:w-96">
            <label htmlFor="recherche-videos" className="sr-only">
              Rechercher une vidéo
            </label>
            <ChampRecherche
              id="recherche-videos"
              valeur={recherche}
              onChange={setRecherche}
              placeholder="Rechercher une vidéo, une notion…"
            />
          </div>

          <Filtres
            label="Filtrer par matière"
            options={optionsMatiere}
            actif={matiere}
            onChange={setMatiere}
          />
        </div>

        <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
          {resultats.length} vidéo{resultats.length > 1 ? "s" : ""} affichée
          {resultats.length > 1 ? "s" : ""}.
        </p>

        {/* ---- Grille ---- */}
        <div className="mt-4">
          {resultats.length === 0 ? (
            <EtatVide
              titre={v.toutes.length === 0 ? "Pas encore de vidéo" : "Aucune vidéo pour cette sélection"}
              texte={
                v.toutes.length === 0
                  ? "Les vidéos d'explication arriveront ici au fur et à mesure que l'équipe les choisit."
                  : "Change de matière ou de recherche."
              }
            >
              {v.toutes.length > 0 && (
                <Bouton variante="secondaire" onClick={reinitialiser}>
                  Réinitialiser le filtre
                </Bouton>
              )}
            </EtatVide>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((video) => (
                <li key={video.id}>
                  <CarteVideo
                    video={video}
                    vue={v.vues.includes(video.id)}
                    onLire={v.lire}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

      </Container>

      {v.enLecture && <Lecteur video={v.enLecture} onFermer={v.fermerLecteur} />}

    </>
  );
}
