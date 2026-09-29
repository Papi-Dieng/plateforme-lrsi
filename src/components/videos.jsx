import { useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Badge } from "./ui";
import { cx } from "./classes";
import BoutonFavori from "./BoutonFavori";
import { getMatiere, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { useVideos } from "./useVideos";

/* ==================================================================
   Vidéos d'explication.

   Aucune vidéo n'est hébergée ici : la plateforme ne garde que
   l'identifiant YouTube. Le lecteur n'est chargé qu'au clic ; les
   miniatures, elles, viennent de YouTube (i.ytimg.com) dès qu'une carte
   s'affiche, ce que dit la politique de confidentialité.

   Ce fichier fournit les briques communes au tableau de bord et à la
   page dédiée : la carte, la fenêtre et le lecteur. Seul l'admin ajoute
   des vidéos (« Gérer le contenu ») ; la liste vient de useVideos.js.
   ================================================================== */

const miniature = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const lecteurUrl = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */

export function CarteVideo({ video, vue, onLire }) {
  const theme = themeMatiere(getMatiere(video.matiere));
  const pret = Boolean(video.youtubeId);

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => pret && onLire(video)}
        className="block w-full overflow-hidden rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        <span
          className={cx(
            "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl",
            pret ? "bg-ink-900" : theme.fondDoux
          )}
        >
          {pret && (
            <img
              src={miniature(video.youtubeId)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          )}

          <span
            className={cx(
              "absolute grid size-12 place-items-center rounded-full shadow-lg transition-transform group-hover:scale-110",
              pret ? "bg-white/95 text-ink-950" : "bg-white text-ink-500 dark:text-ink-400"
            )}
          >
            <Icon
              name={pret ? "play" : "plus"}
              className="size-5 translate-x-px"
              fill={pret ? "currentColor" : "none"}
              stroke={pret ? "none" : "currentColor"}
            />
          </span>

          {video.duree && video.duree !== "—" && (
            <span className="absolute right-2 bottom-2 rounded-md bg-ink-950/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
              {video.duree}
            </span>
          )}

          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <span
              className={cx(
                "block h-full bg-flame-500 transition-[width]",
                vue ? "w-full" : "w-0"
              )}
            />
          </span>
        </span>

        <span className="mt-3 block">
          <span className="line-clamp-2 block text-sm font-semibold text-ink-900 dark:text-white">
            {video.titre}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cx("text-xs font-medium", theme.texte)}>
              {nomMatiere(video.matiere)}
            </span>
            {vue && pret && (
              <Badge className="text-[10px]">Déjà ouverte</Badge>
            )}
          </span>
        </span>
      </button>

      <BoutonFavori
        type="video"
        reference={video.id}
        libelle={video.titre}
        variante="surCouleur"
        className="absolute top-2 right-2 bg-ink-950/50 backdrop-blur-sm"
      />

    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Fenêtre modale                                                      */
/* ------------------------------------------------------------------ */

export function Modale({ titre, onFermer, large = false, children }) {
  useEffect(() => {
    const surTouche = (e) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/60 p-4 backdrop-blur-sm"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        onClick={(e) => e.stopPropagation()}
        className={cx(
          "w-full rounded-3xl bg-white p-5 shadow-xl sm:p-6 dark:bg-ink-900",
          large ? "max-w-3xl" : "max-w-md"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-balance text-ink-900 dark:text-white">
            {titre}
          </h2>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <Icon name="close" className="size-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lecteur                                                             */
/* ------------------------------------------------------------------ */

export function Lecteur({ video, onFermer }) {
  return (
    <Modale large titre={video.titre} onFermer={onFermer}>
      <div className="mt-4 overflow-hidden rounded-2xl bg-black">
        <iframe
          src={lecteurUrl(video.youtubeId)}
          title={video.titre}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-ink-500 dark:text-ink-400">
          {nomMatiere(video.matiere)}
        </span>
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          Ouvrir sur YouTube
          <Icon name="external" className="size-3.5" />
        </a>
      </div>
    </Modale>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaire d'ajout                                                  */
/* ------------------------------------------------------------------ */

/* ================================================================== */
/* Rangée du tableau de bord                                           */
/* ================================================================== */

/* `matiere` : la matière choisie en haut du tableau de bord. La rangée
   ne montre alors que ses vidéos. */
export default function SectionVideos({ matiere = null }) {
  const v = useVideos();
  const liste = matiere ? v.toutes.filter((x) => x.matiere === matiere) : v.toutes;
  // Rien de publié pour cette sélection : la section ne s'affiche pas.
  if (liste.length === 0) return null;

  return (
    <section className="rounded-3xl bg-ink-50 p-5 sm:p-6 dark:bg-ink-950">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900 dark:text-white">
            <Icon
              name="video"
              className="size-5 text-flame-600 dark:text-flame-400"
            />
            Vidéos d'explication
            {matiere && (
              <span className="text-ink-500 dark:text-ink-400">· {nomMatiere(matiere)}</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {liste.length} vidéo{liste.length > 1 ? "s" : ""} choisie{liste.length > 1 ? "s" : ""} pour débloquer une notion.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={matiere ? `/videos?m=${matiere}` : "/videos"}
            className="text-sm font-medium text-flame-700 hover:text-flame-800 dark:text-flame-400"
          >
            Toutes les vidéos
          </Link>
        </div>
      </div>

      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
        {liste.map((video) => (
          <li key={video.id} className="w-64 shrink-0 snap-start sm:w-72">
            <CarteVideo
              video={video}
              vue={v.vues.includes(video.id)}
              onLire={v.lire}
            />
          </li>
        ))}
      </ul>

      {v.enLecture && (
        <Lecteur video={v.enLecture} onFermer={v.fermerLecteur} />
      )}

    </section>
  );
}
