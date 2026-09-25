import { cx } from "./classes";

/* ==================================================================
   Un texte saisi dans l'espace admin (cours, énoncé, corrigé).

   Affiché comme du texte, jamais comme du HTML : ce qui a été saisi ne
   peut donc pas injecter de code dans la page. Une mise en forme simple
   est reconnue, et un texte sans elle s'affiche comme avant :

     # Titre, ## Sous-titre, ### Petit titre   (en début de ligne)
     - élément de liste   ou   1. élément numéroté
     **gras**   *italique*   `code`
     ``` sur une ligne seule : ouvre ou ferme un bloc de code

   Une ligne vide sépare deux paragraphes. Dans un paragraphe, les
   retours à la ligne et les espaces de début de ligne sont conservés,
   ce qui suffit aux calculs posés et aux programmes courts.
   ================================================================== */

export const AIDE_MISE_EN_FORME =
  "Mise en forme : # Titre, ## Sous-titre, - liste, 1. liste numérotée, **gras**, *italique*, `code`, et ``` sur une ligne seule pour un bloc de code.";

/* ---- Découpage en blocs ---- */

const TITRE = /^(#{1,3})\s+(.*)$/;
const PUCE = /^\s*[-*•]\s+(.*)$/;
const NUMERO = /^\s*\d+[.)]\s+(.*)$/;
const CLOTURE = /^\s*```/;

function decouperBlocs(texte) {
  const lignes = String(texte ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocs = [];
  let courant = null;
  const fermer = () => {
    if (courant) blocs.push(courant);
    courant = null;
  };

  for (let i = 0; i < lignes.length; i++) {
    const ligne = lignes[i];

    if (CLOTURE.test(ligne)) {
      fermer();
      const code = [];
      i++;
      while (i < lignes.length && !CLOTURE.test(lignes[i])) code.push(lignes[i++]);
      blocs.push({ type: "code", texte: code.join("\n") });
      continue;
    }
    if (!ligne.trim()) {
      fermer();
      continue;
    }
    const titre = ligne.match(TITRE);
    if (titre) {
      fermer();
      blocs.push({ type: "titre", niveau: titre[1].length, texte: titre[2].trim() });
      continue;
    }
    const puce = ligne.match(PUCE);
    const numero = puce ? null : ligne.match(NUMERO);
    if (puce || numero) {
      const type = puce ? "puces" : "numeros";
      if (courant?.type !== type) {
        fermer();
        courant = { type, elements: [], debut: numero ? parseInt(ligne, 10) || 1 : 1 };
      }
      courant.elements.push((puce ?? numero)[1]);
      continue;
    }
    // Une ligne ordinaire juste après un élément de liste le prolonge.
    if (courant && courant.type !== "paragraphe") {
      courant.elements[courant.elements.length - 1] += `\n${ligne.trim()}`;
      continue;
    }
    if (!courant) courant = { type: "paragraphe", lignes: [] };
    courant.lignes.push(ligne);
  }
  fermer();
  return blocs;
}

/* ---- Gras, italique, code, dans une ligne ---- */

// L'italique ne s'ouvre ni ne se ferme collé à une lettre ou un chiffre :
// « 2*3*4 » et « nb_hotes_max » restent tels quels.
const EN_LIGNE =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|(?<![\p{L}\p{N}*])\*[^*\s][^*\n]*?(?<!\s)\*(?![\p{L}\p{N}*])|(?<![\p{L}\p{N}_])_[^_\s][^_\n]*?(?<!\s)_(?![\p{L}\p{N}_]))/gu;

export function EnLigne({ texte }) {
  const morceaux = String(texte).split(EN_LIGNE);
  return morceaux.map((m, i) => {
    if (i % 2 === 0) return m;
    if (m.startsWith("`")) {
      return (
        <code key={i} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.9em] dark:bg-ink-800">
          {m.slice(1, -1)}
        </code>
      );
    }
    if (m.startsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink-900 dark:text-white">
          {m.slice(2, -2)}
        </strong>
      );
    }
    return <em key={i}>{m.slice(1, -1)}</em>;
  });
}

/* ---- Affichage ---- */

const STYLES_TITRE = {
  1: "text-[1.25em] font-bold",
  2: "text-[1.12em] font-semibold",
  3: "font-semibold",
};

/* `grand` : la taille des énoncés et des corrections d'exercice. */
export default function TexteLibre({ texte, grand = false, className }) {
  const blocs = decouperBlocs(texte);

  return (
    <div
      className={cx(
        "space-y-3",
        grand ? "text-base/7 text-ink-800 dark:text-ink-200" : "text-sm/7 text-ink-700 dark:text-ink-300",
        className
      )}
    >
      {blocs.map((b, i) => {
        if (b.type === "titre") {
          const Balise = `h${b.niveau + 2}`;
          return (
            <Balise key={i} className={cx("pt-2 text-ink-900 dark:text-white", STYLES_TITRE[b.niveau])}>
              <EnLigne texte={b.texte} />
            </Balise>
          );
        }
        if (b.type === "code") {
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-ink-100 px-4 py-3 font-mono text-[0.88em] leading-6 dark:bg-ink-800/70"
            >
              <code>{b.texte}</code>
            </pre>
          );
        }
        if (b.type === "puces" || b.type === "numeros") {
          const Liste = b.type === "puces" ? "ul" : "ol";
          return (
            <Liste
              key={i}
              start={b.type === "numeros" && b.debut !== 1 ? b.debut : undefined}
              className={cx("space-y-1 pl-6", b.type === "puces" ? "list-disc" : "list-decimal")}
            >
              {b.elements.map((e, j) => (
                <li key={j} className="whitespace-pre-line">
                  <EnLigne texte={e} />
                </li>
              ))}
            </Liste>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            <EnLigne texte={b.lignes.join("\n")} />
          </p>
        );
      })}
    </div>
  );
}
