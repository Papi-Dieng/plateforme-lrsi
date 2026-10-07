import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import BoutonFavori from "../components/BoutonFavori";
import { cx } from "../components/classes";
import { Lecteur } from "../components/videos";
import { useVideos } from "../components/useVideos";
import { matieres, nomMatiere } from "../data/matieres";

/* ==================================================================
   Vidéos d'explication.

   D'après la maquette « Vidéos d'explication » (7 octobre 2026),
   allégée à la demande : fond ardoise, accent ambre, toutes les vidéos en
   grille (le carrousel d'affiches a été retiré à la demande). Les
   miniatures YouTube restent visibles avant la lecture, et le lecteur
   est la fenêtre habituelle (components/videos.jsx).
   ================================================================== */

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const AMBRE = "text-[#8a5a00] dark:text-[#ffc94d]";
const mono = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";
const miniature = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

function Miniature({ video, grand = false }) {
  return (
    <span className="relative block aspect-video w-full overflow-hidden rounded-[20px] bg-[#0f181b] ring-1 ring-white/10">
      <img src={miniature(video.youtubeId)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
      <span
        className={cx(
          "absolute top-1/2 left-1/2 grid -translate-1/2 place-items-center rounded-full bg-[#ffc94d] text-[#0f181b] shadow-lg transition-transform group-hover:scale-110",
          grand ? "size-16" : "size-11"
        )}
      >
        <Icon name="play" className={grand ? "size-6" : "size-4"} fill="currentColor" stroke="none" />
      </span>
      {video.duree && video.duree !== "—" && (
        <span className="absolute right-2 bottom-2 rounded-md bg-[#0f181b]/85 px-1.5 py-0.5 font-mono text-[11px] text-white">{video.duree}</span>
      )}
    </span>
  );
}

export default function Videos() {
  const v = useVideos();
  // `?m=reseaux` : arrivée depuis le tableau de bord, déjà filtrée.
  const [params] = useSearchParams();
  const [matiere, setMatiere] = useState(() =>
    matieres.some((m) => m.id === params.get("m")) ? params.get("m") : "toutes"
  );
  const [recherche, setRecherche] = useState("");

  const q = normalise(recherche.trim());
  const resultats = v.toutes.filter((video) => {
    if (matiere !== "toutes" && video.matiere !== matiere) return false;
    if (!q) return true;
    return normalise(`${video.titre} ${nomMatiere(video.matiere)}`).includes(q);
  });

  const options = [
    { value: "toutes", label: "Toutes les matières", nombre: v.toutes.length },
    ...matieres
      .map((m) => ({ value: m.id, label: m.nom, nombre: v.toutes.filter((x) => x.matiere === m.id).length }))
      .filter((o) => o.nombre > 0),
  ];

  const n = v.toutes.length;

  return (
    <div className="min-h-full bg-white text-ink-950 dark:bg-ink-950 dark:text-white">
      {/* ---- En-tête et vidéo à l'affiche ---- */}
      <section className="bg-ink-50 dark:bg-ink-900 px-4 pt-14 pb-12">
        <div className="text-center">
          <p className={cx(mono, AMBRE)}>Comprendre autrement</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.05em] text-balance sm:text-6xl">Vidéos d'explication</h1>
          <p className="mx-auto mt-4 max-w-xl text-ink-600 dark:text-ink-300">
            Des vidéos choisies pour débloquer une notion avant de reprendre le cours. Elles restent hébergées par YouTube : la plateforme n'en garde que le lien.
          </p>
        </div>

        {n === 0 && (
          <div className="mt-10 text-center">
            <p className={cx(mono, AMBRE)}>0 vidéo à l'affiche</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Pas encore de vidéo</h2>
            <p className="mt-2 text-ink-600 dark:text-ink-300">Les vidéos d'explication arriveront ici au fur et à mesure que l'équipe les choisit.</p>
          </div>
        )}
      </section>

      {/* ---- Toutes les vidéos ---- */}
      {n > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold tracking-[-0.04em]">Toutes les vidéos</h2>
            <div className="w-full sm:w-80">
              <label htmlFor="recherche-videos" className="sr-only">
                Rechercher une vidéo
              </label>
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-600 dark:text-ink-300" />
                <input
                  id="recherche-videos"
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher une vidéo, une notion…"
                  className="min-h-11 w-full rounded-[14px] border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 pr-4 pl-11 placeholder:text-ink-500 focus:border-[#ffc94d] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div role="group" aria-label="Filtrer par matière" className="mt-5 flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={matiere === o.value}
                onClick={() => setMatiere(o.value)}
                className={cx(
                  "inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-bold",
                  matiere === o.value ? "border-[#ffc94d] bg-[#ffc94d] text-[#0f181b]" : "border-ink-200 dark:border-ink-700 hover:bg-ink-100 dark:hover:bg-ink-800"
                )}
              >
                {o.label}
                <span className="font-mono text-[11px] opacity-70">{o.nombre}</span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm text-ink-600 dark:text-ink-300">
            {resultats.length} vidéo{resultats.length > 1 ? "s" : ""} affichée{resultats.length > 1 ? "s" : ""}.
          </p>

          {resultats.length === 0 ? (
            <div className="mt-6">
              <p className="text-lg font-extrabold">Aucune vidéo pour cette sélection</p>
              <p className="mt-1 text-ink-600 dark:text-ink-300">Change de matière ou de recherche.</p>
              <button
                type="button"
                onClick={() => {
                  setMatiere("toutes");
                  setRecherche("");
                }}
                className="mt-4 min-h-11 rounded-[14px] border border-ink-200 dark:border-ink-700 px-4 font-extrabold hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Réinitialiser le filtre
              </button>
            </div>
          ) : (
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {resultats.map((video) => (
                <li key={video.id} className="relative">
                  <button type="button" onClick={() => v.lire(video)} className="group block w-full text-left">
                    <Miniature video={video} />
                    <span className="mt-3 block font-extrabold tracking-[-0.02em] group-hover:text-[#ffc94d]">{video.titre}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-600 dark:text-ink-300">
                      {nomMatiere(video.matiere)}
                      {v.vues.includes(video.id) && <span className="rounded bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 font-bold">Déjà ouverte</span>}
                    </span>
                  </button>
                  <BoutonFavori
                    type="video"
                    reference={video.id}
                    libelle={video.titre}
                    variante="surCouleur"
                    className="absolute top-2 right-2 bg-[#0f181b]/60 backdrop-blur-sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {v.enLecture && <Lecteur video={v.enLecture} onFermer={v.fermerLecteur} />}
    </div>
  );
}
