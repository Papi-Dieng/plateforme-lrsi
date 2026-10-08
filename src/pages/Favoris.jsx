import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { cx } from "../components/classes";
import {
  dateLisible,
  lireFavoris,
  litRefChapitre,
  retirerFavori,
} from "../progression";
import { getMatiere } from "../data/matieres";
import { getExercice } from "../data/exercices";
import { getQcm } from "../data/qcm";
import { videosSuggerees } from "../data/videos";

/* ==================================================================
   Mes favoris.

   Un favori ne conserve qu'un type et une référence. La page résout
   chaque référence au moment de l'affichage : si un contenu a été
   supprimé ou renommé depuis, le favori est signalé comme introuvable
   plutôt que de faire disparaître la ligne sans explication.

   Mise en page d'après la maquette « Mes favoris » (7 octobre 2026) :
   encre marine et rouge marque-page. Les filtres sont des signets qui
   pendent du haut de la page ; un favori se retire en cliquant sur le
   signet rouge de sa carte ; une matière occupe une carte large et
   sombre.
   ================================================================== */

const libellesType = {
  matiere: { label: "Matières", singulier: "Matière", icone: "folder" },
  chapitre: { label: "Chapitres", singulier: "Chapitre", icone: "book" },
  exercice: { label: "Exercices", singulier: "Exercice", icone: "pencil" },
  qcm: { label: "QCM", singulier: "QCM", icone: "target" },
  video: { label: "Vidéos", singulier: "Vidéo", icone: "video" },
};

/* ---- Résolution d'un favori vers le contenu qu'il désigne ---- */

function resoudre(favori) {
  const { type, reference } = favori;

  if (type === "matiere") {
    const m = getMatiere(reference);
    if (!m) return null;
    return { titre: m.nom, detail: m.resume, matiere: m, lien: `/cours/${m.id}` };
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
      questions: q.questions.length,
    };
  }

  if (type === "video") {
    const v = videosSuggerees.find((x) => x.id === reference && x.youtubeId);
    if (!v) return null;
    return {
      titre: v.titre,
      detail: v.resume ?? "",
      matiere: getMatiere(v.matiere),
      // Le titre ouvre la vidéo dans la page Vidéos.
      lien: `/videos?v=${encodeURIComponent(v.id)}`,
      youtubeId: v.youtubeId,
    };
  }

  return null;
}

/* ================================================================== */

const ENCRE = "text-[#1c1838] dark:text-white";
const ROUGE = "text-[#a3261a] dark:text-[#ff8a75]";
const DOUX = "text-ink-600 dark:text-ink-300";
const mono = "font-mono text-[11px] font-bold tracking-[0.16em] uppercase";
const ENTAILLE = { clipPath: "polygon(0 0,100% 0,100% 100%,50% calc(100% - 14px),0 100%)" };
const MARQUE = { clipPath: "polygon(0 0,100% 0,100% 100%,50% 75%,0 100%)" };

function Signet({ actif, label, nombre, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cx(
        "flex w-11 flex-col items-center gap-3 pt-4 transition-[height,background-color] sm:w-14",
        actif
          ? "h-56 bg-[#d4371f] pb-8 text-white sm:h-72"
          : "h-36 bg-white pb-6 text-[#1c1838] shadow-[0_8px_18px_-8px_#1c183840] hover:h-40 sm:h-44 sm:hover:h-48 dark:bg-ink-800 dark:text-white"
      )}
      style={ENTAILLE}
    >
      <span className={cx(mono, "rotate-180 text-[10px] [writing-mode:vertical-rl]")}>{label}</span>
      <span className="mt-auto text-xl font-black">{nombre}</span>
    </button>
  );
}

/* Une vidéo mise en favori : sa miniature en fond, et la lecture sur
   place. Le lecteur YouTube (mode confidentialité renforcée) ne se
   charge qu'au premier clic ; ensuite le même bouton met en pause et
   relance, en parlant au lecteur par messages (enablejsapi). */
function LecteurFavori({ titre, youtubeId }) {
  const [etat, setEtat] = useState("arret"); // arret → lecture ⇄ pause
  const cadre = useRef(null);
  const commander = (func) =>
    cadre.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args: [] }), "https://www.youtube-nocookie.com");
  const basculer = () => {
    if (etat === "arret") setEtat("lecture");
    else if (etat === "lecture") {
      commander("pauseVideo");
      setEtat("pause");
    } else {
      commander("playVideo");
      setEtat("lecture");
    }
  };
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-[#1c1838] sm:aspect-auto sm:w-1/2">
      {etat === "arret" ? (
        <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      ) : (
        <iframe
          ref={cadre}
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`}
          title={titre}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full"
        />
      )}
      <button
        type="button"
        onClick={basculer}
        aria-label={etat === "lecture" ? `Mettre en pause : ${titre}` : `Lire ici : ${titre}`}
        className={cx(
          "absolute grid place-items-center rounded-full bg-[#d4371f] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          etat === "arret" ? "top-1/2 left-1/2 size-16 -translate-1/2" : "bottom-3 left-3 size-11"
        )}
      >
        <Icon name={etat === "lecture" ? "pause" : "play"} className={etat === "arret" ? "size-6" : "size-4"} fill={etat === "lecture" ? "none" : "currentColor"} stroke={etat === "lecture" ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function Carte({ f, onRetirer }) {
  const info = libellesType[f.type];
  const c = f.contenu;
  const large = Boolean(c) && f.type === "matiere";
  const video = Boolean(c) && f.type === "video";

  return (
    <li className={cx((large || video) && "md:col-span-2")}>
      <article
        className={cx(
          "relative flex h-full overflow-hidden border",
          video && "flex-col sm:flex-row",
          large
            ? "border-[#1c1838] bg-[#1c1838] text-white dark:border-white/10"
            : "border-[#1c1838]/10 bg-white dark:border-white/10 dark:bg-ink-900"
        )}
      >
        {video && <LecteurFavori titre={c.titre} youtubeId={c.youtubeId} />}

        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className={cx("flex flex-wrap items-center gap-2.5 pr-10", !large && ENCRE)}>
            <span className={cx("grid size-8 place-items-center", large ? "bg-white/10" : "bg-[#f3f2f8] dark:bg-white/10")}>
              <Icon name={info.icone} className="size-4" />
            </span>
            <span className={cx(mono, "text-[10px]")}>{info.singulier}</span>
            {c?.complement && (
              <span
                className={cx(
                  mono,
                  "border px-1.5 py-0.5 text-[9px]",
                  c.complement === "Bientôt" ? "border-[#d4371f]/30 bg-[#fde8e4] text-[#a3261a]" : "border-current"
                )}
              >
                {c.complement}
              </span>
            )}
          </div>

          {c ? (
            <>
              <Link
                to={c.lien}
                className={cx(
                  "mt-4 block font-black tracking-[-0.03em] text-balance hover:underline",
                  large ? "text-4xl sm:text-5xl" : cx("text-xl", ENCRE)
                )}
              >
                {c.titre}
              </Link>
              {f.type === "exercice" && c.detail ? (
                <>
                  <p className={cx(mono, "mt-3 text-[10px]", ROUGE)}>Énoncé</p>
                  <p className="mt-2 line-clamp-4 bg-[#f3f2f8] p-3 text-sm/6 text-ink-700 dark:bg-white/5 dark:text-ink-200">{c.detail}</p>
                </>
              ) : (
                c.detail && <p className={cx("mt-3 line-clamp-3 text-sm/6", large ? "text-white/80" : DOUX)}>{c.detail}</p>
              )}
              {c.questions > 0 && (
                <p className={cx(mono, "mt-4 text-[10px]", ENCRE)}>
                  <span className={ROUGE}>{c.questions}</span> questions
                </p>
              )}
              <span className="h-5 shrink-0" aria-hidden="true" />
              <p
                className={cx(
                  "mt-auto flex flex-wrap justify-between gap-x-4 gap-y-1 border-t pt-4 text-xs",
                  large ? "border-white/15 text-white/80" : cx("border-[#1c1838]/10 dark:border-white/10", DOUX)
                )}
              >
                {!large && c.matiere && <span className={cx("font-bold", ENCRE)}>{c.matiere.nom}</span>}
                {f.date && <span>ajouté le {dateLisible(f.date)}</span>}
              </p>
            </>
          ) : (
            <>
              <p className={cx("mt-4 text-xl font-black", ENCRE)}>Contenu introuvable</p>
              <p className={cx("mt-2 text-sm/6", DOUX)}>
                Cette référence n'existe plus. Elle a sans doute été renommée ou retirée.
              </p>
              <p className={cx("mt-auto pt-4 font-mono text-[11px]", DOUX)}>
                {f.type} · {f.reference}
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => onRetirer(f)}
          aria-label={`Retirer ${c?.titre ?? f.reference} des favoris`}
          title="Retirer des favoris"
          className="absolute top-0 right-5 h-12 w-7 bg-[#d4371f] transition-[height] hover:h-14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4371f]"
          style={MARQUE}
        />
      </article>
    </li>
  );
}

export default function Favoris() {
  const [favoris, setFavoris] = useState(lireFavoris);
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
      favoris
        .map((f) => ({ ...f, contenu: resoudre(f) }))
        .sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))),
    [favoris]
  );

  const comptes = {};
  resolus.forEach((f) => {
    comptes[f.type] = (comptes[f.type] ?? 0) + 1;
  });
  const types = Object.keys(libellesType).filter((t) => comptes[t]);
  const affiches = resolus.filter((f) => type === "tous" || f.type === type);
  const retirer = (f) => setFavoris(retirerFavori(f.type, f.reference));
  const vide = resolus.length === 0;

  return (
    <div className="bg-[#f3f2f8] dark:bg-ink-950">
      <header className="border-b border-[#1c1838]/10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap-reverse items-start justify-between gap-x-8 px-4 sm:px-6">
          <div className="pt-12 pb-14 sm:pt-16">
            <p className={cx(mono, ROUGE)}>Ma sélection</p>
            <h1 className={cx("mt-6 text-7xl/[0.85] font-black tracking-[-0.06em] sm:text-9xl/[0.85]", ENCRE)}>
              Mes <br />
              favoris
            </h1>
            <p className={cx("mt-8 max-w-md", DOUX)}>
              Tout ce que tu as mis de côté : matières, chapitres, exercices, QCM et vidéos. Le marque-page se trouve sur chaque carte.
            </p>
          </div>

          <div className="max-w-full border-t-8 border-[#1c1838] dark:border-white/80">
            <p id="filtre-favoris" className={cx(mono, "mt-3 mb-1 text-[10px]", DOUX)}>
              Filtrer par type
            </p>
            {vide ? (
              <div aria-hidden="true" className="flex gap-6 px-6">
                {[36, 44, 32].map((h) => (
                  <span key={h} className="w-14 border-2 border-dashed border-ink-300 dark:border-ink-600" style={{ height: h * 4 }} />
                ))}
              </div>
            ) : (
              <div role="group" aria-labelledby="filtre-favoris" className="flex items-start gap-2 sm:gap-3">
                <Signet actif={type === "tous"} label="Tous" nombre={resolus.length} onClick={() => setType("tous")} />
                {types.map((t) => (
                  <Signet key={t} actif={type === t} label={libellesType[t].label} nombre={comptes[t]} onClick={() => setType(t)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        {vide ? (
          <div className="flex flex-wrap items-center justify-between gap-10">
            <div className="max-w-xl">
              <h2 className={cx("text-5xl/[0.95] font-black tracking-[-0.05em]", ENCRE)}>Aucun favori pour l'instant</h2>
              <p className={cx("mt-4", DOUX)}>
                Clique sur le marque-page d'une matière, d'un chapitre, d'un exercice, d'un QCM ou d'une vidéo pour la retrouver ici.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/cours"
                  className="inline-flex min-h-12 items-center gap-2 bg-[#1c1838] px-5 font-extrabold text-white hover:bg-[#2c2752] dark:bg-white dark:text-[#1c1838]"
                >
                  Parcourir les cours
                  <Icon name="arrow" className="size-4" />
                </Link>
                <Link
                  to="/exercices"
                  className={cx("inline-flex min-h-12 items-center border border-[#1c1838] px-5 font-extrabold hover:bg-white dark:border-white dark:hover:bg-white/10", ENCRE)}
                >
                  Voir les exercices
                </Link>
              </div>
            </div>
            <div aria-hidden="true" className="w-full max-w-sm">
              <p className={cx(mono, "text-right text-[10px]", ROUGE)}>Le marque-page</p>
              <div className="relative mt-2 border border-dashed border-ink-300 bg-white/60 p-7 dark:border-ink-600 dark:bg-white/5">
                <span className="absolute top-0 right-5 h-14 w-8 bg-[#d4371f]" style={MARQUE} />
                <span className="block size-9 bg-ink-200 dark:bg-ink-700" />
                <span className="mt-4 block h-4 w-4/5 bg-ink-200 dark:bg-ink-700" />
                <span className="mt-3 block h-2.5 w-3/5 bg-ink-200 dark:bg-ink-700" />
                <span className="mt-3 block h-2.5 w-2/5 bg-ink-200 dark:bg-ink-700" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className={cx("text-4xl font-black tracking-[-0.05em]", ENCRE)}>
                {affiches.length} favori{affiches.length > 1 ? "s" : ""}
              </h2>
              <p className={cx(mono, "text-[10px]", DOUX)}>Du plus récent au plus ancien</p>
            </div>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {affiches.map((f) => (
                <Carte key={`${f.type}-${f.reference}`} f={f} onRetirer={retirer} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
