import { useState } from "react";
import Icon from "../../components/Icon";
import { cx } from "../../components/classes";
import { champAdmin as champ } from "../../components/ConnexionAdmin";
import { messageErreurAdmin } from "../../sessionAdmin";
import { TAILLE_MAX_PDF, televerserPdf, urlPdf } from "../../contenu";
import { extraireTextePdf } from "../../extrairePdf";
import { formatTaille } from "./outils";

/* ==================================================================
   Les champs des éditeurs : texte, zone, liste, bouton, ordre des
   éléments, et champ de PDF (envoi au relais, lecture du texte).
   ================================================================== */

export function Champ({ label, aide, className, ...props }) {
  return (
    <label className={cx("block text-xs font-semibold text-ink-600 dark:text-ink-300", className)}>
      {label}
      <input {...props} className={cx(champ, "mt-1.5 font-normal")} />
      {aide && <span className="mt-1 block font-normal text-ink-400">{aide}</span>}
    </label>
  );
}

export function Zone({ label, aide, className, mono, ...props }) {
  return (
    <label className={cx("block text-xs font-semibold text-ink-600 dark:text-ink-300", className)}>
      {label}
      <textarea
        {...props}
        className={cx(champ, "mt-1.5 font-normal", mono && "font-mono text-[13px]")}
      />
      {aide && <span className="mt-1 block font-normal text-ink-400">{aide}</span>}
    </label>
  );
}

export function Choix({ label, options, className, ...props }) {
  return (
    <label className={cx("block text-xs font-semibold text-ink-600 dark:text-ink-300", className)}>
      {label}
      <select {...props} className={cx(champ, "mt-1.5 font-normal")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Bouton({ onClick, disabled, variante = "secondaire", icone, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variante === "principal"
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : variante === "danger"
            ? "text-flame-600 hover:bg-flame-100 dark:text-flame-400 dark:hover:bg-flame-500/10"
            : "border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800",
        className
      )}
    >
      {icone && <Icon name={icone} className="size-4" />}
      {children}
    </button>
  );
}

/* Monter, descendre, supprimer un élément d'une liste. */
export function Ordre({ index, taille, onDeplacer, onSupprimer, libelle }) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        disabled={index === 0}
        onClick={() => onDeplacer(index, index - 1)}
        aria-label={`Monter ${libelle}`}
        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
      >
        <Icon name="chevron" className="size-4 rotate-180" />
      </button>
      <button
        type="button"
        disabled={index === taille - 1}
        onClick={() => onDeplacer(index, index + 1)}
        aria-label={`Descendre ${libelle}`}
        className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
      >
        <Icon name="chevron" className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => onSupprimer(index)}
        aria-label={`Supprimer ${libelle}`}
        className="rounded-lg p-1.5 text-flame-600 hover:bg-flame-100 dark:text-flame-400 dark:hover:bg-flame-500/10"
      >
        <Icon name="trash" className="size-4" />
      </button>
    </div>
  );
}

/* Un champ de PDF : choisir un fichier, l'envoyer au relais, et en lire
   le texte pour l'assistant IA (si `lireTexte`).

   Le fichier part tout de suite au relais (il faut bien le stocker),
   mais les étudiants ne le voient qu'après « Publier », comme le reste.
   `onChange(pdf, texte)` reçoit la référence du fichier et le texte lu. */
export function ChampPdf({ libelle, pdf, onChange, onRetirer, motDePasse, lireTexte = false, texte = "", aide }) {
  const [etat, setEtat] = useState({ type: "", texte: "" });

  const choisir = async (fichier) => {
    if (!fichier) return;
    if (fichier.type && fichier.type !== "application/pdf") {
      setEtat({ type: "erreur", texte: "Choisis un fichier PDF." });
      return;
    }
    if (fichier.size > TAILLE_MAX_PDF) {
      setEtat({ type: "erreur", texte: messageErreurAdmin("pdf-trop-gros") });
      return;
    }
    try {
      setEtat({ type: "", texte: `Envoi de « ${fichier.name} » (${formatTaille(fichier.size)})…` });
      const envoye = await televerserPdf(fichier, motDePasse);
      if (!lireTexte) {
        onChange(envoye, "");
        setEtat({ type: "ok", texte: "PDF envoyé." });
        return;
      }

      // Sans texte, le PDF reste lisible par les étudiants : seul
      // l'assistant IA en est privé. On distingue un PDF sans texte
      // (scanné) d'une lecture qui a échoué (connexion, pdf.js).
      setEtat({ type: "", texte: "Lecture du texte pour l'assistant IA…" });
      let lu = "";
      let echec = false;
      try {
        lu = await extraireTextePdf(fichier);
      } catch {
        echec = true;
      }
      onChange(envoye, lu);
      setEtat(
        lu
          ? { type: "ok", texte: `PDF envoyé. L'assistant IA pourra s'appuyer sur ${lu.length.toLocaleString("fr-FR")} caractères de texte.` }
          : echec
            ? { type: "attention", texte: "PDF envoyé, mais la lecture de son texte a échoué (connexion ?). Les étudiants le liront normalement ; pour l'assistant IA, envoie-le à nouveau plus tard." }
            : { type: "attention", texte: "PDF envoyé, mais il ne contient pas de texte lisible : c'est sans doute un PDF scanné. Les étudiants le liront normalement, l'assistant IA ne pourra pas s'en servir." }
      );
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">{libelle}</p>
      {pdf ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-950">
          <Icon name="file" className="size-5 text-flame-500" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">{pdf.nom}</span>
            <span className="text-xs text-ink-500">
              {formatTaille(pdf.taille)}
              {lireTexte &&
                ` · ${texte ? `${texte.length.toLocaleString("fr-FR")} caractères lus par l'IA` : "texte non lisible par l'IA"}`}
            </span>
          </span>
          <a
            href={urlPdf(pdf.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
          >
            Ouvrir ↗
          </a>
          {onRetirer && (
            <button
              type="button"
              onClick={onRetirer}
              className="text-sm font-medium text-flame-600 hover:underline dark:text-flame-400"
            >
              Retirer
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-500 dark:text-ink-400">Aucun PDF.</p>
      )}

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-ink-200 px-3.5 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800">
        <Icon name="plus" className="size-4" />
        {pdf ? "Remplacer le PDF" : "Choisir un PDF"}
        <input
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          aria-label={libelle}
          onChange={(e) => {
            choisir(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {aide && <p className="text-xs text-ink-400">{aide}</p>}

      {etat.texte && (
        <p
          role="status"
          className={cx(
            "text-xs/5",
            etat.type === "erreur"
              ? "text-flame-600 dark:text-flame-400"
              : etat.type === "attention"
                ? "text-sun-700 dark:text-sun-400"
                : etat.type === "ok"
                  ? "text-accent-700 dark:text-accent-400"
                  : "text-ink-500"
          )}
        >
          {etat.texte}
        </p>
      )}
    </div>
  );
}

/* Écrire, ou donner en PDF : le même choix pour un cours, un exercice
   ou un examen. */
export function ChoixFormat({ valeur, options, onChange }) {
  return (
    <div role="radiogroup" aria-label="Forme du contenu" className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          role="radio"
          aria-checked={valeur === o.valeur}
          onClick={() => onChange(o.valeur)}
          className={cx(
            "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            valeur === o.valeur
              ? "bg-brand-600 text-white"
              : "text-ink-600 ring-1 ring-ink-200 ring-inset hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
          )}
        >
          <Icon name={o.icone} className="size-4" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Ouvre l'aperçu : le contenu tel que les étudiants le verront. */
export function BoutonApercu({ onClick, desactive }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desactive}
      title={desactive ? "Écris le texte ou ajoute un PDF d'abord" : undefined}
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 ring-1 ring-brand-200 ring-inset hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-brand-300 dark:ring-ink-700 dark:hover:bg-ink-800"
    >
      <Icon name="search" className="size-4" />
      Aperçu étudiant
    </button>
  );
}
