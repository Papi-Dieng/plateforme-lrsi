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
    <label className={cx("block text-sm font-extrabold text-ink-950 dark:text-white", className)}>
      {label}
      <input {...props} className={cx(champ, "mt-2 font-normal")} />
      {aide && <span className="mt-1.5 block text-[13px]/5 font-normal text-ink-500 dark:text-ink-400">{aide}</span>}
    </label>
  );
}

export function Zone({ label, aide, className, mono, ...props }) {
  return (
    <label className={cx("block text-sm font-extrabold text-ink-950 dark:text-white", className)}>
      {label}
      <textarea
        {...props}
        wrap={mono ? "off" : undefined}
        className={cx(champ, "mt-2 font-normal", mono && "border-ink-950! bg-[#0b0e17]! font-mono text-[13px]/6 text-ink-100! placeholder:text-ink-500 dark:border-ink-700!")}
      />
      {aide && <span className="mt-1.5 block text-[13px]/5 font-normal text-ink-500 dark:text-ink-400">{aide}</span>}
    </label>
  );
}

export function Choix({ label, options, className, ...props }) {
  return (
    <label className={cx("block text-sm font-extrabold text-ink-950 dark:text-white", className)}>
      {label}
      <select {...props} className={cx(champ, "mt-2 font-normal")}>
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
        "inline-flex min-h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variante === "principal"
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : variante === "danger"
            ? "text-flame-600 hover:bg-flame-100 dark:text-flame-400 dark:hover:bg-flame-500/10"
            : "border border-ink-200 bg-white text-ink-950 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800",
        className
      )}
    >
      {icone && <Icon name={icone} className="size-4" />}
      {children}
    </button>
  );
}

/* Une section numérotée de l'éditeur, dans sa propre carte : « 01 Fiche »,
   « 02 Énoncé »… (maquette « admin Sunu Cours »). */
export function Section({ numero, titre, aide, children }) {
  return (
    <section className="rounded-[24px] border border-ink-200 bg-white p-5 sm:p-7 dark:border-ink-800 dark:bg-ink-900">
      <h3 className="flex items-baseline gap-3 text-[24px] font-extrabold tracking-tight text-ink-950 dark:text-white">
        <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">{String(numero).padStart(2, "0")}</span>
        {titre}
      </h3>
      {aide && <p className="mt-1.5 text-[13px]/5 text-ink-500 dark:text-ink-400">{aide}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

/* Un choix parmi quelques valeurs, en boutons côte à côte (Facile,
   Moyen, Difficile). */
export function Segments({ label, valeur, options, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-extrabold text-ink-950 dark:text-white">{label}</legend>
      <div className="mt-2 flex rounded-[14px] border border-ink-200 bg-white p-1 dark:border-ink-700 dark:bg-ink-950">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={valeur === o}
            onClick={() => onChange(o)}
            className={cx(
              "min-h-10 flex-1 rounded-[10px] px-3 text-sm font-bold transition-colors",
              valeur === o ? "bg-ink-950 text-white dark:bg-white dark:text-ink-950" : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
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
        className="rounded-lg p-1.5 text-ink-500 dark:text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
      >
        <Icon name="chevron" className="size-4 rotate-180" />
      </button>
      <button
        type="button"
        disabled={index === taille - 1}
        onClick={() => onDeplacer(index, index + 1)}
        aria-label={`Descendre ${libelle}`}
        className="rounded-lg p-1.5 text-ink-500 dark:text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
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
      <p className="text-sm font-extrabold text-ink-950 dark:text-white">{libelle}</p>
      {aide && <p className="text-[13px]/5 text-ink-500 dark:text-ink-400">{aide}</p>}
      <div className="flex flex-wrap items-center gap-3 rounded-[16px] border border-dashed border-ink-300 bg-ink-50/70 px-4 py-3 dark:border-ink-700 dark:bg-ink-950">
      {pdf ? (
        <>
          <Icon name="file" className="size-5 text-flame-500" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink-900 dark:text-white">{pdf.nom}</span>
            <span className="text-xs text-ink-500 dark:text-ink-400">
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
        </>
      ) : (
        <p className="min-w-0 flex-1 text-sm text-ink-500 dark:text-ink-400">Aucun PDF.</p>
      )}

      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[14px] border border-ink-200 bg-white px-4 text-sm font-bold text-ink-950 hover:bg-ink-50 focus-within:ring-2 focus-within:ring-brand-500/40 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100 dark:hover:bg-ink-800">
        <Icon name="haut" className="size-4" />
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
      </div>

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
                  : "text-ink-500 dark:text-ink-400"
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
