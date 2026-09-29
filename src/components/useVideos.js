import { useMemo, useState } from "react";
import { videosSuggerees } from "../data/videos";
import { lireVideosVues, marquerVideoVue } from "../progression";

/* Les vidéos que voit l'étudiant : celles que l'admin a publiées avec
   un lien YouTube (« Gérer le contenu », onglet Vidéos). Un étudiant ne
   peut ni en ajouter ni en modifier ; il les regarde, et le site retient
   celles qu'il a déjà ouvertes. */
export function useVideos() {
  const [vues, setVues] = useState(lireVideosVues);
  const [enLecture, setEnLecture] = useState(null);

  const toutes = useMemo(() => videosSuggerees.filter((v) => v.youtubeId), []);

  return {
    toutes,
    vues,
    enLecture,
    fermerLecteur: () => setEnLecture(null),
    lire: (video) => {
      setEnLecture(video);
      setVues(marquerVideoVue(video.id));
    },
  };
}
