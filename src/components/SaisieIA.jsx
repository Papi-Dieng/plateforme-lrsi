import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cx } from "./classes";
import { dicteePossible, useDictee } from "../dictee";
import { messageErreurImage, preparerImage } from "../images";
import { RACCOURCIS as MODES } from "../assistant";

/* ==================================================================
   Zone de saisie de l'assistant : une pilule sombre, la question, et
   une rangée d'actions.

   Apparence inspirée du composant « AI Prompt Box » publié sur 21st.dev
   (pilule sombre, raccourcis colorés, bouton rond qui change selon la
   situation). Aucune licence n'y étant indiquée, rien n'a été copié :
   le composant est écrit ici, sans dépendance. Voir LICENCES-TIERS.md.

   Tout ce qui est affiché fait vraiment quelque chose :
   - le bouton rond envoie ; pendant la réponse, il devient un carré qui
     l'arrête ; champ vide, il devient un micro si le navigateur sait
     dicter (voir src/dictee.js) ;
   - le trombone joint une image, réduite avant l'envoi (src/images.js).
     On peut aussi la coller ou la glisser dans la zone ;
   - les trois raccourcis orientent la réponse : expliquer une notion,
     proposer un exercice, interroger. La page affiche le mode choisi
     avec la question ;
   - Entrée envoie, Maj + Entrée va à la ligne.
   ================================================================== */

const HAUTEUR_MAX = 240;


// Écrites en toutes lettres, pour que Tailwind les produise.
const STYLE_MODE = {
  sky: "border-sky-400 bg-sky-400/15 text-sky-300",
  violet: "border-violet-400 bg-violet-400/15 text-violet-300",
  flame: "border-flame-400 bg-flame-400/15 text-flame-300",
};

// Hauteurs fixes des barres pendant la dictée : décoratives, elles
// disent seulement « j'écoute ».
const BARRES = [40, 70, 55, 90, 35, 65, 80, 45, 60, 95, 50, 75, 30, 85, 55, 70, 40, 60, 90, 45, 65, 35, 80, 50];

/* Une infobulle au survol et au clavier. Le bouton porte déjà son nom
   (aria-label) : l'infobulle n'est qu'un rappel visuel. */
function Infobulle({ texte, children }) {
  return (
    <span className="group/bulle relative inline-flex">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 rounded-md border border-ink-700 bg-ink-950 px-2.5 py-1 text-xs whitespace-nowrap text-white opacity-0 shadow-md transition-opacity group-focus-within/bulle:opacity-100 group-hover/bulle:opacity-100"
      >
        {texte}
      </span>
    </span>
  );
}

function Separateur() {
  return <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-gradient-to-t from-transparent via-violet-400/70 to-transparent" />;
}

function Visionneuse({ image, onFermer }) {
  const fermer = useRef(null);
  useEffect(() => {
    fermer.current?.focus();
    const surTouche = (e) => e.key === "Escape" && onFermer();
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Image jointe" className="relative" onClick={(e) => e.stopPropagation()}>
        <img src={image.apercu} alt={`Image jointe : ${image.nom}`} className="max-h-[80vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" />
        <button
          ref={fermer}
          type="button"
          onClick={onFermer}
          aria-label="Fermer l'aperçu"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-ink-900/80 text-white hover:bg-ink-900"
        >
          <Icon name="close" className="size-5" />
        </button>
      </div>
    </div>
  );
}

const formatDuree = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function SaisieIA({ id, libelle, valeur, onChange, onEnvoyer, enAttente = false, onArreter, avecImage = true, placeholder }) {
  const zone = useRef(null);
  const fichier = useRef(null);
  const [mode, setMode] = useState(null);
  const [image, setImage] = useState(null);
  const [erreur, setErreur] = useState("");
  const [apercuOuvert, setApercuOuvert] = useState(false);
  const [micro] = useState(dicteePossible);
  const dictee = useDictee(onChange);

  const contenu = Boolean(valeur.trim()) || Boolean(image);

  // La zone suit la hauteur du texte, jusqu'à 240 pixels ; au-delà, elle défile.
  useLayoutEffect(() => {
    const el = zone.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, HAUTEUR_MAX)}px`;
  }, [valeur, dictee.enCours]);

  const joindre = async (f) => {
    if (!f) return;
    setErreur("");
    try {
      setImage(await preparerImage(f));
    } catch (e) {
      setErreur(messageErreurImage(e.message));
    }
  };

  const envoyer = () => {
    if (!contenu || enAttente || dictee.enCours) return;
    onEnvoyer({ texte: valeur.trim(), mode, image });
    setImage(null);
    setErreur("");
  };

  const bouton = enAttente
    ? { nom: "Arrêter la réponse", icone: "stop", action: onArreter, style: "bg-white text-ink-950 hover:bg-white/80" }
    : dictee.enCours
      ? { nom: "Arrêter la dictée", icone: "stop", action: dictee.arreter, style: "bg-transparent text-rose-400 hover:bg-white/10" }
      : contenu
        ? { nom: "Envoyer", icone: "haut", action: envoyer, style: "bg-white text-ink-950 hover:bg-white/80" }
        : micro
          ? { nom: "Dicter ma question", icone: "micro", action: () => dictee.demarrer(valeur), style: "bg-transparent text-ink-300 hover:bg-white/10 hover:text-white" }
          : { nom: "Envoyer", icone: "haut", action: envoyer, style: "bg-transparent text-ink-400", desactive: true };

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          envoyer();
        }}
        onDragOver={(e) => avecImage && e.preventDefault()}
        onDrop={(e) => {
          if (!avecImage) return;
          e.preventDefault();
          joindre([...e.dataTransfer.files].find((f) => f.type.startsWith("image/")));
        }}
        className={cx(
          "rounded-3xl border bg-ink-900 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-colors duration-300 focus-within:ring-2 focus-within:ring-brand-400/60 dark:bg-ink-950",
          enAttente ? "border-flame-500/70" : dictee.enCours ? "border-rose-500/70" : "border-ink-700"
        )}
      >
        {image && !dictee.enCours && (
          <div className="flex gap-2 px-1 pb-1">
            <div className="relative size-16 overflow-hidden rounded-xl">
              <button type="button" onClick={() => setApercuOuvert(true)} aria-label={`Agrandir l'image jointe : ${image.nom}`} className="size-full">
                <img src={image.apercu} alt="" className="size-full object-cover" />
              </button>
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Retirer l'image"
                className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/70 text-white hover:bg-black"
              >
                <Icon name="close" className="size-3" />
              </button>
            </div>
          </div>
        )}

        {dictee.enCours ? (
          <div className="flex flex-col items-center py-3" role="status">
            <p className="mb-3 flex items-center gap-2 text-sm text-white/80">
              <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-rose-500" />
              <span className="font-mono">{formatDuree(dictee.secondes)}</span>
              <span>· Parle, j'écris ta question</span>
            </p>
            <div aria-hidden="true" className="flex h-10 w-full items-center justify-center gap-0.5 px-4">
              {BARRES.map((h, i) => (
                <span key={i} className="w-0.5 animate-pulse rounded-full bg-white/50" style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            {valeur && <p className="mt-2 line-clamp-2 px-3 text-center text-sm text-ink-200">{valeur}</p>}
          </div>
        ) : (
          <>
            <label htmlFor={id} className="sr-only">
              {libelle}
            </label>
            <textarea
              ref={zone}
              id={id}
              value={valeur}
              maxLength={1500}
              rows={1}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  envoyer();
                }
              }}
              onPaste={(e) => {
                if (!avecImage) return;
                const f = [...e.clipboardData.files].find((x) => x.type.startsWith("image/"));
                if (f) {
                  e.preventDefault();
                  joindre(f);
                }
              }}
              placeholder={mode ? MODES[mode].placeholder : placeholder}
              className="block min-h-11 w-full resize-none rounded-md border-none bg-transparent px-3 py-2.5 text-base text-ink-100 placeholder:text-ink-400 focus:outline-none [scrollbar-color:#444_transparent] [scrollbar-width:thin]"
            />
          </>
        )}

        {(erreur || dictee.erreur) && (
          <p role="alert" className="px-3 pb-1 text-xs text-flame-300">
            {erreur || dictee.erreur}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <div className={cx("flex items-center gap-1", dictee.enCours && "invisible")}>
            {avecImage && (
              <Infobulle texte="Joindre une image">
                <button
                  type="button"
                  onClick={() => fichier.current?.click()}
                  aria-label="Joindre une image"
                  className="grid size-8 place-items-center rounded-full text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Icon name="trombone" className="size-5" />
                </button>
                <input
                  ref={fichier}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  tabIndex={-1}
                  onChange={(e) => {
                    joindre(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </Infobulle>
            )}

            {Object.entries(MODES).map(([cle, m], i) => {
              const actif = mode === cle;
              return (
                <span key={cle} className="flex items-center">
                  {(i > 0 || avecImage) && <Separateur />}
                  <button
                    type="button"
                    onClick={() => setMode(actif ? null : cle)}
                    aria-pressed={actif}
                    aria-label={m.label}
                    className={cx(
                      "flex h-8 items-center gap-1 rounded-full border px-2 transition-colors",
                      actif ? STYLE_MODE[m.couleur] : "border-transparent text-ink-300 hover:text-white"
                    )}
                  >
                    <Icon name={m.icone} className={cx("size-4 transition-transform duration-300 motion-reduce:transition-none", actif && "rotate-[360deg] scale-110")} />
                    {actif && <span className="text-xs whitespace-nowrap">{m.label}</span>}
                  </button>
                </span>
              );
            })}
          </div>

          <Infobulle texte={bouton.nom}>
            <button
              type="button"
              onClick={bouton.action}
              disabled={bouton.desactive}
              aria-label={bouton.nom}
              className={cx("grid size-8 place-items-center rounded-full transition-colors disabled:cursor-not-allowed", bouton.style)}
            >
              <Icon name={bouton.icone} className={cx("size-4", bouton.icone === "micro" && "size-5", enAttente && "animate-pulse")} />
            </button>
          </Infobulle>
        </div>
      </form>

      {apercuOuvert && image && <Visionneuse image={image} onFermer={() => setApercuOuvert(false)} />}
    </>
  );
}
