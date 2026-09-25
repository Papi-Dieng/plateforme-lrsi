import { useState } from "react";
import Icon from "../../components/Icon";
import { Badge } from "../../components/ui";
import { themesMatiere } from "../../data/couleurs";
import TexteLibre, { AIDE_MISE_EN_FORME } from "../../components/TexteLibre";
import Apercu from "../../components/Apercu";
import LectureTexte from "../../components/LectureTexte";
import LecteurPdf from "../../components/LecteurPdf";
import { deplacer, ICONES_MATIERE, optionsMatieres } from "./outils";
import { Bouton, BoutonApercu, Champ, ChampPdf, Choix, Ordre, Zone } from "./champs";

/* ==================================================================
   Éditeurs des matières (avec le cours de chaque chapitre) et des
   compétences.
   ================================================================== */

/* Le cours d'un chapitre : un texte écrit, un PDF, ou les deux. Le
   texte s'affiche sur le site (« Lire ici ») ; le PDF est proposé en
   téléchargement. Sans texte, les étudiants lisent le PDF. */
export function CoursChapitre({ chapitre: c, changer, motDePasse }) {
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

export function EditeurMatiere({ element: m, changer, motDePasse }) {
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

/* Une compétence : ce que l'analyse mesure. Les questions de QCM et les
   exercices y sont rattachés, et elle renvoie vers les chapitres à
   relire quand elle est faible. */
export function EditeurCompetence({ element: c, changer, matieres, usages }) {
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
