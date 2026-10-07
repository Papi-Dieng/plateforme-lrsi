import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import BoutonFavori from "../components/BoutonFavori";
import { cx } from "../components/classes";
import { useVideos } from "../components/useVideos";
import { getMatiere, matieres, nomMatiere } from "../data/matieres";

/* ==================================================================
   Vidéos d'explication.

   Mise en page d'après la maquette « Vidéos d'explication » (7 octobre
   2026) : une salle de projection sombre. En haut, l'affiche — les
   vidéos en carrousel, celle du milieu en grand ; puis « Le générique »,
   la liste complète filtrable ; enfin ce que la lecture implique pour la
   vie privée. Au clic, la vidéo s'ouvre « en salle », plein écran.

   Les affiches sont dessinées ici : on n'affiche pas les miniatures
   YouTube, pour que rien ne parte chez Google avant le clic.
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
const lecteurUrl = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;

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

/* ------------------------------------------------------------------ */
/* En salle : le lecteur plein écran                                   */
/* ------------------------------------------------------------------ */

function EnSalle({ video, numero, total, suivante, onSuivante, onFermer }) {
  useEffect(() => {
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);

  return (
    <div role="dialog" aria-modal="true" aria-label={video.titre} className="dark fixed inset-0 z-50 overflow-y-auto bg-[#0b1215]/95 text-white backdrop-blur-md">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <p className={cx(mono, "text-white/80")}>En salle · Séance {deux(numero)} / {deux(total)}</p>
          <button type="button" onClick={onFermer} className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-white/20 px-4 font-extrabold hover:bg-white/10" autoFocus>
            <Icon name="close" className="size-4" />
            Fermer
            <kbd className="rounded-md border border-white/20 px-1.5 font-mono text-[11px] text-white/70 max-sm:hidden">Échap</kbd>
          </button>
        </div>

        <div className="mt-6 overflow-hidden rounded-[22px] bg-black shadow-2xl ring-1 ring-white/10">
          <iframe
            src={lecteurUrl(video.youtubeId)}
            title={video.titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full"
          />
        </div>
        <p className={cx(mono, "mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/60")}>
          <Icon name="shield" className="size-3.5" />
          Lecture en mode de confidentialité renforcée
        </p>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-[1_1_min(420px,100%)]">
            <p className={cx(mono, AMBRE)}>{nomMatiere(video.matiere)}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-balance">{video.titre}</p>
            {video.resume && <p className="mt-2 text-white/70">{video.resume}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <BoutonFavori type="video" reference={video.id} libelle={video.titre} variante="sombre" taille="lg" avecTexte />
            <a href={lienYoutube(video.youtubeId)} target="_blank" rel="noopener noreferrer" className={cx("inline-flex min-h-12 items-center gap-1.5 px-2 font-extrabold hover:underline", AMBRE)}>
              Ouvrir sur YouTube
              <Icon name="external" className="size-3.5" />
            </a>
            {suivante && (
              <button type="button" onClick={onSuivante} className="max-w-72 rounded-[14px] border border-white/20 px-4 py-2 text-left hover:bg-white/10">
                <span className={cx(mono, "block text-[10px]", AMBRE)}>Séance suivante</span>
                <span className="block truncate font-extrabold">{suivante.titre}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const CONFIDENTIALITE = [
  ["Hébergement", "YouTube"],
  ["Lecture", "Au clic seulement, en mode de confidentialité renforcée (youtube-nocookie.com)"],
  ["En regardant", "Les règles de Google s'appliquent"],
  ["Sur Sunu Cours", "Le lien de la vidéo, rien d'autre"],
];

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
    ...matieres.map((m) => ({ value: m.id, label: m.nom, nombre: v.toutes.filter((x) => x.matiere === m.id).length })),
  ];

  const ouverte = v.enLecture ? v.toutes.findIndex((x) => x.id === v.enLecture.id) : -1;
  const vide = v.toutes.length === 0;

  return (
    <div className="dark bg-[#0f181b] text-white">
      {/* ---- L'affiche ---- */}
      <section className="relative overflow-hidden bg-[#1b2328] pt-16 pb-20">
        <div aria-hidden="true" className="pointer-events-none absolute top-0 left-1/2 h-[420px] w-[760px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,#ffffff1f,transparent_70%)] [clip-path:polygon(46%_0,54%_0,100%_100%,0_100%)]" />
        <div className="relative px-4 text-center">
          <p className={cx(mono, AMBRE)}>Comprendre autrement</p>
          <h1 className="mt-4 text-5xl font-extrabold tracking-[-0.06em] text-balance sm:text-7xl">Vidéos d'explication</h1>
          <p className="mx-auto mt-5 max-w-xl text-white/75">
            Des vidéos choisies pour débloquer une notion avant de reprendre le cours. Elles restent hébergées par YouTube : la plateforme n'en garde que le lien.
          </p>
        </div>

        {vide ? (
          <div className="relative mt-12 px-4 text-center">
            <div aria-hidden="true" className="mx-auto grid aspect-video max-w-2xl grid-cols-7 overflow-hidden rounded-[22px] shadow-2xl">
              {["#eef3f5", "#ffe2a3", "#ffc94d", "#a9bcc1", "#7fb3c0", "#22303a", "#0f181b"].map((c) => (
                <span key={c} style={{ background: c }} />
              ))}
            </div>
            <p className={cx(mono, "mt-10", AMBRE)}>0 vidéo à l'affiche</p>
            <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.05em]">Pas encore de vidéo</h2>
            <p className="mt-3 text-white/75">Les vidéos d'explication arriveront ici au fur et à mesure que l'équipe les choisit.</p>
          </div>
        ) : (
          <Carrousel videos={v.toutes} index={Math.min(index, v.toutes.length - 1)} setIndex={setIndex} onLire={v.lire} />
        )}
      </section>

      {/* ---- Le générique ---- */}
      {!vide && (
        <section className="mx-auto max-w-5xl px-4 py-20">
          <p className={cx(mono, "text-center", AMBRE)}>Toutes les vidéos</p>
          <h2 className="mt-3 text-center text-5xl font-extrabold tracking-[-0.06em]">Le générique</h2>

          <div className="mx-auto mt-8 max-w-md">
            <label htmlFor="recherche-videos" className="sr-only">Rechercher une vidéo</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-white/60" />
              <input
                id="recherche-videos"
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher une vidéo, une notion…"
                className="min-h-12 w-full rounded-[14px] border border-white/15 bg-[#1b2328] pr-4 pl-11 text-white placeholder:text-white/55 focus:border-[#ffc94d] focus:outline-none"
              />
            </div>
          </div>

          <div role="group" aria-label="Filtrer par matière" className="mt-5 flex flex-wrap justify-center gap-2">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={matiere === o.value}
                onClick={() => setMatiere(o.value)}
                className={cx(
                  "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold",
                  matiere === o.value ? "border-white bg-white text-[#0f181b]" : "border-white/20 text-white hover:bg-white/10"
                )}
              >
                {o.label}
                <span className="font-mono text-[11px] opacity-70">{o.nombre}</span>
              </button>
            ))}
          </div>

          <p className="mt-6 text-center font-mono text-xs text-white/70">
            {resultats.length} vidéo{resultats.length > 1 ? "s" : ""} affichée{resultats.length > 1 ? "s" : ""}.
          </p>

          {resultats.length === 0 ? (
            <div className="mt-8 text-center">
              <p className="text-xl font-extrabold">Aucune vidéo pour cette sélection</p>
              <p className="mt-1 text-white/70">Change de matière ou de recherche.</p>
              <button
                type="button"
                onClick={() => { setMatiere("toutes"); setRecherche(""); }}
                className="mt-4 min-h-11 rounded-[14px] border border-white/20 px-4 font-extrabold hover:bg-white/10"
              >
                Réinitialiser le filtre
              </button>
            </div>
          ) : (
            <ul className="mt-8 border-t border-white/10">
              {resultats.map((video) => {
                const i = v.toutes.indexOf(video);
                return (
                  <li key={video.id} className="border-b border-white/10">
                    <button type="button" onClick={() => v.lire(video)} className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-6 text-left sm:grid-cols-[minmax(0,14rem)_2.5rem_1fr_auto]">
                      <span className="text-right max-sm:col-span-2 max-sm:text-left">
                        <span className={cx(mono, "block text-[10px] text-white/70")}>{nomMatiere(video.matiere)}</span>
                        {v.vues.includes(video.id) && (
                          <span className={cx(mono, "mt-1 inline-block rounded bg-white/10 px-1.5 py-0.5 text-[9px]")}>Déjà ouverte</span>
                        )}
                      </span>
                      <span className={cx("font-mono text-xs font-bold max-sm:hidden", AMBRE)}>{deux(i + 1)}</span>
                      <span className="min-w-0">
                        <span className="block text-2xl font-extrabold tracking-[-0.04em] group-hover:text-[#ffc94d]">{video.titre}</span>
                        {video.resume && <span className="mt-1 block text-sm text-white/70">{video.resume}</span>}
                      </span>
                      <span className="grid size-11 place-items-center rounded-full border border-white/25 group-hover:border-[#ffc94d] group-hover:bg-[#ffc94d] group-hover:text-[#0f181b]">
                        <Icon name="play" className="size-3.5" fill="currentColor" stroke="none" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ---- Lecture et confidentialité ---- */}
      <section className="mx-auto max-w-3xl px-4 py-20">
        <h2 className={cx(mono, "text-center", AMBRE)}>Lecture et confidentialité</h2>
        <dl className="mt-8 space-y-4">
          {CONFIDENTIALITE.map(([t, d]) => (
            <div key={t} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:gap-10">
              <dt className={cx(mono, "pt-1 text-[10px] text-white/70 sm:text-right")}>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {v.enLecture && (
        <EnSalle
          video={v.enLecture}
          numero={ouverte + 1}
          total={v.toutes.length}
          suivante={v.toutes[ouverte + 1]}
          onSuivante={() => v.lire(v.toutes[ouverte + 1])}
          onFermer={v.fermerLecteur}
        />
      )}
    </div>
  );
}
