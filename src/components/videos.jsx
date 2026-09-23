import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Badge, Bouton, cx } from "./ui";
import BoutonFavori from "./BoutonFavori";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { videosSuggerees } from "../data/videos";
import {
  ajouterVideo,
  lireVideos,
  lireVideosVues,
  marquerVideoVue,
  supprimerVideo,
} from "../progression";

/* ==================================================================
   Vidéos d'explication.

   Aucune vidéo n'est hébergée ici : la plateforme ne garde que
   l'identifiant YouTube. Le lecteur n'est chargé qu'au clic, donc
   aucune requête n'est envoyée à YouTube tant qu'on ne lance rien.

   Ce fichier fournit les briques communes au tableau de bord et à la
   page dédiée : la carte, la fenêtre, le formulaire et le crochet qui
   tient la liste à jour.
   ================================================================== */

const miniature = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const lecteurUrl = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

/* ------------------------------------------------------------------ */
/* État partagé                                                        */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */

export function CarteVideo({ video, vue, onLire, onCompleter, onSupprimer }) {
  const theme = themeMatiere(getMatiere(video.matiere));
  const pret = Boolean(video.youtubeId);
  const perso = video.id.startsWith("perso-");

  return (
    <article className="group relative">
      <button
        type="button"
        onClick={() => (pret ? onLire(video) : onCompleter(video))}
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
              pret ? "bg-white/95 text-ink-950" : "bg-white text-ink-400"
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
            {!pret && (
              <Badge ton="sun" className="text-[10px]">
                Lien à ajouter
              </Badge>
            )}
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

      {perso && (
        <button
          type="button"
          onClick={() => onSupprimer(video)}
          aria-label={`Retirer la vidéo ${video.titre}`}
          className="absolute top-2 left-2 grid size-8 place-items-center rounded-lg bg-ink-950/70 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink-950 focus-visible:opacity-100"
        >
          <Icon name="trash" className="size-4" />
        </button>
      )}
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
            className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
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

export function FormulaireVideo({ prefill, onFermer, onAjoutee }) {
  const [titre, setTitre] = useState(prefill?.titre ?? "");
  const [matiere, setMatiere] = useState(prefill?.matiere ?? matieres[0].id);
  const [duree, setDuree] = useState("");
  const [lien, setLien] = useState("");
  const [erreur, setErreur] = useState(null);

  const soumettre = (e) => {
    e.preventDefault();
    if (titre.trim().length < 3) {
      setErreur("Donne un titre d'au moins trois caractères.");
      return;
    }
    const resultat = ajouterVideo({ titre, matiere, duree, lien });
    if (resultat.erreur === "lien") {
      setErreur("Lien YouTube non reconnu. Colle l'adresse complète de la vidéo.");
      return;
    }
    if (resultat.erreur === "doublon") {
      setErreur("Cette vidéo est déjà dans la liste.");
      return;
    }
    onAjoutee(resultat.videos);
    onFermer();
  };

  const champ =
    "mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-ink-700 dark:bg-ink-950 dark:text-white";
  const etiquette = "block text-sm font-medium text-ink-800 dark:text-ink-200";

  return (
    <form onSubmit={soumettre} noValidate className="mt-5 space-y-4">
      <div>
        <label htmlFor="video-lien" className={etiquette}>
          Lien YouTube
        </label>
        <input
          id="video-lien"
          type="url"
          inputMode="url"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className={champ}
        />
        <p className="mt-1.5 text-xs text-ink-500">
          L'adresse courte youtu.be et les Shorts fonctionnent aussi.
        </p>
      </div>

      <div>
        <label htmlFor="video-titre" className={etiquette}>
          Titre
        </label>
        <input
          id="video-titre"
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Ex. Le modèle OSI expliqué simplement"
          className={champ}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="video-matiere" className={etiquette}>
            Matière
          </label>
          <select
            id="video-matiere"
            value={matiere}
            onChange={(e) => setMatiere(e.target.value)}
            className={champ}
          >
            {matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="video-duree" className={etiquette}>
            Durée <span className="font-normal text-ink-400">(facultatif)</span>
          </label>
          <input
            id="video-duree"
            type="text"
            value={duree}
            onChange={(e) => setDuree(e.target.value)}
            placeholder="Ex. 12:40"
            className={champ}
          />
        </div>
      </div>

      {erreur && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {erreur}
        </p>
      )}

      <p className="rounded-xl bg-ink-100 px-4 py-3 text-xs/5 text-ink-600 dark:bg-ink-800/60 dark:text-ink-300">
        La vidéo reste hébergée par YouTube : seul son identifiant est
        enregistré, et uniquement dans ce navigateur. Vérifie que tu as le droit
        de partager le lien.
      </p>

      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <Bouton variante="secondaire" onClick={onFermer}>
          Annuler
        </Bouton>
        <Bouton type="submit">Ajouter la vidéo</Bouton>
      </div>
    </form>
  );
}

/* ================================================================== */
/* Rangée du tableau de bord                                           */
/* ================================================================== */

export default function SectionVideos() {
  const v = useVideos();
  const pretes = v.toutes.filter((x) => x.youtubeId).length;

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
          </h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {pretes > 0
              ? `${pretes} vidéo${pretes > 1 ? "s" : ""} prête${pretes > 1 ? "s" : ""} à regarder. Les autres attendent leur lien.`
              : "Colle un lien YouTube pour remplir un emplacement, ou ajoute ta propre vidéo."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Bouton variante="secondaire" onClick={() => v.ouvrirFormulaire()}>
            <Icon name="plus" className="size-4" />
            Ajouter une vidéo
          </Bouton>
          <Link
            to="/videos"
            className="text-sm font-medium text-flame-600 hover:text-flame-700 dark:text-flame-400"
          >
            Toutes les vidéos
          </Link>
        </div>
      </div>

      <ul className="mt-5 flex snap-x gap-4 overflow-x-auto pb-2">
        {v.toutes.map((video) => (
          <li key={video.id} className="w-64 shrink-0 snap-start sm:w-72">
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

      {v.enLecture && (
        <Lecteur video={v.enLecture} onFermer={v.fermerLecteur} />
      )}

      {v.formulaire && (
        <Modale titre="Ajouter une vidéo" onFermer={v.fermerFormulaire}>
          <FormulaireVideo
            prefill={v.formulaire}
            onFermer={v.fermerFormulaire}
            onAjoutee={v.majPerso}
          />
        </Modale>
      )}
    </section>
  );
}
