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
import { competences } from "../data/competences";
import { iaActive } from "../ia";
import {
  copieContenu,
  copieContenuParDefaut,
  dateContenu,
  lireContenuAdmin,
  publierContenu,
  restaurerContenu,
} from "../contenu";

/* ==================================================================
   Gérer le contenu : matières et cours, exercices, QCM, vidéos,
   examens blancs et annales.

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
  { cle: "exercices", label: "Exercices", icone: "pencil" },
  { cle: "qcms", label: "QCM", icone: "target" },
  { cle: "videos", label: "Vidéos", icone: "video" },
  { cle: "examens", label: "Examens blancs", icone: "clock" },
  { cle: "annales", label: "Annales", icone: "file" },
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

function EditeurMatiere({ element: m, changer }) {
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
                <Badge ton={c.contenu ? "accent" : "neutre"}>{c.contenu ? "cours rédigé" : "pas de cours"}</Badge>
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
                <Zone
                  label="Cours"
                  rows={14}
                  value={c.contenu ?? ""}
                  maxLength={30000}
                  placeholder="Le texte complet du cours : définitions, explications, exemples…"
                  aide={`${(c.contenu ?? "").length} / 30 000 caractères. Visible seulement si le chapitre est « Disponible ».`}
                  onChange={(e) => changerChapitre(i, { contenu: e.target.value })}
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
            changer({ chapitres: [...chapitres, { titre: "", resume: "", duree: "", statut: "bientot", contenu: "" }] })
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
const optionsCompetences = (matiere) => [
  { value: "", label: "Aucune" },
  ...competences.filter((c) => c.matiere === matiere).map((c) => ({ value: c.id, label: c.nom })),
];

function EditeurExercice({ element: e, changer, matieres }) {
  return (
    <div className="space-y-4">
      <Champ label="Titre" value={e.titre} maxLength={150} onChange={(ev) => changer({ titre: ev.target.value })} />
      <div className="grid gap-4 sm:grid-cols-4">
        <Choix label="Matière" value={e.matiere} options={optionsMatieres(matieres)} onChange={(ev) => changer({ matiere: ev.target.value, competence: "" })} />
        <Choix label="Compétence" value={e.competence ?? ""} options={optionsCompetences(e.matiere)} onChange={(ev) => changer({ competence: ev.target.value })} />
        <Choix
          label="Difficulté"
          value={e.difficulte}
          options={["Facile", "Moyen", "Difficile"].map((d) => ({ value: d, label: d }))}
          onChange={(ev) => changer({ difficulte: ev.target.value })}
        />
        <Champ label="Durée" value={e.duree} maxLength={20} placeholder="20 min" onChange={(ev) => changer({ duree: ev.target.value })} />
      </div>
      <Champ
        label="Mots-clés"
        aide="Séparés par des virgules. Ils aident la recherche et l'assistant."
        value={(e.tags ?? []).join(", ")}
        onChange={(ev) => changer({ tags: ev.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
      />
      <Zone label="Énoncé" rows={5} value={e.enonce} maxLength={5000} onChange={(ev) => changer({ enonce: ev.target.value })} />
      <Zone label="Indice" rows={2} value={e.indice} maxLength={1500} onChange={(ev) => changer({ indice: ev.target.value })} />
      <Zone
        label="Méthode, étape par étape"
        aide="Une étape par ligne."
        rows={5}
        value={(e.etapes ?? []).join("\n")}
        onChange={(ev) => changer({ etapes: ev.target.value.split("\n") })}
      />
      <Zone label="Réponse" rows={5} mono value={e.reponse} maxLength={5000} onChange={(ev) => changer({ reponse: ev.target.value })} />
      <Zone label="À retenir" rows={2} value={e.explication} maxLength={2000} onChange={(ev) => changer({ explication: ev.target.value })} />
    </div>
  );
}

function EditeurQcm({ element: q, changer, matieres }) {
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
                  <Choix label="Compétence" value={x.competence ?? ""} options={optionsCompetences(q.matiere)} onChange={(e) => changerQuestion(i, { competence: e.target.value })} />
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

function EditeurExamen({ element: x, changer, matieres }) {
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
                <Zone label="Corrigé" aide="Affiché seulement à la fin de l'examen." rows={5} value={p.corrige} maxLength={8000} onChange={(e) => changerPartie(i, { corrige: e.target.value })} />
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
            : "En attente : une annale n'est montrée aux étudiants qu'avec une autorisation écrite déclarée et un lien vers le sujet."}
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
          aide="Affiché sous l'annale. Garde la preuve écrite (courriel, courrier)."
          value={auto.detail}
          maxLength={500}
          placeholder="Accord de M. X, responsable du module, par courriel du 12/03/2026"
          onChange={(e) => changer({ autorisation: { ...auto, detail: e.target.value } })}
        />
      </fieldset>
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
    }),
    titre: (e) => e.titre,
    detail: (e) => e.difficulte,
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
    nouveau: (tous, matiere) => ({ id: identifiant("examen", tous), titre: "", matiere, dureeMinutes: 60, consignes: "", parties: [] }),
    titre: (x) => x.titre,
    detail: (x) => `${x.dureeMinutes} min · ${x.parties.length} parties`,
  },
  annales: {
    Editeur: EditeurAnnale,
    nouveau: (tous, matiere) => ({
      id: identifiant("annale", tous),
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
};

/* Ce qui serait écarté ou cassé à la publication, dit avant. */
function problemes(b) {
  const liste = [];
  const ids = new Set(b.matieres.map((m) => m.id));
  for (const m of b.matieres) if (!m.nom.trim()) liste.push(`Une matière n'a pas de nom (${m.id}).`);
  for (const [cle, nom] of [
    ["exercices", "L'exercice"],
    ["qcms", "Le QCM"],
    ["videos", "La vidéo"],
    ["examens", "L'examen"],
    ["annales", "L'annale"],
  ]) {
    for (const e of b[cle]) {
      if (!e.titre.trim()) liste.push(`${nom} « ${e.id} » n'a pas de titre : il serait supprimé.`);
      else if (!ids.has(e.matiere)) liste.push(`${nom} « ${e.titre} » n'a pas de matière.`);
    }
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
        setBrouillon(c ?? copieContenuParDefaut());
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
  const changer = (modif) =>
    modifierListe(onglet, elements.map((e) => (e.id === selectionne.id ? { ...e, ...modif } : e)));

  const ajouter = () => {
    const nouveau = type.nouveau(elements, filtre || brouillon.matieres[0]?.id || "");
    modifierListe(onglet, [...elements, nouveau]);
    setSelection((s) => ({ ...s, [onglet]: nouveau.id }));
  };

  const supprimer = () => {
    if (onglet === "matieres") {
      const lies = ["exercices", "qcms", "videos", "examens", "annales"].reduce(
        (n, cle) => n + brouillon[cle].filter((e) => e.matiere === selectionne.id).length,
        0
      );
      if (lies > 0) {
        window.alert(`Cette matière a encore ${lies} contenu(s) rattaché(s). Supprime-les ou change leur matière d'abord.`);
        return;
      }
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
                    <Editeur key={selectionne.id} element={selectionne} changer={changer} matieres={brouillon.matieres} />
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
