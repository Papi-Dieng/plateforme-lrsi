import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, cx } from "../components/ui";
import ConnexionAdmin, {
  champAdmin as champ,
  ecrireSessionAdmin,
  lireSessionAdmin,
  messageErreurAdmin,
} from "../components/ConnexionAdmin";
import { themesMatiere } from "../data/couleurs";
import { typesRessource } from "../data/bibliotheque";
import { iaActive } from "../ia";
import {
  copieContenu,
  copieContenuParDefaut,
  dateContenu,
  lireContenuAdmin,
  publierContenu,
  restaurerContenu,
  TAILLE_MAX_PDF,
  televerserPdf,
  urlPdf,
} from "../contenu";
import { extraireTextePdf } from "../extrairePdf";
import QuizEnTexte from "../components/QuizEnTexte";
import TexteLibre, { AIDE_MISE_EN_FORME } from "../components/TexteLibre";
import Apercu from "../components/Apercu";
import LectureTexte from "../components/LectureTexte";
import LecteurPdf from "../components/LecteurPdf";
import { CorrectionExercice, EnonceExercice } from "../components/AffichageExercice";
import {
  GenerateurQcm,
  PanneauCompetencesIA,
  SuggestionCompetence,
  PanneauImportTD,
  RemplirDepuisPdf,
  SuggestionARetenir,
  texteExercice,
  texteQuestion,
} from "../components/AssistantAdmin";

/* ==================================================================
   Gérer le contenu : matières et cours, compétences, exercices, QCM,
   vidéos, devoirs et examens (`examens` et `annales` dans le code :
   les noms internes datent d'avant le renommage).

   On modifie un BROUILLON, gardé dans la page. Rien ne change pour les
   étudiants tant qu'on n'a pas cliqué « Publier » : le brouillon part
   alors au relais, qui le vérifie et le garde (Cloudflare KV). Les
   étudiants le voient au prochain chargement du site.

   Chaque publication garde la précédente : « Restaurer » annule la
   dernière publication.

   Les identifiants (adresse d'un exercice, d'un QCM…) sont fabriqués à
   la création et ne changent plus : la progression et les favoris des
   étudiants y sont attachés.
   ================================================================== */

const ONGLETS = [
  { cle: "matieres", label: "Matières et cours", icone: "folder" },
  { cle: "competences", label: "Compétences", icone: "layers" },
  { cle: "exercices", label: "Exercices", icone: "pencil" },
  { cle: "qcms", label: "QCM", icone: "target" },
  { cle: "videos", label: "Vidéos", icone: "video" },
  { cle: "examens", label: "Devoirs", icone: "clock" },
  { cle: "annales", label: "Examens", icone: "file" },
  { cle: "ressources", label: "Bibliothèque", icone: "book" },
];

const ICONES_MATIERE = ["network", "terminal", "code", "cpu", "database", "shield", "book", "graduation", "layers"];

/* Un identifiant lisible et unique, fabriqué une fois pour toutes. */
const identifiant = (titre, existants) => {
  const base =
    String(titre || "nouveau")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "nouveau";
  let id = base;
  while (existants.some((e) => e.id === id)) id = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return id;
};

const extraireYoutube = (saisie) => {
  const t = String(saisie ?? "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(t)) return t;
  const m = t.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

/* ------------------------------------------------------------------ */
/* Champs                                                              */
/* ------------------------------------------------------------------ */

function Champ({ label, aide, className, ...props }) {
  return (
    <label className={cx("block text-xs font-semibold text-ink-600 dark:text-ink-300", className)}>
      {label}
      <input {...props} className={cx(champ, "mt-1.5 font-normal")} />
      {aide && <span className="mt-1 block font-normal text-ink-400">{aide}</span>}
    </label>
  );
}

function Zone({ label, aide, className, mono, ...props }) {
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

function Choix({ label, options, className, ...props }) {
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

function Bouton({ onClick, disabled, variante = "secondaire", icone, children, className }) {
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
function Ordre({ index, taille, onDeplacer, onSupprimer, libelle }) {
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

const deplacer = (liste, de, vers) => {
  const copie = [...liste];
  const [element] = copie.splice(de, 1);
  copie.splice(vers, 0, element);
  return copie;
};

/* ------------------------------------------------------------------ */
/* Éditeurs, un par type de contenu                                    */
/* ------------------------------------------------------------------ */

const formatTaille = (octets) =>
  octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;

/* Un champ de PDF : choisir un fichier, l'envoyer au relais, et en lire
   le texte pour l'assistant IA (si `lireTexte`).

   Le fichier part tout de suite au relais (il faut bien le stocker),
   mais les étudiants ne le voient qu'après « Publier », comme le reste.
   `onChange(pdf, texte)` reçoit la référence du fichier et le texte lu. */
function ChampPdf({ libelle, pdf, onChange, onRetirer, motDePasse, lireTexte = false, texte = "", aide }) {
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
function ChoixFormat({ valeur, options, onChange }) {
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
function BoutonApercu({ onClick, desactive }) {
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

/* Le cours d'un chapitre : un texte écrit, un PDF, ou les deux. Le
   texte s'affiche sur le site (« Lire ici ») ; le PDF est proposé en
   téléchargement. Sans texte, les étudiants lisent le PDF. */
function CoursChapitre({ chapitre: c, changer, motDePasse }) {
  const [apercu, setApercu] = useState(false);
  return (
    <fieldset className="space-y-4 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
      <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Cours</legend>
      <BoutonApercu onClick={() => setApercu(true)} desactive={!c.contenu?.trim() && !c.pdf} />
      {apercu && (
        <Apercu titre={c.titre || "Chapitre sans titre"} onFermer={() => setApercu(false)}>
          <div className="card p-5">
            {c.resume && <p className="text-sm/6 text-ink-600 dark:text-ink-400">{c.resume}</p>}
            {c.contenu?.trim() ? (
              <LectureTexte libelle="Cours" titre={`Cours : ${c.titre}`} pdf={c.pdf} ouvert className="mt-4">
                <TexteLibre texte={c.contenu} />
              </LectureTexte>
            ) : (
              <LecteurPdf pdf={c.pdf} libelle="Cours en PDF" titre={`Cours : ${c.titre}`} ouvert className="mt-4" />
            )}
          </div>
          {c.statut !== "disponible" && (
            <p className="text-sm text-sun-700 dark:text-sun-400">
              Ce chapitre est « Bientôt » : les étudiants ne verront son cours qu&apos;une fois passé en « Disponible ».
            </p>
          )}
        </Apercu>
      )}
      <Zone
        label="Texte du cours (affiché sur le site)"
        rows={14}
        value={c.contenu ?? ""}
        maxLength={30000}
        placeholder="Le texte complet du cours : définitions, explications, exemples…"
        aide={`${(c.contenu ?? "").length} / 30 000 caractères. Une ligne vide sépare deux paragraphes. Visible seulement si le chapitre est « Disponible ». ${AIDE_MISE_EN_FORME}`}
        onChange={(e) => changer({ contenu: e.target.value })}
      />
      <ChampPdf
        libelle="PDF du cours (facultatif, à télécharger)"
        pdf={c.pdf}
        texte={c.texteIA}
        lireTexte
        motDePasse={motDePasse}
        aide="20 Mo au maximum. Si tu as écrit le texte, « Lire ici » l'affiche et le PDF reste à télécharger ; sinon les étudiants lisent le PDF."
        onChange={(pdf, texteIA) => changer({ pdf, texteIA })}
        onRetirer={() => changer({ pdf: null, texteIA: "" })}
      />
    </fieldset>
  );
}

function EditeurMatiere({ element: m, changer, motDePasse }) {
  const chapitres = m.chapitres;
  const changerChapitre = (i, modif) =>
    changer({ chapitres: chapitres.map((c, j) => (j === i ? { ...c, ...modif } : c)) });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Nom complet" value={m.nom} maxLength={120} onChange={(e) => changer({ nom: e.target.value })} />
        <Champ
          label="Nom court"
          aide="Pour les filtres et les badges."
          value={m.nomCourt}
          maxLength={30}
          onChange={(e) => changer({ nomCourt: e.target.value })}
        />
        <Champ label="Semestre" value={m.semestre} maxLength={40} onChange={(e) => changer({ semestre: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Choix
            label="Couleur"
            value={m.couleur}
            onChange={(e) => changer({ couleur: e.target.value })}
            options={Object.entries(themesMatiere).map(([cle, t]) => ({ value: cle, label: t.nom ?? cle }))}
          />
          <Choix
            label="Icône"
            value={m.icone}
            onChange={(e) => changer({ icone: e.target.value })}
            options={ICONES_MATIERE.map((i) => ({ value: i, label: i }))}
          />
        </div>
      </div>
      <Zone label="Présentation" rows={2} value={m.resume} maxLength={600} onChange={(e) => changer({ resume: e.target.value })} />

      <div>
        <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Chapitres et cours</h3>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
          Le texte du cours s'affiche aux étudiants sous le chapitre, et l'IA s'en sert pour
          répondre. Une ligne vide sépare deux paragraphes. Changer le titre d'un chapitre
          détache les favoris et les compétences qui y renvoient.
        </p>
        <div className="mt-3 space-y-3">
          {chapitres.map((c, i) => (
            <details key={i} className="group rounded-xl border border-ink-200 dark:border-ink-800">
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3">
                <Icon name="chevron" className="size-4 shrink-0 -rotate-90 text-ink-400 transition-transform group-open:rotate-0" />
                <span className="font-mono text-xs text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900 dark:text-white">
                  {c.titre || "Chapitre sans titre"}
                </span>
                <Badge ton={c.statut === "disponible" ? "accent" : "sun"}>
                  {c.statut === "disponible" ? "Disponible" : "Bientôt"}
                </Badge>
                <Badge ton={c.contenu || c.pdf ? "accent" : "neutre"}>
                  {c.contenu && c.pdf ? "texte + PDF" : c.contenu ? "cours rédigé" : c.pdf ? "PDF seul" : "pas de cours"}
                </Badge>
              </summary>
              <div className="space-y-3 border-t border-ink-200 p-4 dark:border-ink-800">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px_150px]">
                  <Champ label="Titre" value={c.titre} maxLength={150} onChange={(e) => changerChapitre(i, { titre: e.target.value })} />
                  <Champ label="Durée" value={c.duree} maxLength={20} placeholder="3 h" onChange={(e) => changerChapitre(i, { duree: e.target.value })} />
                  <Choix
                    label="Statut"
                    value={c.statut}
                    onChange={(e) => changerChapitre(i, { statut: e.target.value })}
                    options={[
                      { value: "disponible", label: "Disponible" },
                      { value: "bientot", label: "Bientôt" },
                    ]}
                  />
                </div>
                <Zone label="Résumé" rows={2} value={c.resume} maxLength={600} onChange={(e) => changerChapitre(i, { resume: e.target.value })} />
                <CoursChapitre
                  chapitre={c}
                  changer={(modif) => changerChapitre(i, modif)}
                  motDePasse={motDePasse}
                />
                <div className="flex justify-end">
                  <Ordre
                    index={i}
                    taille={chapitres.length}
                    libelle={`le chapitre ${c.titre}`}
                    onDeplacer={(de, vers) => changer({ chapitres: deplacer(chapitres, de, vers) })}
                    onSupprimer={(j) =>
                      window.confirm(`Supprimer le chapitre « ${c.titre} » et son cours ?`) &&
                      changer({ chapitres: chapitres.filter((_, k) => k !== j) })
                    }
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
        <Bouton
          icone="plus"
          className="mt-3"
          onClick={() =>
            changer({ chapitres: [...chapitres, { titre: "", resume: "", duree: "", statut: "bientot", format: "texte", contenu: "" }] })
          }
        >
          Ajouter un chapitre
        </Bouton>
      </div>
    </div>
  );
}

const optionsMatieres = (matieres) => [
  { value: "", label: "— Choisir —" },
  ...matieres.map((m) => ({ value: m.id, label: m.nom || m.id })),
];
const optionsCompetences = (competences, matiere) => [
  { value: "", label: "Aucune" },
  ...competences
    .filter((c) => c.matiere === matiere)
    .map((c) => ({ value: c.id, label: c.nom || c.id })),
];

/* Une compétence : ce que l'analyse mesure. Les questions de QCM et les
   exercices y sont rattachés, et elle renvoie vers les chapitres à
   relire quand elle est faible. */
function EditeurCompetence({ element: c, changer, matieres, usages }) {
  const matiere = matieres.find((m) => m.id === c.matiere);
  const titres = matiere?.chapitres.map((ch) => ch.titre) ?? [];
  const orphelins = c.chapitres.filter((t) => !titres.includes(t));
  const basculer = (titre) =>
    changer({
      chapitres: c.chapitres.includes(titre)
        ? c.chapitres.filter((t) => t !== titre)
        : [...c.chapitres, titre],
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ
          label="Nom"
          value={c.nom}
          maxLength={120}
          placeholder="Adressage et sous-réseaux"
          onChange={(e) => changer({ nom: e.target.value })}
        />
        <Choix
          label="Matière"
          value={c.matiere}
          options={optionsMatieres(matieres)}
          onChange={(e) => changer({ matiere: e.target.value, chapitres: [] })}
        />
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-ink-600 dark:text-ink-300">
          Chapitres à relire quand cette compétence est faible
        </legend>
        {titres.length === 0 ? (
          <p className="mt-2 text-sm text-ink-500">Choisis d'abord une matière qui a des chapitres.</p>
        ) : (
          <div className="mt-2 space-y-1">
            {titres.map((t) => (
              <label
                key={t}
                className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800"
              >
                <input
                  type="checkbox"
                  checked={c.chapitres.includes(t)}
                  onChange={() => basculer(t)}
                  className="size-4 accent-brand-600"
                />
                {t}
              </label>
            ))}
          </div>
        )}
        {orphelins.map((t) => (
          <p key={t} className="mt-2 flex items-center gap-2 text-xs text-sun-700 dark:text-sun-400">
            Chapitre introuvable : « {t} »
            <button type="button" onClick={() => basculer(t)} className="font-medium underline">
              retirer
            </button>
          </p>
        ))}
      </fieldset>

      <p className="rounded-xl bg-ink-50 px-4 py-3 text-xs/5 text-ink-600 dark:bg-ink-950 dark:text-ink-400">
        Utilisée par {usages.exercices} exercice(s) et {usages.questions} question(s) de QCM. Une
        compétence n'est jugée qu'à partir de 3 réponses : prévois au moins 3 questions de QCM
        qui s'y rattachent.
      </p>
    </div>
  );
}

function EditeurExercice({ element: e, changer, matieres, competences, motDePasse }) {
  const [apercu, setApercu] = useState(false);
  return (
    <div className="space-y-4">
      <BoutonApercu onClick={() => setApercu(true)} desactive={!e.enonce?.trim() && !e.pdfEnonce} />
      {apercu && (
        <Apercu titre={e.titre || "Exercice sans titre"} onFermer={() => setApercu(false)}>
          <section className="card p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-brand-600 uppercase dark:text-brand-400">
              <Icon name="file" className="size-4" />
              Énoncé
            </h2>
            <EnonceExercice exercice={e} />
          </section>
          {e.indice?.trim() && (
            <section className="rounded-2xl border border-sun-400/40 bg-sun-100/50 p-5 dark:border-sun-500/25 dark:bg-sun-500/10">
              <h2 className="flex items-center gap-2 font-semibold text-sun-900 dark:text-sun-400">
                <Icon name="bulb" className="size-4.5" />
                Indice (affiché à la demande)
              </h2>
              <p className="mt-3 text-sm/7 text-sun-900 dark:text-sun-100/90">{e.indice}</p>
            </section>
          )}
          <section className="card overflow-hidden">
            <h2 className="flex items-center gap-2 border-b border-ink-200 px-6 py-4 font-semibold text-ink-900 dark:border-ink-800 dark:text-white">
              <Icon name="check" className="size-4.5 text-accent-600 dark:text-accent-400" />
              Correction détaillée (affichée quand l&apos;étudiant la demande)
            </h2>
            <div className="px-6 py-6">
              <CorrectionExercice exercice={e} />
            </div>
          </section>
        </Apercu>
      )}
      <Champ label="Titre" value={e.titre} maxLength={150} onChange={(ev) => changer({ titre: ev.target.value })} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Choix label="Matière" value={e.matiere} options={optionsMatieres(matieres)} onChange={(ev) => changer({ matiere: ev.target.value, competence: "" })} />
        <Choix label="Compétence" value={e.competence ?? ""} options={optionsCompetences(competences, e.matiere)} onChange={(ev) => changer({ competence: ev.target.value })} />
        <Choix
          label="Difficulté"
          value={e.difficulte}
          options={["Facile", "Moyen", "Difficile"].map((d) => ({ value: d, label: d }))}
          onChange={(ev) => changer({ difficulte: ev.target.value })}
        />
        <Champ label="Durée" value={e.duree} maxLength={20} placeholder="20 min" onChange={(ev) => changer({ duree: ev.target.value })} />
      </div>
      <SuggestionCompetence
        matiere={matieres.find((m) => m.id === e.matiere)}
        competences={competences}
        texte={texteExercice(e)}
        valeur={e.competence}
        onAppliquer={(id) => changer({ competence: id })}
        motDePasse={motDePasse}
      />
      <Champ
        label="Mots-clés"
        aide="Séparés par des virgules. Ils aident la recherche et l'assistant."
        value={(e.tags ?? []).join(", ")}
        onChange={(ev) => changer({ tags: ev.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
      />
      <RemplirDepuisPdf
        exercice={e}
        matiere={matieres.find((m) => m.id === e.matiere)}
        motDePasse={motDePasse}
        onAppliquer={changer}
      />
      {/* Le texte écrit s'affiche sur le site (« Lire ici », plein écran) ;
          les PDF, facultatifs, restent à télécharger. Sans texte, les
          étudiants lisent les PDF. */}
      <fieldset className="space-y-4 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Énoncé</legend>
        <Zone
          label="Énoncé écrit (affiché sur le site)"
          rows={6}
          value={e.enonce ?? ""}
          maxLength={5000}
          aide={`${(e.enonce ?? "").length} / 5 000 caractères. ${AIDE_MISE_EN_FORME}`}
          onChange={(ev) => changer({ enonce: ev.target.value })}
        />
        <ChampPdf
          libelle="Énoncé en PDF (facultatif, à télécharger)"
          pdf={e.pdfEnonce}
          texte={e.texteEnonce}
          lireTexte
          motDePasse={motDePasse}
          aide="Si l'énoncé est écrit, « Lire ici » l'affiche et le PDF reste à télécharger ; sinon l'étudiant lit le PDF."
          onChange={(pdf, t) => changer({ pdfEnonce: pdf, texteEnonce: t })}
          onRetirer={() => changer({ pdfEnonce: null, texteEnonce: "" })}
        />
        <Zone
          label="Indice (facultatif)"
          aide="Un coup de pouce, affiché à la demande avant la correction."
          rows={2}
          value={e.indice ?? ""}
          maxLength={1500}
          onChange={(ev) => changer({ indice: ev.target.value })}
        />
      </fieldset>
      <fieldset className="space-y-4 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Correction</legend>
        <p className="text-xs/5 text-ink-500 dark:text-ink-400">
          Ici, seulement la solution : l'énoncé va dans le cadre « Énoncé » au-dessus.
        </p>
        <Zone
          label="Méthode, étape par étape"
          aide="Comment on trouve la solution. Chaque ligne devient une étape numérotée (1, 2, 3…) sur le site."
          rows={5}
          placeholder={"Lire les données : prix du billet, âge du voyageur.\nSi l'âge est inférieur à 25 ans, appliquer 20 % de réduction.\nSi l'âge est supérieur à 65 ans, appliquer 15 % de réduction.\nAfficher le prix final."}
          value={(e.etapes ?? []).join("\n")}
          onChange={(ev) => changer({ etapes: ev.target.value.split("\n") })}
        />
        <Zone
          label="Réponse"
          aide="Le résultat final : le programme complet, le calcul posé ou la valeur trouvée. Lignes et espaces conservés ; pour un programme, entoure-le de ``` pour l'afficher en police de code."
          rows={5}
          mono
          placeholder={"program billet;\nvar age : integer; prix : real;\nbegin\n  ...\nend."}
          value={e.reponse ?? ""}
          maxLength={5000}
          onChange={(ev) => changer({ reponse: ev.target.value })}
        />
        <Zone
          label="À retenir"
          aide="La notion ou la méthode clé à garder, en 1 à 3 phrases, affichée sous la correction."
          rows={3}
          value={e.explication ?? ""}
          maxLength={2000}
          onChange={(ev) => changer({ explication: ev.target.value })}
        />
        <SuggestionARetenir
          exercice={e}
          matiere={matieres.find((m) => m.id === e.matiere)}
          motDePasse={motDePasse}
          onAppliquer={(explication) => changer({ explication })}
        />
        <ChampPdf
          libelle="Correction en PDF (facultatif, à télécharger)"
          pdf={e.pdfCorrige}
          texte={e.texteCorrige}
          lireTexte
          motDePasse={motDePasse}
          aide="Proposée seulement quand l'étudiant clique « voir la correction »."
          onChange={(pdf, t) => changer({ pdfCorrige: pdf, texteCorrige: t })}
          onRetirer={() => changer({ pdfCorrige: null, texteCorrige: "" })}
        />
      </fieldset>

      <VerificationExercice
        lignes={e.verification ?? []}
        changer={(verification) => changer({ verification })}
      />
    </div>
  );
}

/* Les résultats que l'étudiant peut vérifier lui-même, avant d'ouvrir la
   correction : un libellé, et la réponse attendue. */
function VerificationExercice({ lignes, changer }) {
  const modifier = (i, modif) => changer(lignes.map((l, j) => (j === i ? { ...l, ...modif } : l)));

  return (
    <fieldset className="space-y-3 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
      <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">
        Vérification automatique (facultatif)
      </legend>
      <p className="text-xs/5 text-ink-500 dark:text-ink-400">
        Les résultats que l'étudiant doit trouver. Il tape les siens et voit s'ils sont justes, sans
        que la réponse lui soit montrée. Plusieurs écritures acceptées se séparent par « | » :{" "}
        <code>/26 | 26</code>. Majuscules, accents et espaces ne comptent pas, et un nombre ou une
        adresse IP vaut quelle que soit son écriture (<code>62</code> = <code>62,0</code>).
      </p>
      {lignes.map((l, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Champ
            label="Ce qu'il faut trouver"
            value={l.libelle}
            maxLength={120}
            placeholder="Hôtes utilisables par sous-réseau"
            onChange={(ev) => modifier(i, { libelle: ev.target.value })}
          />
          <Champ
            label="Réponse attendue"
            value={l.attendu}
            maxLength={300}
            placeholder="62"
            onChange={(ev) => modifier(i, { attendu: ev.target.value })}
          />
          <Bouton variante="danger" icone="trash" onClick={() => changer(lignes.filter((_, j) => j !== i))}>
            <span className="sr-only">Retirer cette ligne</span>
          </Bouton>
        </div>
      ))}
      <Bouton icone="plus" disabled={lignes.length >= 10} onClick={() => changer([...lignes, { libelle: "", attendu: "" }])}>
        Ajouter un résultat à vérifier
      </Bouton>
    </fieldset>
  );
}

function EditeurQcm({ element: q, changer, matieres, competences, motDePasse }) {
  const questions = q.questions;
  const changerQuestion = (i, modif) =>
    changer({ questions: questions.map((x, j) => (j === i ? { ...x, ...modif } : x)) });

  return (
    <div className="space-y-4">
      <Champ label="Titre" value={q.titre} maxLength={150} onChange={(e) => changer({ titre: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Choix label="Matière" value={q.matiere} options={optionsMatieres(matieres)} onChange={(e) => changer({ matiere: e.target.value })} />
        <Champ label="Niveau" value={q.niveau} maxLength={30} placeholder="Débutant" onChange={(e) => changer({ niveau: e.target.value })} />
        <Champ label="Durée" value={q.duree} maxLength={20} placeholder="10 min" onChange={(e) => changer({ duree: e.target.value })} />
      </div>
      <Zone label="Description" rows={2} value={q.description} maxLength={600} onChange={(e) => changer({ description: e.target.value })} />

      <QuizEnTexte
        key={`texte-${q.id}`}
        qcm={q}
        onAjouter={(nouvelles) => changer({ questions: [...questions, ...nouvelles] })}
        onRemplacer={(toutes) => changer({ questions: toutes })}
      />

      <GenerateurQcm
        key={q.id}
        qcm={q}
        matiere={matieres.find((m) => m.id === q.matiere)}
        competences={competences}
        motDePasse={motDePasse}
        onAjouter={(nouvelles) => changer({ questions: [...questions, ...nouvelles] })}
      />

      <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Questions ({questions.length})</h3>
      <div className="space-y-3">
        {questions.map((x, i) => (
          <div key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
            <div className="flex items-start gap-3">
              <span className="mt-8 font-mono text-xs text-ink-400">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <Zone label="Question" rows={2} value={x.enonce} maxLength={1000} onChange={(e) => changerQuestion(i, { enonce: e.target.value })} />
                <fieldset>
                  <legend className="text-xs font-semibold text-ink-600 dark:text-ink-300">
                    Réponses proposées (coche la bonne)
                  </legend>
                  <div className="mt-1.5 space-y-2">
                    {x.options.map((o, k) => (
                      <div key={k} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`bonne-${i}`}
                          checked={x.bonne === k}
                          onChange={() => changerQuestion(i, { bonne: k })}
                          aria-label={`Réponse ${k + 1} est la bonne`}
                          className="size-4 accent-brand-600"
                        />
                        <input
                          value={o}
                          maxLength={300}
                          onChange={(e) =>
                            changerQuestion(i, { options: x.options.map((y, l) => (l === k ? e.target.value : y)) })
                          }
                          aria-label={`Réponse ${k + 1}`}
                          className={champ}
                        />
                        <button
                          type="button"
                          disabled={x.options.length <= 2}
                          onClick={() =>
                            changerQuestion(i, {
                              options: x.options.filter((_, l) => l !== k),
                              bonne: x.bonne === k ? 0 : x.bonne > k ? x.bonne - 1 : x.bonne,
                            })
                          }
                          aria-label={`Retirer la réponse ${k + 1}`}
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800"
                        >
                          <Icon name="close" className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {x.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() => changerQuestion(i, { options: [...x.options, ""] })}
                      className="mt-2 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
                    >
                      + Ajouter une réponse
                    </button>
                  )}
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                  <div className="space-y-2">
                    <Choix label="Compétence" value={x.competence ?? ""} options={optionsCompetences(competences, q.matiere)} onChange={(e) => changerQuestion(i, { competence: e.target.value })} />
                    <SuggestionCompetence
                      matiere={matieres.find((m) => m.id === q.matiere)}
                      competences={competences}
                      texte={texteQuestion(x)}
                      valeur={x.competence}
                      onAppliquer={(id) => changerQuestion(i, { competence: id })}
                      motDePasse={motDePasse}
                    />
                  </div>
                  <Zone label="Explication" rows={2} value={x.explication} maxLength={1500} onChange={(e) => changerQuestion(i, { explication: e.target.value })} />
                </div>
              </div>
              <Ordre
                index={i}
                taille={questions.length}
                libelle={`la question ${i + 1}`}
                onDeplacer={(de, vers) => changer({ questions: deplacer(questions, de, vers) })}
                onSupprimer={(j) => changer({ questions: questions.filter((_, k) => k !== j) })}
              />
            </div>
          </div>
        ))}
      </div>
      <Bouton
        icone="plus"
        onClick={() =>
          changer({ questions: [...questions, { enonce: "", options: ["", "", "", ""], bonne: 0, competence: "", explication: "" }] })
        }
      >
        Ajouter une question
      </Bouton>
    </div>
  );
}

function EditeurVideo({ element: v, changer, matieres }) {
  const [lien, setLien] = useState(v.youtubeId ? `https://www.youtube.com/watch?v=${v.youtubeId}` : "");
  const reconnu = extraireYoutube(lien);

  return (
    <div className="space-y-4">
      <Champ label="Titre" value={v.titre} maxLength={150} onChange={(e) => changer({ titre: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Choix label="Matière" value={v.matiere} options={optionsMatieres(matieres)} onChange={(e) => changer({ matiere: e.target.value })} />
        <Champ label="Durée" value={v.duree} maxLength={20} placeholder="12 min" onChange={(e) => changer({ duree: e.target.value })} />
      </div>
      <Zone label="Résumé" rows={2} value={v.resume} maxLength={400} onChange={(e) => changer({ resume: e.target.value })} />
      <Champ
        label="Lien YouTube"
        placeholder="https://www.youtube.com/watch?v=…"
        value={lien}
        onChange={(e) => {
          setLien(e.target.value);
          changer({ youtubeId: extraireYoutube(e.target.value) });
        }}
        aide={
          !lien
            ? "Sans lien, la vidéo apparaît comme un emplacement « lien à ajouter »."
            : reconnu
              ? `Vidéo reconnue : ${reconnu}`
              : "Lien non reconnu : colle l'adresse complète de la vidéo YouTube."
        }
      />
      {reconnu && (
        <img
          src={`https://i.ytimg.com/vi/${reconnu}/mqdefault.jpg`}
          alt=""
          className="w-64 rounded-xl border border-ink-200 dark:border-ink-800"
        />
      )}
    </div>
  );
}

function EditeurExamen({ element: x, changer, matieres, motDePasse }) {
  const format = x.format === "pdf" ? "pdf" : "parties";
  const parties = x.parties;
  const total = parties.reduce((n, p) => n + (Number(p.points) || 0), 0);
  const changerPartie = (i, modif) =>
    changer({ parties: parties.map((p, j) => (j === i ? { ...p, ...modif } : p)) });

  return (
    <div className="space-y-4">
      <Champ label="Titre" value={x.titre} maxLength={150} onChange={(e) => changer({ titre: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Choix label="Matière" value={x.matiere} options={optionsMatieres(matieres)} onChange={(e) => changer({ matiere: e.target.value })} />
        <Champ
          label="Durée (minutes)"
          type="number"
          min={5}
          max={480}
          value={x.dureeMinutes}
          onChange={(e) => changer({ dureeMinutes: Number(e.target.value) })}
        />
      </div>
      <Zone label="Consignes" rows={2} value={x.consignes} maxLength={2000} placeholder="Sans document ni calculatrice…" onChange={(e) => changer({ consignes: e.target.value })} />

      <ChoixFormat
        valeur={format}
        onChange={(f) => changer({ format: f })}
        options={[
          { valeur: "parties", label: "Écrire le sujet par parties", icone: "pencil" },
          { valeur: "pdf", label: "Sujet et corrigé en PDF", icone: "file" },
        ]}
      />

      {format === "pdf" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <ChampPdf
              libelle="Sujet (PDF)"
              pdf={x.pdfEnonce}
              motDePasse={motDePasse}
              aide="Affiché au lancement du minuteur."
              onChange={(pdf) => changer({ format: "pdf", pdfEnonce: pdf })}
            />
            <ChampPdf
              libelle="Corrigé (PDF)"
              pdf={x.pdfCorrige}
              motDePasse={motDePasse}
              aide="Affiché seulement à la fin du devoir."
              onChange={(pdf) => changer({ pdfCorrige: pdf })}
              onRetirer={() => changer({ pdfCorrige: null })}
            />
          </div>
          <Champ
            label="Noté sur (points)"
            aide="L'étudiant se note lui-même sur ce total en lisant le corrigé."
            type="number"
            min={1}
            max={200}
            value={x.pointsTotal ?? 20}
            onChange={(e) => changer({ pointsTotal: Number(e.target.value) })}
            className="sm:w-48"
          />
        </>
      ) : (
      <>
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
        Parties <span className="font-normal text-ink-500">· total {total} points</span>
      </h3>
      <div className="space-y-3">
        {parties.map((p, i) => (
          <div key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
            <div className="flex items-start gap-3">
              <span className="mt-8 font-mono text-xs text-ink-400">{i + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                  <Champ label="Titre de la partie" value={p.titre} maxLength={150} onChange={(e) => changerPartie(i, { titre: e.target.value })} />
                  <Champ label="Points" type="number" min={0} max={100} value={p.points} onChange={(e) => changerPartie(i, { points: Number(e.target.value) })} />
                </div>
                <Zone label="Énoncé" rows={5} value={p.enonce} maxLength={8000} onChange={(e) => changerPartie(i, { enonce: e.target.value })} />
                <Zone label="Corrigé" aide="Affiché seulement à la fin du devoir." rows={5} value={p.corrige} maxLength={8000} onChange={(e) => changerPartie(i, { corrige: e.target.value })} />
              </div>
              <Ordre
                index={i}
                taille={parties.length}
                libelle={`la partie ${i + 1}`}
                onDeplacer={(de, vers) => changer({ parties: deplacer(parties, de, vers) })}
                onSupprimer={(j) => changer({ parties: parties.filter((_, k) => k !== j) })}
              />
            </div>
          </div>
        ))}
      </div>
      <Bouton icone="plus" onClick={() => changer({ parties: [...parties, { titre: "", enonce: "", points: 4, corrige: "" }] })}>
        Ajouter une partie
      </Bouton>
      </>
      )}
    </div>
  );
}

function EditeurAnnale({ element: a, changer, matieres }) {
  const auto = a.autorisation ?? { obtenue: false, detail: "" };
  const visible = auto.obtenue && a.lienSujet;

  return (
    <div className="space-y-4">
      <div
        className={cx(
          "flex gap-3 rounded-xl px-4 py-3 text-sm/6",
          visible
            ? "bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300"
            : "bg-sun-100/60 text-sun-900 dark:bg-sun-500/10 dark:text-sun-300"
        )}
      >
        <Icon name={visible ? "check" : "lock"} className="mt-0.5 size-4.5 shrink-0" />
        <p>
          {visible
            ? "Visible par les étudiants après publication."
            : "En attente : un examen n'est montré aux étudiants qu'avec une autorisation écrite déclarée et un lien vers le sujet."}
        </p>
      </div>
      <Champ label="Titre" value={a.titre} maxLength={150} placeholder="Examen de réseaux, session 1" onChange={(e) => changer({ titre: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Choix label="Matière" value={a.matiere} options={optionsMatieres(matieres)} onChange={(e) => changer({ matiere: e.target.value })} />
        <Champ label="Année" value={a.annee} maxLength={20} placeholder="2025" onChange={(e) => changer({ annee: e.target.value })} />
        <Champ label="Session" value={a.session} maxLength={40} placeholder="Session normale" onChange={(e) => changer({ session: e.target.value })} />
      </div>
      <Champ
        label="Lien vers le sujet"
        aide="Adresse https d'un fichier partagé (Google Drive, site du département…). La plateforme n'héberge aucun fichier."
        value={a.lienSujet}
        placeholder="https://…"
        onChange={(e) => changer({ lienSujet: e.target.value })}
      />
      <Champ label="Lien vers le corrigé (facultatif)" value={a.lienCorrige} placeholder="https://…" onChange={(e) => changer({ lienCorrige: e.target.value })} />
      <fieldset className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Autorisation</legend>
        <label className="flex items-start gap-3 text-sm text-ink-700 dark:text-ink-300">
          <input
            type="checkbox"
            checked={auto.obtenue}
            onChange={(e) => changer({ autorisation: { ...auto, obtenue: e.target.checked } })}
            className="mt-1 size-4 accent-brand-600"
          />
          J'ai l'autorisation écrite de l'enseignant ou du département pour publier ce sujet.
        </label>
        <Champ
          className="mt-3"
          label="De qui, et quand ?"
          aide="Affiché sous l'examen. Garde la preuve écrite (courriel, courrier)."
          value={auto.detail}
          maxLength={500}
          placeholder="Accord de M. X, responsable du module, par courriel du 12/03/2026"
          onChange={(e) => changer({ autorisation: { ...auto, detail: e.target.value } })}
        />
      </fieldset>
    </div>
  );
}

/* Une ressource de la bibliothèque : un lien vers le site de l'auteur,
   ou un PDF téléversé. Tant que sa diffusion n'est pas autorisée, elle
   reste « en attente » : annoncée, mais sans lien ni fichier. */
function EditeurRessource({ element: r, changer, matieres, motDePasse }) {
  const source = r.pdf && !r.url ? "pdf" : r.source ?? (r.pdf ? "pdf" : "lien");
  const libre = r.statut === "libre";

  return (
    <div className="space-y-4">
      <div
        className={cx(
          "flex gap-3 rounded-xl px-4 py-3 text-sm/6",
          libre
            ? "bg-accent-50 text-accent-800 dark:bg-accent-500/10 dark:text-accent-300"
            : "bg-sun-100/60 text-sun-900 dark:bg-sun-500/10 dark:text-sun-300"
        )}
      >
        <Icon name={libre ? "check" : "lock"} className="mt-0.5 size-4.5 shrink-0" />
        <p>
          {libre
            ? "Accès libre : les étudiants voient la ressource et peuvent l'ouvrir."
            : "En attente : les étudiants voient seulement qu'elle est prévue, sans lien ni fichier."}
        </p>
      </div>

      <Champ label="Titre" value={r.titre} maxLength={200} onChange={(e) => changer({ titre: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Champ label="Auteurs" value={r.auteurs} maxLength={200} onChange={(e) => changer({ auteurs: e.target.value })} />
        <Choix label="Matière" value={r.matiere} options={optionsMatieres(matieres)} onChange={(e) => changer({ matiere: e.target.value })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Choix
          label="Type"
          value={typesRessource.includes(r.type) ? r.type : typesRessource[0]}
          options={typesRessource.map((t) => ({ value: t, label: t }))}
          onChange={(e) => changer({ type: e.target.value })}
        />
        <Champ label="Langue" value={r.langue} maxLength={30} placeholder="Français" onChange={(e) => changer({ langue: e.target.value })} />
        <Champ label="Licence" value={r.licence} maxLength={80} placeholder="CC BY, accord de l'auteur…" onChange={(e) => changer({ licence: e.target.value })} />
      </div>
      <Zone label="Présentation" rows={2} value={r.note} maxLength={600} onChange={(e) => changer({ note: e.target.value })} />

      <fieldset className="space-y-3 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
        <legend className="px-1 text-xs font-semibold text-ink-600 dark:text-ink-300">Document</legend>
        <ChoixFormat
          valeur={source}
          onChange={(s) => changer({ source: s })}
          options={[
            { valeur: "lien", label: "Lien vers le site de l'auteur", icone: "external" },
            { valeur: "pdf", label: "Téléverser un PDF", icone: "file" },
          ]}
        />
        {source === "lien" ? (
          <Champ
            label="Adresse"
            placeholder="https://…"
            value={r.url ?? ""}
            aide="Une adresse https : le site officiel de l'auteur, jamais une copie."
            onChange={(e) => changer({ url: e.target.value, pdf: null })}
          />
        ) : (
          <ChampPdf
            libelle="Document en PDF"
            pdf={r.pdf}
            motDePasse={motDePasse}
            aide="Seulement un document que tu as le droit de diffuser : le tien, sous licence libre, ou avec l'accord écrit de son auteur."
            onChange={(pdf) => changer({ pdf, url: null })}
            onRetirer={() => changer({ pdf: null })}
          />
        )}
      </fieldset>

      <label className="flex items-start gap-3 rounded-xl border border-ink-200 p-4 text-sm text-ink-700 dark:border-ink-800 dark:text-ink-300">
        <input
          type="checkbox"
          checked={libre}
          onChange={(e) => changer({ statut: e.target.checked ? "libre" : "attente" })}
          className="mt-1 size-4 accent-brand-600"
        />
        Sa diffusion est autorisée : licence libre, ou accord écrit de son auteur. Sinon, elle reste en
        attente et les étudiants n'y ont pas accès.
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ce que chaque onglet sait faire                                     */
/* ------------------------------------------------------------------ */

const TYPES = {
  matieres: {
    Editeur: EditeurMatiere,
    nouveau: (tous) => ({
      id: identifiant("nouvelle-matiere", tous),
      nom: "Nouvelle matière",
      nomCourt: "",
      couleur: "bleu",
      icone: "book",
      semestre: "",
      resume: "",
      chapitres: [],
    }),
    titre: (m) => m.nom,
    detail: (m) => `${m.chapitres.length} chapitres`,
  },
  competences: {
    Editeur: EditeurCompetence,
    nouveau: (tous, matiere) => ({
      id: identifiant(`${matiere || "competence"}-competence`, tous),
      nom: "",
      matiere,
      chapitres: [],
    }),
    titre: (c) => c.nom,
    detail: (c) => `${c.chapitres.length} chapitre(s)`,
  },
  exercices: {
    Editeur: EditeurExercice,
    nouveau: (tous, matiere) => ({
      id: identifiant("exercice", tous),
      titre: "",
      matiere,
      competence: "",
      difficulte: "Moyen",
      duree: "",
      tags: [],
      enonce: "",
      indice: "",
      etapes: [],
      reponse: "",
      explication: "",
      verification: [],
    }),
    titre: (e) => e.titre,
    detail: (e) => `${e.difficulte}${e.pdfEnonce ? (e.enonce ? " · texte + PDF" : " · PDF") : ""}`,
  },
  qcms: {
    Editeur: EditeurQcm,
    nouveau: (tous, matiere) => ({
      id: identifiant("qcm", tous),
      titre: "",
      matiere,
      niveau: "Débutant",
      duree: "",
      description: "",
      questions: [],
    }),
    titre: (q) => q.titre,
    detail: (q) => `${q.questions.length} questions`,
  },
  videos: {
    Editeur: EditeurVideo,
    nouveau: (tous, matiere) => ({ id: identifiant("video", tous), titre: "", resume: "", matiere, duree: "", youtubeId: null }),
    titre: (v) => v.titre,
    detail: (v) => (v.youtubeId ? "lien ajouté" : "sans lien"),
  },
  examens: {
    Editeur: EditeurExamen,
    nouveau: (tous, matiere) => ({ id: identifiant("devoir", tous), titre: "", matiere, dureeMinutes: 60, consignes: "", parties: [] }),
    titre: (x) => x.titre,
    detail: (x) => `${x.dureeMinutes} min · ${x.format === "pdf" ? "sujet PDF" : `${x.parties.length} parties`}`,
  },
  annales: {
    Editeur: EditeurAnnale,
    nouveau: (tous, matiere) => ({
      id: identifiant("examen-passe", tous),
      titre: "",
      matiere,
      annee: "",
      session: "",
      lienSujet: "",
      lienCorrige: "",
      autorisation: { obtenue: false, detail: "" },
    }),
    titre: (a) => a.titre,
    detail: (a) => (a.autorisation?.obtenue && a.lienSujet ? "visible" : "en attente"),
  },
  ressources: {
    Editeur: EditeurRessource,
    nouveau: (tous, matiere) => ({
      id: identifiant("ressource", tous),
      titre: "",
      auteurs: "",
      type: typesRessource[0],
      langue: "Français",
      matiere,
      licence: "",
      statut: "attente",
      url: null,
      pdf: null,
      note: "",
    }),
    titre: (r) => r.titre,
    detail: (r) => `${r.type} · ${r.statut === "libre" ? "accès libre" : "en attente"}${r.pdf ? " · PDF" : ""}`,
  },
};

/* Ce qui serait écarté ou cassé à la publication, dit avant. */
function problemes(b) {
  const liste = [];
  const ids = new Set(b.matieres.map((m) => m.id));
  for (const m of b.matieres) if (!m.nom.trim()) liste.push(`Une matière n'a pas de nom (${m.id}).`);
  for (const c of b.competences) {
    if (!c.nom.trim()) {
      liste.push(`La compétence « ${c.id} » n'a pas de nom : elle serait supprimée.`);
      continue;
    }
    if (!ids.has(c.matiere)) liste.push(`La compétence « ${c.nom} » n'a pas de matière.`);
    const titres = b.matieres.find((m) => m.id === c.matiere)?.chapitres.map((ch) => ch.titre) ?? [];
    for (const t of c.chapitres) {
      if (!titres.includes(t)) liste.push(`La compétence « ${c.nom} » renvoie vers un chapitre introuvable : « ${t} ».`);
    }
  }
  for (const [cle, nom] of [
    ["exercices", "L'exercice"],
    ["qcms", "Le QCM"],
    ["videos", "La vidéo"],
    ["examens", "Le devoir"],
    ["annales", "L'examen"],
    ["ressources", "La ressource"],
  ]) {
    for (const e of b[cle]) {
      if (!e.titre.trim()) liste.push(`${nom} « ${e.id} » n'a pas de titre : il serait supprimé.`);
      else if (!ids.has(e.matiere)) liste.push(`${nom} « ${e.titre} » n'a pas de matière.`);
    }
  }
  for (const r of b.ressources) {
    if (r.statut === "libre" && !r.url && !r.pdf) {
      liste.push(`La ressource « ${r.titre || r.id} » est en accès libre sans lien ni PDF : les étudiants ne pourraient pas l'ouvrir.`);
    }
  }
  for (const e of b.exercices) {
    if ((e.verification ?? []).some((v) => !v.libelle.trim() || !v.attendu.trim())) {
      liste.push(`L'exercice « ${e.titre || e.id} » a une ligne de vérification incomplète : elle serait ignorée.`);
    }
  }
  for (const e of b.exercices) {
    if (!e.enonce?.trim() && !e.pdfEnonce) liste.push(`L'exercice « ${e.titre || e.id} » n'a ni énoncé écrit ni énoncé en PDF.`);
  }
  for (const x of b.examens) {
    if (x.format === "pdf" && !x.pdfEnonce) liste.push(`Le devoir « ${x.titre || x.id} » est en PDF sans sujet : il repasserait en parties, vides.`);
  }
  for (const q of b.qcms) {
    q.questions.forEach((x, i) => {
      if (!x.enonce.trim() || x.options.filter((o) => o.trim()).length < 2) {
        liste.push(`QCM « ${q.titre} », question ${i + 1} : il faut une question et au moins deux réponses.`);
      }
    });
  }
  return liste;
}

/* Ce qui part au relais : les étapes et réponses vides sont retirées. */
const pourPublier = (b) => ({
  ...b,
  // `source` ne sert qu'à l'éditeur (lien ou PDF) : il ne part pas.
  ressources: b.ressources.map(({ source: _source, ...r }) => r),
  exercices: b.exercices.map((e) => ({ ...e, etapes: e.etapes.map((s) => s.trim()).filter(Boolean) })),
  qcms: b.qcms.map((q) => ({
    ...q,
    questions: q.questions.map((x) => {
      const gardees = x.options.map((o, k) => ({ o: o.trim(), k })).filter((y) => y.o);
      const bonne = Math.max(gardees.findIndex((y) => y.k === x.bonne), 0);
      return { ...x, options: gardees.map((y) => y.o), bonne };
    }),
  })),
});

/* ================================================================== */

export default function GestionContenu() {
  const [motDePasse, setMotDePasse] = useState(lireSessionAdmin);
  const [brouillon, setBrouillon] = useState(null);
  const [modifie, setModifie] = useState(false);
  const [onglet, setOnglet] = useState("matieres");
  const [selection, setSelection] = useState({});
  const [filtre, setFiltre] = useState("");
  const [etat, setEtat] = useState({ type: "", texte: "" });
  const [publie, setPublie] = useState(null);

  const deconnecter = (message = "") => {
    ecrireSessionAdmin("");
    setMotDePasse("");
    setEtat({ type: message ? "erreur" : "", texte: message });
  };

  // Le brouillon part de la version publiée (annales en attente
  // comprises), ou du contenu du code si rien n'a jamais été publié.
  useEffect(() => {
    if (!motDePasse) return;
    let annule = false;
    lireContenuAdmin(motDePasse)
      .then((c) => {
        if (annule) return;
        // Une publication plus ancienne peut ne pas avoir toutes les
        // rubriques (les compétences sont arrivées après) : on complète
        // avec le contenu du code.
        setBrouillon(c ? { ...copieContenuParDefaut(), ...c } : copieContenuParDefaut());
        setPublie(c?.publieLe ?? null);
        setEtat({
          type: "",
          texte: c
            ? `Version publiée le ${new Date(c.publieLe).toLocaleString("fr-FR")}.`
            : "Rien n'a encore été publié : tu pars du contenu actuel du site.",
        });
      })
      .catch((e) => {
        if (annule) return;
        if (e.message === "mot-de-passe") deconnecter(messageErreurAdmin(e.message));
        else {
          // Relais injoignable : on peut préparer, pas publier.
          setBrouillon(copieContenu());
          setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
        }
      });
    return () => {
      annule = true;
    };
  }, [motDePasse]);

  // Ne pas perdre un brouillon en fermant l'onglet par erreur.
  useEffect(() => {
    if (!modifie) return;
    const avertir = (e) => e.preventDefault();
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, [modifie]);

  const alertes = useMemo(() => (brouillon ? problemes(brouillon) : []), [brouillon]);

  if (!iaActive) {
    return (
      <Container className="py-10">
        <div className="card p-6 text-sm">Le relais n'est pas configuré : `urlIA` est vide dans `src/data/site.js`.</div>
      </Container>
    );
  }

  const type = TYPES[onglet];
  const elements = brouillon?.[onglet] ?? [];
  const visibles =
    onglet === "matieres" || !filtre ? elements : elements.filter((e) => e.matiere === filtre);
  const selectionne = elements.find((e) => e.id === selection[onglet]) ?? null;

  const modifierListe = (cle, liste) => {
    setBrouillon((b) => ({ ...b, [cle]: liste }));
    setModifie(true);
  };
  const changer = (modif) => {
    // Renommer un chapitre met à jour les compétences qui le citent :
    // sans cela, « relis ce chapitre » pointerait vers un titre disparu.
    if (
      onglet === "matieres" &&
      modif.chapitres &&
      modif.chapitres.length === selectionne.chapitres.length
    ) {
      const renommages = new Map();
      selectionne.chapitres.forEach((c, i) => {
        if (c.titre !== modif.chapitres[i].titre) renommages.set(c.titre, modif.chapitres[i].titre);
      });
      if (renommages.size) {
        const matiere = selectionne.id;
        setBrouillon((b) => ({
          ...b,
          competences: b.competences.map((c) =>
            c.matiere !== matiere
              ? c
              : { ...c, chapitres: c.chapitres.map((t) => renommages.get(t) ?? t) }
          ),
        }));
      }
    }
    modifierListe(onglet, elements.map((e) => (e.id === selectionne.id ? { ...e, ...modif } : e)));
  };

  const usagesCompetence = (id) => ({
    exercices: brouillon.exercices.filter((e) => e.competence === id).length,
    questions: brouillon.qcms.reduce(
      (n, q) => n + q.questions.filter((x) => x.competence === id).length,
      0
    ),
  });

  const ajouter = () => {
    const nouveau = type.nouveau(elements, filtre || brouillon.matieres[0]?.id || "");
    modifierListe(onglet, [...elements, nouveau]);
    setSelection((s) => ({ ...s, [onglet]: nouveau.id }));
  };

  const supprimer = () => {
    if (onglet === "matieres") {
      const lies = ["competences", "exercices", "qcms", "videos", "examens", "annales", "ressources"].reduce(
        (n, cle) => n + brouillon[cle].filter((e) => e.matiere === selectionne.id).length,
        0
      );
      if (lies > 0) {
        window.alert(`Cette matière a encore ${lies} contenu(s) rattaché(s). Supprime-les ou change leur matière d'abord.`);
        return;
      }
    }
    if (onglet === "competences") {
      // Une compétence supprimée est détachée des exercices et des
      // questions, qui restent en place.
      const u = usagesCompetence(selectionne.id);
      const n = u.exercices + u.questions;
      const message =
        `Supprimer la compétence « ${selectionne.nom || selectionne.id} » ?` +
        (n
          ? `\n\n${u.exercices} exercice(s) et ${u.questions} question(s) y sont rattachés : ils seront détachés, pas supprimés.`
          : "");
      if (!window.confirm(message)) return;
      const id = selectionne.id;
      setBrouillon((b) => ({
        ...b,
        competences: b.competences.filter((c) => c.id !== id),
        exercices: b.exercices.map((e) => (e.competence === id ? { ...e, competence: "" } : e)),
        qcms: b.qcms.map((q) => ({
          ...q,
          questions: q.questions.map((x) => (x.competence === id ? { ...x, competence: "" } : x)),
        })),
      }));
      setModifie(true);
      setSelection((s) => ({ ...s, competences: null }));
      return;
    }
    if (!window.confirm(`Supprimer « ${type.titre(selectionne) || selectionne.id} » ?`)) return;
    modifierListe(onglet, elements.filter((e) => e.id !== selectionne.id));
    setSelection((s) => ({ ...s, [onglet]: null }));
  };

  const publier = async () => {
    if (alertes.length && !window.confirm(`Points à vérifier :\n\n- ${alertes.join("\n- ")}\n\nPublier quand même ?`)) return;
    setEtat({ type: "", texte: "Publication…" });
    try {
      const c = await publierContenu(pourPublier(brouillon), motDePasse);
      setBrouillon(c);
      setPublie(c.publieLe);
      setModifie(false);
      setEtat({ type: "ok", texte: `Publié à ${new Date(c.publieLe).toLocaleTimeString("fr-FR")}. Les étudiants le voient au prochain chargement du site.` });
    } catch (e) {
      if (e.message === "mot-de-passe") deconnecter(messageErreurAdmin(e.message));
      else setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  const restaurer = async () => {
    if (!window.confirm("Remettre en ligne la version publiée juste avant la dernière ? Le brouillon en cours sera perdu.")) return;
    try {
      const c = await restaurerContenu(motDePasse);
      setBrouillon(c);
      setPublie(c.publieLe);
      setModifie(false);
      setEtat({ type: "ok", texte: `Version du ${new Date(c.publieLe).toLocaleString("fr-FR")} remise en ligne.` });
    } catch (e) {
      setEtat({ type: "erreur", texte: messageErreurAdmin(e.message) });
    }
  };

  const Editeur = type.Editeur;

  return (
    <>
      <EnTetePage
        surtitre="Espace d'administration"
        titre="Gérer le contenu"
        texte="Matières et cours, exercices, QCM, vidéos et examens. Tu modifies un brouillon : rien ne change pour les étudiants avant « Publier »."
      >
        <Link to="/admin" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300">
          ← Retour à l'administration
        </Link>
      </EnTetePage>

      <Container className="space-y-6 py-10">
        {!motDePasse ? (
          <>
            {etat.type === "erreur" && <p className="text-sm text-flame-600 dark:text-flame-400">{etat.texte}</p>}
            <ConnexionAdmin
              onConnecte={(mdp) => {
                setEtat({ type: "", texte: "" });
                setMotDePasse(mdp);
              }}
            />
          </>
        ) : !brouillon ? (
          <p className="text-sm text-ink-500">Chargement du contenu…</p>
        ) : (
          <>
            {/* ---- Barre de publication ---- */}
            <div className="card sticky top-2 z-10 flex flex-wrap items-center gap-3 p-4">
              <Bouton variante="principal" icone="rocket" disabled={!modifie} onClick={publier}>
                Publier
              </Bouton>
              <Bouton icone="arrow" disabled={!publie} onClick={restaurer} className="[&>svg]:rotate-180">
                Restaurer la version précédente
              </Bouton>
              <p
                className={cx(
                  "text-xs",
                  modifie
                    ? "font-medium text-sun-700 dark:text-sun-400"
                    : etat.type === "erreur"
                      ? "text-flame-600 dark:text-flame-400"
                      : etat.type === "ok"
                        ? "text-accent-700 dark:text-accent-400"
                        : "text-ink-500 dark:text-ink-400"
                )}
              >
                {modifie
                  ? `Brouillon non publié${alertes.length ? ` · ${alertes.length} point(s) à vérifier` : ""}.`
                  : etat.texte}
              </p>
              <button
                type="button"
                onClick={() => (!modifie || window.confirm("Le brouillon non publié sera perdu. Continuer ?")) && deconnecter()}
                className="ml-auto text-xs text-ink-500 hover:underline dark:text-ink-400"
              >
                Se déconnecter
              </button>
            </div>

            {/* ---- Onglets ---- */}
            <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-ink-200 dark:border-ink-800">
              {ONGLETS.map((o) => (
                <button
                  key={o.cle}
                  role="tab"
                  type="button"
                  aria-selected={onglet === o.cle}
                  onClick={() => setOnglet(o.cle)}
                  className={cx(
                    "inline-flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm transition-colors",
                    onglet === o.cle
                      ? "border-brand-500 font-semibold text-brand-700 dark:text-brand-300"
                      : "border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
                  )}
                >
                  <Icon name={o.icone} className="size-4" />
                  {o.label}
                  <span className="rounded-full bg-ink-100 px-1.5 text-[11px] text-ink-500 dark:bg-ink-800">
                    {brouillon[o.cle].length}
                  </span>
                </button>
              ))}
            </div>

            {onglet === "exercices" && (
              <PanneauImportTD
                brouillon={brouillon}
                appliquer={(transformer) => {
                  setBrouillon(transformer);
                  setModifie(true);
                }}
                motDePasse={motDePasse}
                identifiant={identifiant}
                extraireTexte={extraireTextePdf}
              />
            )}

            {onglet === "competences" && (
              <PanneauCompetencesIA
                brouillon={brouillon}
                appliquer={(transformer) => {
                  setBrouillon(transformer);
                  setModifie(true);
                }}
                motDePasse={motDePasse}
                identifiant={identifiant}
              />
            )}

            <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
              {/* ---- Liste ---- */}
              <div className="space-y-3">
                {onglet !== "matieres" && (
                  <select
                    value={filtre}
                    onChange={(e) => setFiltre(e.target.value)}
                    aria-label="Filtrer par matière"
                    className={champ}
                  >
                    <option value="">Toutes les matières</option>
                    {brouillon.matieres.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nom}
                      </option>
                    ))}
                  </select>
                )}
                <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
                  {visibles.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => setSelection((s) => ({ ...s, [onglet]: e.id }))}
                        className={cx(
                          "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                          e.id === selectionne?.id
                            ? "bg-brand-600 text-white"
                            : "hover:bg-ink-100 dark:hover:bg-ink-800"
                        )}
                      >
                        <span className="block truncate text-sm font-medium">{type.titre(e) || "Sans titre"}</span>
                        <span className={cx("block text-[11px]", e.id === selectionne?.id ? "text-white/70" : "text-ink-500")}>
                          {type.detail(e)}
                        </span>
                      </button>
                    </li>
                  ))}
                  {visibles.length === 0 && <li className="px-3 py-2 text-sm text-ink-500">Rien pour le moment.</li>}
                </ul>
                <Bouton icone="plus" onClick={ajouter} disabled={onglet !== "matieres" && brouillon.matieres.length === 0}>
                  Ajouter
                </Bouton>
              </div>

              {/* ---- Éditeur ---- */}
              <div className="card p-5 sm:p-6">
                {!selectionne ? (
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    Choisis un élément dans la liste, ou clique sur « Ajouter ».
                  </p>
                ) : (
                  <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 pb-4 dark:border-ink-800">
                      <p className="text-xs text-ink-500">
                        Identifiant : <code className="font-mono">{selectionne.id}</code>
                      </p>
                      <Bouton variante="danger" icone="trash" onClick={supprimer}>
                        Supprimer
                      </Bouton>
                    </div>
                    <Editeur
                      key={selectionne.id}
                      element={selectionne}
                      changer={changer}
                      matieres={brouillon.matieres}
                      competences={brouillon.competences}
                      motDePasse={motDePasse}
                      usages={onglet === "competences" ? usagesCompetence(selectionne.id) : null}
                    />
                  </>
                )}
              </div>
            </div>

            {alertes.length > 0 && (
              <div className="rounded-xl border border-sun-400/50 bg-sun-100/60 p-4 text-sm dark:bg-sun-500/10">
                <p className="font-semibold text-sun-900 dark:text-sun-300">À vérifier avant de publier</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sun-900 dark:text-sun-200">
                  {alertes.slice(0, 10).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {dateContenu && (
              <p className="text-xs text-ink-400">
                Contenu affiché sur ce site : version publiée le {new Date(dateContenu).toLocaleString("fr-FR")}.
              </p>
            )}
          </>
        )}
      </Container>
    </>
  );
}
