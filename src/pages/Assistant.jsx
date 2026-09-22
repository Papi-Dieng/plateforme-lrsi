import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import {
  Badge,
  Bouton,
  Container,
  EnTetePage,
  NoteDemo,
  TitreSection,
} from "../components/ui";
import { lireExercicesTravailles, lireScores } from "../progression";
import {
  MINIMUM_REPONSES,
  analyserCompetences,
  faiblesses,
  modulesAAmeliorer,
  reponsesEnregistrees,
} from "../competences";

/* ==================================================================
   Assistant de révision — prévu pour la version 4.

   Cette page présente un outil qui N'EXISTE PAS ENCORE. Elle ne
   simule donc aucune conversation, et n'affiche aucune réponse
   inventée : laisser croire que l'assistant fonctionne déjà ne
   ferait que déplacer la déception au premier vrai besoin.

   En revanche, ce qu'elle montre est réel. Les chiffres viennent de
   la progression enregistrée dans ce navigateur : ils expliquent
   concrètement sur quoi l'assistant s'appuiera, au lieu de le
   décrire dans le vide.
   ================================================================== */

/* Exemples de demandes. Ce sont des QUESTIONS, jamais des réponses :
   rien ici ne peut être pris pour un résultat produit par l'outil. */
const exemplesDeQuestions = [
  {
    icone: "bulb",
    texte: "Je n'ai pas compris le masque de sous-réseau, tu peux reprendre ?",
  },
  {
    icone: "pencil",
    texte: "Donne-moi un exercice sur les adresses IP, de mon niveau.",
  },
  {
    icone: "target",
    texte: "Interroge-moi sur le chapitre que je révise en ce moment.",
  },
  {
    icone: "layers",
    texte: "Sur quoi devrais-je travailler en priorité cette semaine ?",
  },
];

const cequilFera = [
  "Reprendre une notion autrement quand le cours n'a pas suffi.",
  "Poser des questions pour vérifier que c'est compris, pas seulement lu.",
  "Proposer un exercice adapté au niveau réellement atteint.",
  "Signaler les chapitres à revoir, en s'appuyant sur les QCM déjà faits.",
];

const cequilNeFeraPas = [
  "Donner la réponse d'un exercice sans faire chercher d'abord.",
  "Composer un devoir à la place de l'étudiant.",
  "Remplacer le cours de l'enseignant ni le contredire.",
  "Inventer une réponse quand il ne sait pas : il le dira.",
];

/* ================================================================== */

export default function Assistant() {
  const [scores, setScores] = useState({});
  const [exercicesTravailles, setExercicesTravailles] = useState([]);

  useEffect(() => {
    setScores(lireScores());
    setExercicesTravailles(lireExercicesTravailles());
  }, []);

  const analyse = useMemo(() => analyserCompetences(scores), [scores]);

  const reponses = reponsesEnregistrees(analyse);
  const fragiles = faiblesses(analyse);
  const modules = modulesAAmeliorer(analyse);

  const matiere = [
    {
      valeur: reponses,
      label: reponses > 1 ? "réponses enregistrées" : "réponse enregistrée",
      detail: "chaque question de QCM terminée alimente l'analyse",
      icone: "target",
    },
    {
      valeur: fragiles.length,
      label:
        fragiles.length > 1 ? "compétences fragiles" : "compétence fragile",
      detail: `repérées à partir de ${MINIMUM_REPONSES} réponses au minimum`,
      icone: "layers",
    },
    {
      valeur: modules.length,
      label: modules.length > 1 ? "chapitres à revoir" : "chapitre à revoir",
      detail: "déduits des compétences fragiles, pas d'un jugement global",
      icone: "book",
    },
    {
      valeur: exercicesTravailles.length,
      label:
        exercicesTravailles.length > 1
          ? "exercices travaillés"
          : "exercice travaillé",
      detail: "pour éviter de reproposer ce qui est déjà maîtrisé",
      icone: "pencil",
    },
  ];

  return (
    <>
      <EnTetePage
        surtitre="Prévu pour la version 4"
        titre="Assistant de révision"
        texte="Un assistant qui reprend une notion mal comprise, interroge sur un chapitre et propose des exercices au bon niveau. Il n'est pas encore en service : cette page explique ce qu'il fera et sur quoi il s'appuiera."
      >
        <Badge ton="neutre" icone="lock">
          Pas encore disponible
        </Badge>
      </EnTetePage>

      <Container className="space-y-12 py-10">
        {/* ---- L'avertissement, en premier et sans ambiguïté ---- */}
        <div className="card flex flex-col gap-4 border-sun-300/70 bg-sun-50 p-6 sm:flex-row sm:items-start dark:border-sun-500/30 dark:bg-sun-500/10">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sun-100 text-sun-700 dark:bg-sun-500/20 dark:text-sun-300">
            <Icon name="lock" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-ink-900 dark:text-white">
              Rien ne répond encore derrière cette page
            </h2>
            <p className="mt-1.5 text-sm/6 text-ink-700 dark:text-ink-300">
              Aucune conversation n'est simulée ici, et aucune réponse n'est
              affichée. Un assistant qui ferait semblant de fonctionner
              donnerait confiance à tort, jusqu'au jour où il faudrait vraiment
              compter dessus. La suite ci-dessous décrit un outil à construire,
              pas un outil caché.
            </p>
          </div>
        </div>

        {/* ---- Ce qu'on pourra lui demander ---- */}
        <section>
          <TitreSection
            surtitre="À quoi ça servira"
            titre="Ce que tu pourras lui demander"
            texte="Quatre exemples de demandes. Les réponses, elles, n'existent pas encore : elles viendront avec la version 4."
          />

          <div className="mt-6 card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-5 py-3 dark:border-ink-800 dark:bg-ink-950">
              <Icon
                name="sparkles"
                className="size-4 text-ink-400 dark:text-ink-500"
              />
              <span className="text-sm font-medium text-ink-500 dark:text-ink-400">
                Assistant de révision
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-xs font-medium text-ink-500 dark:bg-ink-800 dark:text-ink-400">
                <Icon name="lock" className="size-3" />
                hors service
              </span>
            </div>

            <ul className="space-y-3 p-5">
              {exemplesDeQuestions.map((q) => (
                <li key={q.texte} className="flex justify-end">
                  <span className="inline-flex max-w-lg items-start gap-2.5 rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm/6 text-white">
                    <Icon name={q.icone} className="mt-0.5 size-4 shrink-0 opacity-80" />
                    {q.texte}
                  </span>
                </li>
              ))}
            </ul>

            {/* Champ volontairement inerte : il montre la forme de
                l'interface, il ne prétend pas la faire marcher. */}
            <div className="flex items-center gap-3 border-t border-ink-200 px-5 py-4 dark:border-ink-800">
              <label htmlFor="assistant-question" className="sr-only">
                Écrire à l'assistant
              </label>
              <input
                id="assistant-question"
                type="text"
                disabled
                placeholder="L'assistant n'est pas encore connecté."
                className="min-w-0 flex-1 cursor-not-allowed rounded-xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-500 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-400"
              />
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 cursor-not-allowed place-items-center rounded-xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500"
              >
                <Icon name="arrow" className="size-4" />
              </span>
            </div>
          </div>
        </section>

        {/* ---- Les données réelles sur lesquelles il s'appuiera ---- */}
        <section>
          <TitreSection
            surtitre="Sur quoi il s'appuiera"
            titre="Ce qu'il saura de toi"
            texte="Ces chiffres ne sont pas des exemples : ils viennent de ta progression, enregistrée dans ce navigateur."
          />

          {reponses === 0 ? (
            <div className="mt-6 card p-6">
              <p className="text-sm/6 text-ink-700 dark:text-ink-300">
                Tu n'as pas encore terminé de QCM, l'assistant n'aurait donc
                rien sur quoi s'appuyer. C'est le point important : il ne
                devinera pas ton niveau, il le lira dans ce que tu auras
                réellement fait. Une compétence n'est jugée qu'à partir de{" "}
                {MINIMUM_REPONSES} réponses, pour éviter de conclure sur un
                coup de chance ou un moment d'inattention.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Bouton to="/qcm">
                  <Icon name="target" className="size-4" />
                  Faire un premier QCM
                </Bouton>
                <Bouton to="/progression" variante="secondaire">
                  Voir ma progression
                </Bouton>
              </div>
            </div>
          ) : (
            <>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {matiere.map((m) => (
                  <li key={m.label} className="card p-5">
                    <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                      <Icon name={m.icone} className="size-4.5" />
                    </span>
                    <p className="mt-3 text-3xl font-bold tracking-tight text-ink-900 dark:text-white">
                      {m.valeur}
                    </p>
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                      {m.label}
                    </p>
                    <p className="mt-1.5 text-xs/5 text-ink-500 dark:text-ink-400">
                      {m.detail}
                    </p>
                  </li>
                ))}
              </ul>

              {modules.length > 0 && (
                <div className="mt-4 card p-5">
                  <p className="text-sm/6 text-ink-700 dark:text-ink-300">
                    Par exemple, l'assistant commencerait aujourd'hui par{" "}
                    <strong className="font-semibold text-ink-900 dark:text-white">
                      {modules[0].chapitre}
                    </strong>{" "}
                    en {modules[0].nomMatiere}, parce que la compétence «{" "}
                    {modules[0].motif} » est à {modules[0].taux} %. Ce choix
                    vient d'un calcul sur tes réponses, pas d'une préférence.
                  </p>
                  <div className="mt-4">
                    <Bouton to="/progression" variante="secondaire">
                      Voir le détail par compétence
                    </Bouton>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* ---- Le cadre pédagogique ---- */}
        <section>
          <TitreSection
            surtitre="Le cadre"
            titre="Ce qu'il fera, et ce qu'il ne fera pas"
            texte="Un assistant qui donne les réponses fait gagner du temps et perdre l'examen. La limite est posée avant d'écrire la première ligne."
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="card p-6">
              <h3 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">
                  <Icon name="check" className="size-4" />
                </span>
                Ce qu'il fera
              </h3>
              <ul className="mt-4 space-y-3">
                {cequilFera.map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm/6 text-ink-700 dark:text-ink-300">
                    <Icon
                      name="check"
                      className="mt-1 size-4 shrink-0 text-accent-500"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6">
              <h3 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <span className="grid size-7 place-items-center rounded-lg bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400">
                  <Icon name="close" className="size-4" />
                </span>
                Ce qu'il ne fera pas
              </h3>
              <ul className="mt-4 space-y-3">
                {cequilNeFeraPas.map((t) => (
                  <li key={t} className="flex gap-2.5 text-sm/6 text-ink-700 dark:text-ink-300">
                    <Icon
                      name="close"
                      className="mt-1 size-4 shrink-0 text-flame-500"
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ---- Ce qui doit exister avant ---- */}
        <section>
          <TitreSection
            surtitre="Pourquoi pas tout de suite"
            titre="Ce qui doit exister avant"
            texte="L'assistant ne vaudra que ce que vaut le contenu derrière lui."
          />

          <div className="mt-6 card p-6">
            <p className="text-sm/6 text-ink-700 dark:text-ink-300">
              Un assistant branché sur trois QCM donnerait des conseils fondés
              sur trois QCM. Pour qu'il sache où tu en es, il faut assez de
              questions par matière, chacune rattachée à une compétence — c'est
              déjà le cas de celles qui existent. Il faut aussi que les cours
              soient en ligne, et donc{" "}
              <Link
                to="/projet"
                className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-300"
              >
                l'autorisation du département et des enseignants
              </Link>
              , sans quoi rien n'est publié.
            </p>
            <p className="mt-3 text-sm/6 text-ink-700 dark:text-ink-300">
              En attendant, tout ce que tu fais compte : chaque QCM terminé
              affine l'analyse dont l'assistant se servira le jour où il
              arrivera.
            </p>
          </div>
        </section>

        <NoteDemo>
          Quand l'assistant existera, ce qu'il lira de ta progression restera
          sur cet appareil tant que les comptes n'existent pas. Ce qui sera
          envoyé à un service d'intelligence artificielle, et ce qui ne le sera
          pas, sera écrit noir sur blanc dans les conditions d'utilisation
          avant la moindre mise en service.
        </NoteDemo>
      </Container>
    </>
  );
}
