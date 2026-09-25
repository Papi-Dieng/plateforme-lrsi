import { useMemo, useState } from "react";
import { videosSuggerees } from "../data/videos";
import { lireVideos, lireVideosVues, marquerVideoVue, supprimerVideo } from "../progression";

/* L'état partagé des vidéos : celles ajoutées par l'étudiant, celles
   déjà vues, la vidéo en lecture et le formulaire d'ajout. Utilisé par
   le tableau de bord et la page Vidéos, avec les briques de videos.jsx. */
export function useVideos() {
  const [perso, setPerso] = useState(lireVideos);
  const [vues, setVues] = useState(lireVideosVues);
  const [enLecture, setEnLecture] = useState(null);
  const [formulaire, setFormulaire] = useState(null);


  const toutes = useMemo(() => [...perso, ...videosSuggerees], [perso]);

  return {
    toutes,
    vues,
    enLecture,
    formulaire,
    ouvrirFormulaire: (prefill = {}) => setFormulaire(prefill),
    fermerFormulaire: () => setFormulaire(null),
    fermerLecteur: () => setEnLecture(null),
    majPerso: setPerso,
    lire: (video) => {
      setEnLecture(video);
      setVues(marquerVideoVue(video.id));
    },
    retirer: (video) => setPerso(supprimerVideo(video.id)),
  };
}
