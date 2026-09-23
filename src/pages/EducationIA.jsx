import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icon";
import { Badge, Container, EnTetePage, cx } from "../components/ui";
import ConnexionAdmin, {
  champAdmin,
  ecrireSessionAdmin as ecrireSession,
  lireSessionAdmin as lireSession,
  messageErreurAdmin as messageErreur,
} from "../components/ConnexionAdmin";
import { matieres } from "../data/matieres";
import { themeMatiere } from "../data/couleurs";
import { repondre } from "../assistant";
import {
  decouperReponse,
  demanderIA,
  enregistrerFiche,
  iaActive,
  lireFiche,
  raisonEchec,
  verifierReponse,
} from "../ia";

/* ==================================================================
   Éduquer l'IA, matière par matière.

   On choisit une matière, puis on remplit sa fiche :
   - des consignes (ce que l'IA doit faire pour cette matière) ;
   - des questions-réponses modèles, qu'elle imite ;
   - des tests, lancés d'ici pour vérifier ses réponses.

   Rien n'est stocké dans le site : la fiche est enregistrée par le
   relais IA (Cloudflare KV) et n'est modifiable qu'avec le mot de
   passe admin, vérifié par le relais.

   Le cours des chapitres ne se saisit plus ici mais dans « Gérer le
   contenu » : le même texte sert aux étudiants et à l'IA.
   ================================================================== */

const MAX = { consignes: 4000 };

const ONGLETS = [
  { cle: "consignes", label: "Consignes", icone: "settings" },
  { cle: "exemples", label: "Questions-réponses modèles", icone: "sparkles" },
  { cle: "tests", label: "Tests", icone: "target" },
];

/* Les tests sont édités en texte, un mot par ligne ; les alternatives
   d'une même ligne sont séparées par « / ». */
const versTexte = (t) => ({
  question: t.question,
  contient: (t.contient ?? []).map((g) => g.join(" / ")).join("\n"),
  exclut: (t.exclut ?? []).join("\n"),
});
const lignes = (s) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
const depuisTexte = (t) => ({
  question: t.question.trim(),
  contient: lignes(t.contient).map((l) =>
    l
      .split("/")
      .map((m) => m.trim())
      .filter(Boolean)
  ),
  exclut: lignes(t.exclut),
});

const ficheVide = () => ({ consignes: "", cours: {}, exemples: [], tests: [] });

const champ = champAdmin;

function BoutonAction({ onClick, disabled, variante = "principal", icone, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variante === "principal"
          ? "bg-brand-600 text-white hover:bg-brand-700"
          : variante === "danger"
            ? "text-flame-600 hover:bg-flame-100 dark:text-flame-400 dark:hover:bg-flame-500/10"
            : "border border-ink-200 text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-200 dark:hover:bg-ink-800"
      )}
    >
      {icone && <Icon name={icone} className="size-4" />}
      {children}
    </button>
  );
}

function Compteur({ valeur, max }) {
  return (
    <p
      className={cx(
        "mt-1 text-right text-[11px]",
        valeur.length > max * 0.9 ? "text-sun-700 dark:text-sun-400" : "text-ink-400"
      )}
    >
      {valeur.length} / {max}
    </p>
  );
}

function ReponseIA({ texte }) {
  return (
    <div className="space-y-2 text-sm/6 text-ink-700 dark:text-ink-200">
      {decouperReponse(texte).map((b, i) =>
        b.type === "liste" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.elements.map((e, j) => (
              <li key={j}>{e}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{b.texte}</p>
        )
      )}
    </div>
  );
}

/* ---- Onglet Consignes ---- */

function OngletConsignes({ fiche, modifier, matiere }) {
  return (
    <div>
      <label
        htmlFor="consignes"
        className="text-sm font-semibold text-ink-900 dark:text-white"
      >
        Ce que l'IA doit faire pour {matiere.nom}
      </label>
      <p className="mt-1 text-xs/5 text-ink-500 dark:text-ink-400">
        Écris en français normal, une consigne par ligne. Elles s'ajoutent aux
        règles générales de l'assistant, pour les questions de cette matière.
      </p>
      <textarea
        id="consignes"
        rows={12}
        maxLength={MAX.consignes}
        value={fiche.consignes}
        onChange={(e) => modifier({ consignes: e.target.value })}
        placeholder={
          "Exemples :\n- Pour le NAT, explique toujours avec l'exemple d'une box internet.\n- Utilise le vocabulaire du cours : « diffusion » plutôt que « broadcast ».\n- Signale toujours le piège des adresses réseau et diffusion."
        }
        className={cx(champ, "mt-3 font-mono text-[13px]/6")}
      />
      <Compteur valeur={fiche.consignes} max={MAX.consignes} />
    </div>
  );
}

/* ---- Onglet Questions-réponses modèles ---- */

function OngletExemples({ fiche, modifier }) {
  const changer = (i, champModifie) =>
    modifier({
      exemples: fiche.exemples.map((e, j) => (j === i ? { ...e, ...champModifie } : e)),
    });

  return (
    <div>
      <p className="text-xs/5 text-ink-500 dark:text-ink-400">
        Une question d'étudiant et la réponse idéale que tu aurais donnée.
        L'IA imite leur ton, leur longueur et leur démarche. C'est le moyen le
        plus sûr de corriger un défaut qui revient. 15 au maximum.
      </p>
      <div className="mt-4 space-y-4">
        {fiche.exemples.map((e, i) => (
          <div key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
            <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
              Question de l'étudiant
              <input
                value={e.question}
                maxLength={600}
                onChange={(ev) => changer(i, { question: ev.target.value })}
                className={cx(champ, "mt-1.5 font-normal")}
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink-600 dark:text-ink-300">
              Réponse idéale
              <textarea
                rows={5}
                maxLength={2500}
                value={e.reponse}
                onChange={(ev) => changer(i, { reponse: ev.target.value })}
                className={cx(champ, "mt-1.5 font-normal")}
              />
            </label>
            <div className="mt-2 flex justify-end">
              <BoutonAction
                variante="danger"
                icone="trash"
                onClick={() =>
                  modifier({ exemples: fiche.exemples.filter((_, j) => j !== i) })
                }
              >
                Supprimer
              </BoutonAction>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <BoutonAction
          variante="secondaire"
          icone="pencil"
          disabled={fiche.exemples.length >= 15}
          onClick={() =>
            modifier({ exemples: [...fiche.exemples, { question: "", reponse: "" }] })
          }
        >
          Ajouter une question-réponse
        </BoutonAction>
      </div>
    </div>
  );
}

/* ---- Onglet Tests ---- */

/* Le guide cherche les contenus comme pour un étudiant. S'il ne trouve
   rien dans la matière testée, on ajoute la matière elle-même : sans
   cela, le relais n'y joindrait pas la fiche qu'on veut tester. */
function liensPour(question, matiere) {
  const liens = repondre(question, []).liens;
  if (liens.some((l) => l.matiere === matiere.id)) return liens;
  return [
    ...liens,
    { type: "matiere", matiere: matiere.id, titre: matiere.nom, to: `/cours/${matiere.id}` },
  ];
}

function OngletTests({ fiche, modifier, matiere, motDePasse, modifie }) {
  const [resultats, setResultats] = useState({});
  const [enCours, setEnCours] = useState(false);
  const [essai, setEssai] = useState("");
  const [reponseEssai, setReponseEssai] = useState(null);

  const tests = fiche.tests;
  const changer = (i, champModifie) =>
    modifier({ tests: tests.map((t, j) => (j === i ? { ...t, ...champModifie } : t)) });

  const poser = async (question) => {
    try {
      return { texte: await demanderIA([{ role: "etudiant", texte: question }], liensPour(question, matiere), motDePasse) };
    } catch (e) {
      return { erreur: raisonEchec(e.message) };
    }
  };

  const lancer = async (indices) => {
    setEnCours(true);
    for (const i of indices) {
      const t = depuisTexte(tests[i]);
      if (!t.question) continue;
      setResultats((r) => ({ ...r, [i]: { attente: true } }));
      const r = await poser(t.question);
      setResultats((prec) => ({
        ...prec,
        [i]: r.erreur
          ? { erreur: r.erreur }
          : { texte: r.texte, problemes: verifierReponse(r.texte, t) },
      }));
    }
    setEnCours(false);
  };

  const termines = Object.values(resultats).filter((r) => r.problemes);
  const reussis = termines.filter((r) => r.problemes.length === 0).length;

  return (
    <div className="space-y-8">
      {/* ---- Essai libre ---- */}
      <div className="rounded-xl bg-ink-50 p-4 dark:bg-ink-950">
        <p className="text-sm font-semibold text-ink-900 dark:text-white">
          Poser une question à l'IA
        </p>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
          Comme un étudiant, avec la fiche de {matiere.nom} telle qu'elle est
          enregistrée.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={essai}
            onChange={(e) => setEssai(e.target.value)}
            placeholder="Ex. : c'est quoi le NAT ?"
            aria-label="Question d'essai"
            className={champ}
          />
          <BoutonAction
            icone="arrow"
            disabled={!essai.trim() || reponseEssai?.attente}
            onClick={async () => {
              setReponseEssai({ attente: true });
              setReponseEssai(await poser(essai.trim()));
            }}
          >
            Essayer
          </BoutonAction>
        </div>
        {reponseEssai && (
          <div className="mt-3 rounded-xl bg-white p-4 dark:bg-ink-900">
            {reponseEssai.attente ? (
              <p className="text-sm text-ink-500">L'IA rédige sa réponse…</p>
            ) : reponseEssai.erreur ? (
              <p className="text-sm text-flame-600 dark:text-flame-400">{reponseEssai.erreur}</p>
            ) : (
              <ReponseIA texte={reponseEssai.texte} />
            )}
          </div>
        )}
      </div>

      {/* ---- Tests ---- */}
      <div>
        <p className="text-xs/5 text-ink-500 dark:text-ink-400">
          Une question, et ce qu'une bonne réponse doit contenir ou ne pas
          contenir, un mot par ligne. Plusieurs mots acceptés sur une même
          ligne se séparent par « / » : <code>62 / soixante-deux</code>.
          Majuscules et accents sont ignorés. Les tests ne sont jamais montrés
          à l'IA.
        </p>
        {modifie && (
          <p className="mt-2 text-xs font-medium text-sun-700 dark:text-sun-400">
            Enregistre d'abord : les tests utilisent la fiche enregistrée.
          </p>
        )}

        <div className="mt-4 space-y-4">
          {tests.map((t, i) => {
            const r = resultats[i];
            return (
              <div
                key={i}
                className={cx(
                  "rounded-xl border p-4",
                  r?.problemes?.length === 0
                    ? "border-accent-400/60"
                    : r?.problemes?.length || r?.erreur
                      ? "border-flame-400/60"
                      : "border-ink-200 dark:border-ink-800"
                )}
              >
                <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
                  Question
                  <input
                    value={t.question}
                    maxLength={600}
                    onChange={(e) => changer(i, { question: e.target.value })}
                    className={cx(champ, "mt-1.5 font-normal")}
                  />
                </label>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
                    La réponse doit contenir
                    <textarea
                      rows={3}
                      value={t.contient}
                      onChange={(e) => changer(i, { contient: e.target.value })}
                      placeholder={"62\ndiffusion / broadcast"}
                      className={cx(champ, "mt-1.5 font-mono font-normal text-[13px]")}
                    />
                  </label>
                  <label className="text-xs font-semibold text-ink-600 dark:text-ink-300">
                    La réponse ne doit pas contenir
                    <textarea
                      rows={3}
                      value={t.exclut}
                      onChange={(e) => changer(i, { exclut: e.target.value })}
                      placeholder="64 hôtes utilisables"
                      className={cx(champ, "mt-1.5 font-mono font-normal text-[13px]")}
                    />
                  </label>
                </div>

                {r && (
                  <div className="mt-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-950">
                    {r.attente ? (
                      <p className="text-sm text-ink-500">Test en cours…</p>
                    ) : r.erreur ? (
                      <p className="text-sm text-flame-600 dark:text-flame-400">{r.erreur}</p>
                    ) : (
                      <>
                        <p
                          className={cx(
                            "mb-2 text-sm font-semibold",
                            r.problemes.length
                              ? "text-flame-600 dark:text-flame-400"
                              : "text-accent-700 dark:text-accent-400"
                          )}
                        >
                          {r.problemes.length ? `Échec : ${r.problemes.join(" ; ")}` : "Réussi"}
                        </p>
                        <ReponseIA texte={r.texte} />
                      </>
                    )}
                  </div>
                )}

                <div className="mt-2 flex justify-end gap-1">
                  <BoutonAction
                    variante="secondaire"
                    icone="target"
                    disabled={enCours || modifie || !t.question.trim()}
                    onClick={() => lancer([i])}
                  >
                    Tester
                  </BoutonAction>
                  <BoutonAction
                    variante="danger"
                    icone="trash"
                    onClick={() => {
                      modifier({ tests: tests.filter((_, j) => j !== i) });
                      setResultats({});
                    }}
                  >
                    Supprimer
                  </BoutonAction>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <BoutonAction
            variante="secondaire"
            icone="pencil"
            disabled={tests.length >= 40}
            onClick={() =>
              modifier({ tests: [...tests, { question: "", contient: "", exclut: "" }] })
            }
          >
            Ajouter un test
          </BoutonAction>
          <BoutonAction
            icone="target"
            disabled={enCours || modifie || tests.length === 0}
            onClick={() => lancer(tests.map((_, i) => i))}
          >
            {enCours ? "Tests en cours…" : "Lancer tous les tests"}
          </BoutonAction>
          {termines.length > 0 && !enCours && (
            <Badge ton={reussis === termines.length ? "accent" : "sun"}>
              {reussis} / {termines.length} réussis
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */

export default function EducationIA() {
  const [motDePasse, setMotDePasse] = useState(lireSession);
  const [matiereId, setMatiereId] = useState(matieres[0].id);
  const [onglet, setOnglet] = useState("consignes");
  const [fiche, setFiche] = useState(null);
  const [modifie, setModifie] = useState(false);
  const [etat, setEtat] = useState({ type: "", texte: "" });

  const matiere = matieres.find((m) => m.id === matiereId);

  const deconnecter = (message = "") => {
    ecrireSession("");
    setMotDePasse("");
    setFiche(null);
    setModifie(false);
    setEtat({ type: message ? "erreur" : "", texte: message });
  };

  useEffect(() => {
    if (!motDePasse) return;
    let annule = false;
    lireFiche(matiereId, motDePasse)
      .then((f) => {
        if (annule) return;
        setFiche({ ...ficheVide(), ...f, tests: (f.tests ?? []).map(versTexte) });
        setEtat({
          type: "",
          texte: f.majLe
            ? `Dernier enregistrement : ${new Date(f.majLe).toLocaleString("fr-FR")}`
            : "Aucune fiche enregistrée pour cette matière.",
        });
      })
      .catch((e) => {
        if (annule) return;
        if (e.message === "mot-de-passe") deconnecter(messageErreur(e.message));
        else setEtat({ type: "erreur", texte: messageErreur(e.message) });
      });
    return () => {
      annule = true;
    };
  }, [matiereId, motDePasse]);

  const modifier = (changement) => {
    setFiche((f) => ({ ...f, ...changement }));
    setModifie(true);
  };

  const changerMatiere = (id) => {
    if (modifie && !window.confirm("Des modifications ne sont pas enregistrées. Les abandonner ?")) {
      return;
    }
    // La fiche de l'ancienne matière disparaît pendant le chargement.
    setFiche(null);
    setModifie(false);
    setMatiereId(id);
  };

  const enregistrer = async () => {
    setEtat({ type: "", texte: "Enregistrement…" });
    try {
      const enregistree = await enregistrerFiche(
        matiereId,
        { ...fiche, nom: matiere.nom, tests: fiche.tests.map(depuisTexte) },
        motDePasse
      );
      setModifie(false);
      setEtat({
        type: "ok",
        texte: `Enregistré à ${new Date(enregistree.majLe).toLocaleTimeString("fr-FR")}. L'IA l'utilise dès maintenant.`,
      });
    } catch (e) {
      if (e.message === "mot-de-passe") deconnecter(messageErreur(e.message));
      else setEtat({ type: "erreur", texte: messageErreur(e.message) });
    }
  };

  return (
    <>
      <EnTetePage
        surtitre="Espace d'administration"
        titre="Éduquer l'IA"
        texte="Matière par matière : ce que l'assistant doit faire, des réponses modèles à imiter, et des tests pour vérifier. Le cours des chapitres, qu'il lit aussi, se saisit dans « Gérer le contenu »."
      >
        <Link
          to="/admin"
          className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          ← Retour à l'administration
        </Link>
      </EnTetePage>

      <Container className="space-y-6 py-10">
        {!iaActive ? (
          <div className="card p-6 text-sm text-ink-700 dark:text-ink-300">
            L'IA n'est pas branchée : `urlIA` est vide dans `src/data/site.js`.
          </div>
        ) : !motDePasse ? (
          <>
            {etat.type === "erreur" && (
              <p className="text-sm text-flame-600 dark:text-flame-400">{etat.texte}</p>
            )}
            <ConnexionAdmin
              onConnecte={(mdp) => {
                setEtat({ type: "", texte: "" });
                setMotDePasse(mdp);
              }}
            />
          </>
        ) : (
          <>
            {/* ---- Choix de la matière ---- */}
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">Matière</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {matieres.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => changerMatiere(m.id)}
                    aria-pressed={m.id === matiereId}
                    className={cx(
                      "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors",
                      m.id === matiereId
                        ? "border-brand-500 bg-brand-600 font-semibold text-white"
                        : "border-ink-200 text-ink-700 hover:border-brand-300 dark:border-ink-700 dark:text-ink-300"
                    )}
                  >
                    <span
                      className={cx(
                        "grid size-5 place-items-center rounded-md",
                        themeMatiere(m).pastille
                      )}
                    >
                      <Icon name={m.icone} className="size-3" />
                    </span>
                    {m.nomCourt}
                  </button>
                ))}
              </div>
            </div>

            <div className="card overflow-hidden">
              {/* ---- Onglets ---- */}
              <div
                role="tablist"
                className="flex gap-1 overflow-x-auto border-b border-ink-200 px-3 pt-3 dark:border-ink-800"
              >
                {ONGLETS.map((o) => (
                  <button
                    key={o.cle}
                    role="tab"
                    type="button"
                    aria-selected={onglet === o.cle}
                    onClick={() => setOnglet(o.cle)}
                    className={cx(
                      "inline-flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm transition-colors",
                      onglet === o.cle
                        ? "border-brand-500 font-semibold text-brand-700 dark:text-brand-300"
                        : "border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200"
                    )}
                  >
                    <Icon name={o.icone} className="size-4" />
                    {o.label}
                  </button>
                ))}
              </div>

              <div className="p-5 sm:p-6">
                {!fiche ? (
                  <p className="text-sm text-ink-500">
                    {etat.type === "erreur" ? etat.texte : "Chargement de la fiche…"}
                  </p>
                ) : onglet === "consignes" ? (
                  <OngletConsignes fiche={fiche} modifier={modifier} matiere={matiere} />
                ) : onglet === "exemples" ? (
                  <OngletExemples fiche={fiche} modifier={modifier} />
                ) : (
                  <OngletTests
                    key={matiereId}
                    fiche={fiche}
                    modifier={modifier}
                    matiere={matiere}
                    motDePasse={motDePasse}
                    modifie={modifie}
                  />
                )}
              </div>

              {/* ---- Enregistrement ---- */}
              <div className="flex flex-wrap items-center gap-3 border-t border-ink-200 bg-ink-50 px-5 py-4 dark:border-ink-800 dark:bg-ink-950">
                <BoutonAction icone="check" disabled={!fiche || !modifie} onClick={enregistrer}>
                  Enregistrer
                </BoutonAction>
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
                  {modifie ? "Modifications non enregistrées." : etat.texte}
                </p>
                <button
                  type="button"
                  onClick={() => deconnecter()}
                  className="ml-auto text-xs text-ink-500 hover:underline dark:text-ink-400"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
