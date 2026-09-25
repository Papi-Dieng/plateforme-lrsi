import { useState } from "react";
import Icon from "../../components/Icon";
import { champAdmin as champ } from "../../components/ConnexionAdmin";
import QuizEnTexte from "../../components/QuizEnTexte";
import { AIDE_MISE_EN_FORME } from "../../components/TexteLibre";
import Apercu from "../../components/Apercu";
import { CorrectionExercice, EnonceExercice } from "../../components/AffichageExercice";
import {
  GenerateurQcm,
  SuggestionCompetence,
  RemplirDepuisPdf,
  SuggestionARetenir,
} from "../../components/AssistantAdmin";
import { texteExercice, texteQuestion } from "../../textesAgent";
import { deplacer, optionsCompetences, optionsMatieres } from "./outils";
import { Bouton, BoutonApercu, Champ, ChampPdf, Choix, Ordre, Zone } from "./champs";

/* ==================================================================
   Éditeurs des exercices (avec la vérification automatique) et des QCM.
   ================================================================== */

export function EditeurExercice({ element: e, changer, matieres, competences, motDePasse }) {
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
export function VerificationExercice({ lignes, changer }) {
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

export function EditeurQcm({ element: q, changer, matieres, competences, motDePasse }) {
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
