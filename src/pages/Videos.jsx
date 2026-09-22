import { useMemo, useState } from "react";
import Icon from "../components/Icon";
import {
  Bouton,
  ChampRecherche,
  Container,
  EnTetePage,
  EtatVide,
  Filtres,
  NoteDemo,
} from "../components/ui";
import {
  CarteVideo,
  FormulaireVideo,
  Lecteur,
  Modale,
  useVideos,
} from "../components/videos";
import { getMatiere, matieres } from "../data/matieres";

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function Videos() {
  const v = useVideos();
  const [matiere, setMatiere] = useState("toutes");
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

  const pretes = resultats.filter((x) => x.youtubeId).length;

  return (
    <>
      <EnTetePage
        surtitre="Comprendre autrement"
        titre="Vidéos d'explication"
        texte="Des vidéos pour débloquer une notion avant de reprendre le cours. Elles restent hébergées par YouTube : la plateforme n'en garde que le lien."
      >
        <Bouton onClick={() => v.ouvrirFormulaire()}>
          <Icon name="plus" className="size-4" />
          Ajouter une vidéo
        </Bouton>
      </EnTetePage>

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
          {resultats.length > 1 ? "s" : ""}, dont {pretes} prête
          {pretes > 1 ? "s" : ""} à regarder.
        </p>

        {/* ---- Grille ---- */}
        <div className="mt-4">
          {resultats.length === 0 ? (
            <EtatVide
              titre="Aucune vidéo pour cette sélection"
              texte="Change de matière, ou ajoute une vidéo à celle-ci."
            >
              <div className="flex flex-wrap justify-center gap-3">
                <Bouton onClick={() => v.ouvrirFormulaire()}>
                  <Icon name="plus" className="size-4" />
                  Ajouter une vidéo
                </Bouton>
                <Bouton variante="secondaire" onClick={reinitialiser}>
                  Réinitialiser le filtre
                </Bouton>
              </div>
            </EtatVide>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((video) => (
                <li key={video.id}>
                  <CarteVideo
                    video={video}
                    vue={v.vues.includes(video.id)}
                    onLire={v.lire}
                    onCompleter={(x) =>
                      v.ouvrirFormulaire({ titre: x.titre, matiere: x.matiere })
                    }
                    onSupprimer={v.retirer}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-8">
          <NoteDemo>
            Les cartes marquées « Lien à ajouter » sont des emplacements :
            clique dessus pour y coller une adresse YouTube. Les vidéos ajoutées
            depuis le site restent dans ton navigateur. Pour qu'une vidéo soit
            visible par tous, elle se renseigne dans le fichier des données.
          </NoteDemo>
        </div>
      </Container>

      {v.enLecture && <Lecteur video={v.enLecture} onFermer={v.fermerLecteur} />}

      {v.formulaire && (
        <Modale titre="Ajouter une vidéo" onFermer={v.fermerFormulaire}>
          <FormulaireVideo
            prefill={v.formulaire}
            onFermer={v.fermerFormulaire}
            onAjoutee={v.majPerso}
          />
        </Modale>
      )}
    </>
  );
}
