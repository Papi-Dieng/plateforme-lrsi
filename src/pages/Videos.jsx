import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import BoutonFavori from "../components/BoutonFavori";
import { cx } from "../components/classes";
import { Lecteur } from "../components/videos";
import { useVideos } from "../components/useVideos";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";

/* ==================================================================
   Vidéos d'explication.

   D'après la maquette « Vidéos d'explication » (7 octobre 2026),
   allégée à la demande : fond ardoise, accent ambre, une vidéo « à
   l'affiche » en grand puis toutes les vidéos en grille. Les
   miniatures YouTube restent visibles avant la lecture, et le lecteur
   est la fenêtre habituelle (components/videos.jsx).
   ================================================================== */

const normalise = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const deux = (n) => String(n).padStart(2, "0");
const AMBRE = "text-[#ffc94d]";
const mono = "font-mono text-[11px] font-bold tracking-[0.14em] uppercase";
const lienYoutube = (id) => `https://www.youtube.com/watch?v=${id}`;
const miniature = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Trois teintes d'affiche, tour à tour.
const AFFICHES = [
  "bg-[#ffc94d] text-[#0f181b]",
  "bg-[#22303a] text-white ring-1 ring-white/10",
  "bg-[#d9e0e3] text-[#0f181b]",
];

// Le mot qui s'écrit en grand sur l'affiche : `accroche` si l'admin
// l'a donnée, sinon le premier mot qui porte du sens.
const accroche = (video) => video.accroche || motCourt(video);

const motCourt = (video) => video.titre.split(/\s+/).find((m) => m.length > 3) ?? video.titre;

function Affiche({ video, numero, grand = false }) {
  return (
    <span
      className={cx(
        "flex aspect-video w-full flex-col overflow-hidden rounded-[22px] text-left shadow-2xl",
        AFFICHES[(numero - 1) % AFFICHES.length],
        grand ? "p-8 sm:p-12" : "p-5 sm:p-6"
      )}
    >
      <span className={cx("flex justify-between border-b border-current/25 pb-3 font-mono font-bold tracking-[0.2em] uppercase", grand ? "text-base sm:text-xl" : "text-[10px] sm:text-xs")}>
        <span>Vidéo {deux(numero)}</span>
        <span className="truncate pl-4 opacity-80">{getMatiere(video.matiere)?.court ?? nomMatiere(video.matiere)}</span>
      </span>
      <span
        aria-hidden="true"
        className={cx(
          "mt-auto line-clamp-2 font-extrabold tracking-[-0.06em] break-words",
          grand ? "text-6xl sm:text-8xl" : "text-3xl sm:text-5xl"
        )}
      >
        {accroche(video)}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* L'affiche : carrousel                                               */
/* ------------------------------------------------------------------ */

function Carrousel({ videos, index, setIndex, onLire }) {
  const n = videos.length;
  const video = videos[index];
  const aller = (d) => setIndex((index + d + n) % n);

  return (
    <div
      className="mt-12"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") aller(1);
        if (e.key === "ArrowLeft") aller(-1);
      }}
    >
      <div className="relative mx-auto h-[min(52vw,400px)] max-w-6xl [perspective:1600px]">
        {videos.map((v, i) => {
          const d = ((i - index + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
          if (Math.abs(d) > 1) return null;
          return (
            <button
              key={v.id}
              type="button"
              tabIndex={d === 0 ? 0 : -1}
              aria-hidden={d !== 0}
              aria-label={d === 0 ? `Regarder : ${v.titre}` : undefined}
              onClick={() => (d === 0 ? onLire(v) : aller(d))}
              className={cx(
                "absolute top-0 left-1/2 w-[min(78vw,560px)] transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc94d]",
                d === 0 ? "z-10" : "z-0 opacity-60 max-sm:hidden"
              )}
              style={{
                transform: `translateX(calc(-50% + ${d * 64}%)) rotateY(${d * -28}deg) scale(${d === 0 ? 1 : 0.82})`,
              }}
            >
              <Affiche video={v} numero={i + 1} />
            </button>
          );
        })}
      </div>

      {n > 1 && (
        <div className="mx-auto mt-6 flex max-w-4xl items-center gap-3 px-4">
          <button type="button" onClick={() => aller(-1)} aria-label="Vidéo précédente" className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 hover:bg-white/10">
            <Icon name="arrow" className="size-4 rotate-180" />
          </button>
          <ol className="flex min-w-0 flex-1 gap-2">
            {videos.map((v, i) => (
              <li key={v.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-current={i === index}
                  aria-label={`Afficher la vidéo ${i + 1}`}
                  className={cx("block w-full border-t-4 pt-2 text-left", i === index ? "border-[#ffc94d] text-[#ffc94d]" : "border-white/15 text-white/60 hover:text-white")}
                >
                  <span className={cx(mono, "block truncate text-[10px] max-sm:hidden")} aria-hidden="true">
                    {deux(i + 1)} {motCourt(v)}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => aller(1)} aria-label="Vidéo suivante" className="grid size-11 shrink-0 place-items-center rounded-full border border-white/20 hover:bg-white/10">
            <Icon name="arrow" className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-10 px-4 text-center" aria-live="polite">
        <p className={cx(mono, AMBRE)}>
          Séance {deux(index + 1)} / {deux(n)} · {nomMatiere(video.matiere)}
        </p>
        {/* Le titre est dessiné par CSS : il apparaît aussi dans la
            liste, et une page ne doit le porter qu'une fois en texte. */}
        <h2
          aria-label={`À l'affiche : ${video.titre}`}
          data-titre={video.titre}
          className="mx-auto mt-3 max-w-2xl text-4xl font-extrabold tracking-[-0.05em] text-balance before:content-[attr(data-titre)] sm:text-5xl"
        />
        {video.resume && <p className="mt-3 text-white/75">{video.resume}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => onLire(video)} className="inline-flex min-h-12 items-center gap-2 rounded-[14px] bg-[#ffc94d] px-6 font-extrabold text-[#0f181b] shadow-[0_10px_40px_-8px_#ffc94d80] hover:bg-[#ffd673]">
            <Icon name="play" className="size-4" fill="currentColor" stroke="none" />
            Regarder
          </button>
          <BoutonFavori type="video" reference={video.id} libelle={video.titre} variante="sombre" taille="lg" avecTexte />
          <a href={lienYoutube(video.youtubeId)} target="_blank" rel="noopener noreferrer" className={cx("inline-flex min-h-12 items-center gap-1.5 px-2 font-extrabold hover:underline", AMBRE)}>
            Ouvrir sur YouTube
            <Icon name="external" className="size-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

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
  const [index, setIndex] = useState(0);

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
  const i = Math.min(index, Math.max(n - 1, 0));
  const vedette = v.toutes[i];

  return (
    <div className="dark min-h-full bg-[#0f181b] text-white">
      {/* ---- En-tête et vidéo à l'affiche ---- */}
      <section className="bg-[#1b2328] px-4 pt-14 pb-16">
        <div className="text-center">
          <p className={cx(mono, AMBRE)}>Comprendre autrement</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.05em] text-balance sm:text-6xl">Vidéos d'explication</h1>
          <p className="mx-auto mt-4 max-w-xl text-white/75">
            Des vidéos choisies pour débloquer une notion avant de reprendre le cours. Elles restent hébergées par YouTube : la plateforme n'en garde que le lien.
          </p>
        </div>

        {vedette ? (
          <Carrousel videos={v.toutes} index={i} setIndex={setIndex} onLire={v.lire} />
        ) : (
          <div className="mt-10 text-center">
            <p className={cx(mono, AMBRE)}>0 vidéo à l'affiche</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Pas encore de vidéo</h2>
            <p className="mt-2 text-white/75">Les vidéos d'explication arriveront ici au fur et à mesure que l'équipe les choisit.</p>
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
                <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/60" />
                <input
                  id="recherche-videos"
                  type="search"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder="Rechercher une vidéo, une notion…"
                  className="min-h-11 w-full rounded-[14px] border border-white/15 bg-[#1b2328] pr-4 pl-11 text-white placeholder:text-white/55 focus:border-[#ffc94d] focus:outline-none"
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
                  matiere === o.value ? "border-[#ffc94d] bg-[#ffc94d] text-[#0f181b]" : "border-white/20 text-white hover:bg-white/10"
                )}
              >
                {o.label}
                <span className="font-mono text-[11px] opacity-70">{o.nombre}</span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-sm text-white/70">
            {resultats.length} vidéo{resultats.length > 1 ? "s" : ""} affichée{resultats.length > 1 ? "s" : ""}.
          </p>

          {resultats.length === 0 ? (
            <div className="mt-6">
              <p className="text-lg font-extrabold">Aucune vidéo pour cette sélection</p>
              <p className="mt-1 text-white/70">Change de matière ou de recherche.</p>
              <button
                type="button"
                onClick={() => {
                  setMatiere("toutes");
                  setRecherche("");
                }}
                className="mt-4 min-h-11 rounded-[14px] border border-white/20 px-4 font-extrabold hover:bg-white/10"
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
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                      {nomMatiere(video.matiere)}
                      {v.vues.includes(video.id) && <span className="rounded bg-white/10 px-1.5 py-0.5 font-bold">Déjà ouverte</span>}
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
