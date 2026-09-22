import { cx } from "./ui";

/* ==================================================================
   Un texte saisi dans l'espace admin (cours, énoncé, corrigé).

   Affiché comme du texte, jamais comme du HTML : ce qui a été saisi ne
   peut donc pas injecter de code dans la page. Une ligne vide sépare
   deux paragraphes, et les retours à la ligne sont conservés, ce qui
   suffit aux listes numérotées et aux calculs posés ligne à ligne.
   ================================================================== */

export default function TexteLibre({ texte, className }) {
  const paragraphes = String(texte ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className={cx("space-y-3 text-sm/7 text-ink-700 dark:text-ink-300", className)}>
      {paragraphes.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          {p}
        </p>
      ))}
    </div>
  );
}
