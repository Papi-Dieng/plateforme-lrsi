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

   La mise en page reprend la maquette voulue : panneau de discussion
   à gauche, capacités et questions rapides à droite.

   Deux écarts assumés par rapport à cette maquette :

   1. Les compteurs de l'en-tête. La maquette affiche « 247
      conversations » et « 98 % de satisfaction ». Inventer ces
      chiffres reviendrait à mentir sur un outil qui n'a jamais
      tourné. Le même emplacement montre donc des nombres réels,
      tirés de la progression enregistrée dans ce navigateur.

   2. La réponse de l'assistant. La maquette montre un message qui
      explique et propose de l'aide. Ici, la seule bulle d'assistant
      dit ce qui est vrai : il n'est pas branché. Aucune réponse
      pédagogique n'est fabriquée, aucun champ n'est actif.
   ================================================================== */

/* Exemples de demandes. Ce sont des QUESTIONS, jamais des réponses. */
const questionsRapides = [
  "Je n'ai pas compris le masque de sous-réseau, tu peux reprendre ?",
  "Donne-moi un exercice sur les adresses IP, de mon niveau.",
  "Interroge-moi sur le chapitre que je révise en ce moment.",
  "Sur quoi devrais-je travailler en priorité cette semaine ?",
];

const capacites = [
  {
    icone: "bulb",
    titre: "Reprendre une notion",
    texte:
      "Réexpliquer autrement ce que le cours n'a pas fait passer, avec un autre angle et un exemple.",
  },
  {
    icone: "target",
    titre: "Interroger",
    texte:
      "Poser des questions sur un chapitre pour vérifier que c'est compris, et pas seulement lu.",
  },
  {
    icone: "pencil",
    titre: "Proposer un exercice",
    texte:
      "Choisir un exercice au niveau réellement atteint, d'après les QCM déjà terminés.",
  },
];

const cequilNeFeraPas = [
  "Donner la réponse d'un exercice sans faire chercher d'abord.",
  "Composer un devoir à la place de l'étudiant.",
  "Remplacer le cours de l'enseignant, ni le contredire.",
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

  /* Les trois compteurs de l'en-tête. À la place des statistiques
     flatteuses d'une maquette, les seuls nombres que la plateforme
     peut affirmer sans mentir. */
  const compteurs = [
    {
      icone: "target",
      valeur: reponses,
      label: reponses > 1 ? "réponses analysées" : "réponse analysée",
    },
    {
      icone: "layers",
      valeur: fragiles.length,
      label: fragiles.length > 1 ? "compétences fragiles" : "compétence fragile",
    },
    {
      icone: "book",
      valeur: modules.length,
      label: modules.length > 1 ? "chapitres à revoir" : "chapitre à revoir",
    },
  ];

  const detailProgression = [
    {
      icone: "target",
      valeur: reponses,
      label: reponses > 1 ? "réponses enregistrées" : "réponse enregistrée",
      detail: "chaque question de QCM terminée alimente l'analyse",
    },
    {
      icone: "layers",
      valeur: fragiles.length,
      label: fragiles.length > 1 ? "compétences fragiles" : "compétence fragile",
      detail: `repérées à partir de ${MINIMUM_REPONSES} réponses au minimum`,
    },
    {
      icone: "book",
      valeur: modules.length,
      label: modules.length > 1 ? "chapitres à revoir" : "chapitre à revoir",
      detail: "déduits des compétences fragiles, pas d'un jugement global",
    },
    {
      icone: "pencil",
      valeur: exercicesTravailles.length,
      label:
        exercicesTravailles.length > 1
          ? "exercices travaillés"
          : "exercice travaillé",
      detail: "pour éviter de reproposer ce qui est déjà maîtrisé",
    },
  ];

  return (
    <>
      <EnTetePage
        surtitre="Prévu pour la version 4"
        titre="Assistant de révision"
        texte="Un assistant qui reprend une notion mal comprise, interroge sur un chapitre et propose des exercices au bon niveau. Il n'est pas encore en service : cette page montre l'interface prévue et ce sur quoi il s'appuiera."
      >
        <Badge ton="neutre" icone="lock">
          Pas encore disponible
        </Badge>
      </EnTetePage>

      <Container className="space-y-12 py-10">
        {/* ============================================================
            L'interface prévue : discussion à gauche, panneaux à droite
            ============================================================ */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ---- Panneau de discussion ---- */}
          <div className="card flex flex-col overflow-hidden lg:col-span-2">
            {/* En-tête sombre, comme la maquette */}
            <div className="bg-brand-950 px-6 py-5 dark:bg-brand-950">
              <div className="flex items-center gap-3.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15">
                  <Icon name="sparkles" className="size-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Assistant de révision
                  </h2>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-white/70">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full bg-sun-400"
                    />
                    Pas encore en service
                  </p>
                </div>
              </div>

              {/* Compteurs réels, à la place des statistiques inventées */}
              <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-4">
                {compteurs.map((c) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <Icon name={c.icone} className="size-4 text-white/50" />
                    <dt className="sr-only">{c.label}</dt>
                    <dd className="text-sm text-white/80">
                      <span className="font-semibold text-white">
                        {c.valeur}
                      </span>{" "}
                      {c.label}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* ---- Fil de discussion ---- */}
            <div className="flex-1 space-y-5 px-6 py-6">
              {/* Bulle de l'étudiant : un exemple de demande */}
              <div className="flex justify-end">
                <div className="max-w-md">
                  <p className="rounded-2xl rounded-br-md bg-brand-600 px-4 py-3 text-sm/6 text-white">
                    Je n'ai pas compris le masque de sous-réseau, tu peux
                    reprendre ?
                  </p>
                  <p className="mt-1.5 text-right text-xs text-ink-400 dark:text-ink-500">
                    exemple de question
                  </p>
                </div>
              </div>

              {/* Bulle de l'assistant : la seule chose vraie qu'il puisse
                  dire aujourd'hui. Pas de contenu pédagogique fabriqué. */}
              <div className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
                  <Icon name="sparkles" className="size-4" />
                </span>
                <div className="max-w-md">
                  <div className="rounded-2xl rounded-bl-md bg-ink-100 px-4 py-3 text-sm/6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                    <p>
                      Je ne suis pas encore branché, je ne peux donc pas
                      répondre à cette question.
                    </p>
                    <p className="mt-2">
                      Aucune réponse n'est simulée ici : t'en montrer une
                      fabriquée donnerait confiance à tort. En attendant,{" "}
                      <Link
                        to="/cours"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-300"
                      >
                        le cours
                      </Link>{" "}
                      et{" "}
                      <Link
                        to="/exercices"
                        className="font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700 dark:text-brand-300"
                      >
                        les exercices corrigés
                      </Link>{" "}
                      traitent le sujet.
                    </p>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">
                    réponse réelle de la plateforme, aujourd'hui
                  </p>
                </div>
              </div>
            </div>

            {/* ---- Champ de saisie, volontairement inerte ---- */}
            <div className="border-t border-ink-200 px-6 py-5 dark:border-ink-800">
              <label htmlFor="assistant-question" className="sr-only">
                Écrire à l'assistant
              </label>
              <div className="flex items-end gap-3">
                <input
                  id="assistant-question"
                  type="text"
                  disabled
                  placeholder="L'assistant n'est pas encore connecté."
                  className="min-w-0 flex-1 cursor-not-allowed rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-500 placeholder:text-ink-400 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-400"
                />
                <button
                  type="button"
                  disabled
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl bg-ink-200 px-5 py-3 text-sm font-semibold text-ink-400 dark:bg-ink-800 dark:text-ink-500"
                >
                  <Icon name="arrow" className="size-4" />
                  Envoyer
                </button>
              </div>
            </div>
          </div>

          {/* ---- Colonne de droite ---- */}
          <div className="space-y-6">
            {/* Ce qu'il saura faire */}
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="sparkles" className="size-4 text-flame-500" />
                Ce qu'il saura faire
              </h2>

              <ul className="mt-4 space-y-3">
                {capacites.map((c) => (
                  <li
                    key={c.titre}
                    className="flex gap-3 rounded-xl bg-ink-50 p-3.5 dark:bg-ink-950"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600 ring-1 ring-ink-200 dark:bg-ink-900 dark:text-brand-300 dark:ring-ink-800">
                      <Icon name={c.icone} className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-900 dark:text-white">
                        {c.titre}
                      </p>
                      <p className="mt-0.5 text-xs/5 text-ink-600 dark:text-ink-400">
                        {c.texte}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Questions rapides */}
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                <Icon name="bulb" className="size-4 text-flame-500" />
                Questions rapides
              </h2>
              <p className="mt-1 text-xs/5 text-ink-500 dark:text-ink-400">
                Ce qu'on pourra lui demander en un clic. Inactif tant qu'il
                n'est pas branché.
              </p>

              <ul className="mt-4 space-y-2.5">
                {questionsRapides.map((q) => (
                  <li key={q}>
                    <span className="block cursor-not-allowed rounded-xl border border-ink-200 px-3.5 py-2.5 text-xs/5 text-ink-500 dark:border-ink-800 dark:text-ink-400">
                      {q}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* ============================================================
            Les données réelles sur lesquelles il s'appuiera
            ============================================================ */}
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
                rien sur quoi s'appuyer — c'est pour cela que les compteurs
                ci-dessus sont à zéro. Il ne devinera pas ton niveau, il le lira
                dans ce que tu auras réellement fait. Une compétence n'est jugée
                qu'à partir de {MINIMUM_REPONSES} réponses, pour éviter de
                conclure sur un coup de chance ou un moment d'inattention.
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
                {detailProgression.map((m) => (
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

        {/* ============================================================
            La limite pédagogique
            ============================================================ */}
        <section>
          <TitreSection
            surtitre="Le cadre"
            titre="Ce qu'il ne fera pas"
            texte="Un assistant qui donne les réponses fait gagner du temps et perdre l'examen. La limite est posée avant d'écrire la première ligne."
          />

          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {cequilNeFeraPas.map((t) => (
              <li key={t} className="card flex gap-3 p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-flame-100 text-flame-600 dark:bg-flame-500/15 dark:text-flame-400">
                  <Icon name="close" className="size-4" />
                </span>
                <p className="text-sm/6 text-ink-700 dark:text-ink-300">{t}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ============================================================
            Ce qui doit exister avant
            ============================================================ */}
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
