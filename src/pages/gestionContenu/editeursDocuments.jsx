import { useState } from "react";
import Icon from "../../components/Icon";
import { cx } from "../../components/classes";
import { typesRessource } from "../../data/bibliotheque";
import { useCouverture } from "../../couvertures";
import { deplacer, extraireYoutube, optionsMatieres } from "./outils";
import { Bouton, Champ, ChampPdf, Choix, ChoixFormat, Ordre, Zone } from "./champs";
import { decouperDevoir } from "../../ia";
import { messageErreurAdmin } from "../../sessionAdmin";
import { urlPdf } from "../../contenu";

/* ==================================================================
   Éditeurs des vidéos, des devoirs (`examens`), des examens passés
   (`annales`) et des ressources de la bibliothèque.
   ================================================================== */

export function EditeurVideo({ element: v, changer, matieres }) {
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

/* ==================================================================
   « Tout coller d'un coup » : le sujet entier d'un côté, le corrigé
   entier de l'autre, et l'IA retrouve les questions (demande du
   14 octobre 2026).

   Écrire les parties une par une est long, alors que l'auteur a déjà
   son devoir écrit, ou en PDF. L'IA ne rédige rien : elle recopie et
   range (serveur-ia/decoupage.js). Elle relève aussi le barème quand le
   sujet l'écrit (« (3 points) ») ; sinon chaque partie vaut 0 point et
   l'auteur les remplit, ce que le bandeau lui dit.
   ================================================================== */

function DecoupageDevoir({ devoir, changer, motDePasse }) {
  const [ouvert, setOuvert] = useState(false);
  const [sujet, setSujet] = useState("");
  const [corrige, setCorrige] = useState("");
  const [etat, setEtat] = useState({ attente: "", erreur: "", bilan: "" });

  const texteDuPdf = async (pdf) => {
    const reponse = await fetch(urlPdf(pdf.id));
    if (!reponse.ok) throw new Error("fichier");
    const { extraireTextePdf } = await import("../../extrairePdf");
    return extraireTextePdf(new File([await reponse.blob()], "document.pdf", { type: "application/pdf" }));
  };

  const lirePdfs = async () => {
    setEtat({ attente: "Lecture des PDF…", erreur: "", bilan: "" });
    try {
      const [s, c] = await Promise.all([
        devoir.pdfEnonce ? texteDuPdf(devoir.pdfEnonce) : "",
        devoir.pdfCorrige ? texteDuPdf(devoir.pdfCorrige) : "",
      ]);
      if (s) setSujet(s);
      if (c) setCorrige(c);
      setEtat({
        attente: "",
        erreur: s ? "" : "Ce PDF ne contient pas de texte : c'est un PDF scanné. Colle le sujet à la main.",
        bilan: s ? `${s.length.toLocaleString("fr-FR")} caractères lus dans le sujet.` : "",
      });
    } catch {
      setEtat({ attente: "", erreur: "Les PDF n'ont pas pu être lus.", bilan: "" });
    }
  };

  const decouper = async () => {
    setEtat({ attente: "Découpage par l'IA…", erreur: "", bilan: "" });
    try {
      const { parties } = await decouperDevoir({ sujet, corrige }, motDePasse);
      // Les parties déjà écrites sont gardées : le découpage s'ajoute.
      changer({ format: "parties", parties: [...devoir.parties, ...parties] });
      const sansBareme = parties.filter((p) => !p.points).length;
      setEtat({
        attente: "",
        erreur: "",
        bilan:
          `${parties.length} partie${parties.length > 1 ? "s" : ""} ajoutée${parties.length > 1 ? "s" : ""}.` +
          (sansBareme ? ` ${sansBareme} sans barème dans le sujet : mets les points toi-même.` : " Barème repris du sujet."),
      });
    } catch (e) {
      setEtat({ attente: "", erreur: messageErreurAdmin(e.message), bilan: "" });
    }
  };

  if (!ouvert) {
    return (
      <Bouton icone="sparkles" onClick={() => setOuvert(true)}>
        Coller tout le devoir d&apos;un coup
      </Bouton>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">Coller tout le devoir d&apos;un coup</h3>
          <p className="mt-1 text-xs/5 text-ink-600 dark:text-ink-400">
            Colle le sujet entier et le corrigé entier : l&apos;IA retrouve les questions, rapproche chaque corrigé, et
            reprend le barème écrit dans le sujet. Elle ne réécrit rien — vérifie quand même avant de publier.
          </p>
        </div>
        <Bouton onClick={() => setOuvert(false)}>Fermer</Bouton>
      </div>

      {(devoir.pdfEnonce || devoir.pdfCorrige) && (
        <Bouton icone="file" onClick={lirePdfs}>
          Reprendre le texte des PDF
        </Bouton>
      )}

      <Zone label="Tout le sujet" rows={6} value={sujet} maxLength={30000} onChange={(e) => setSujet(e.target.value)} />
      <Zone label="Tout le corrigé" aide="Facultatif, mais c'est lui qui permet la correction par l'IA." rows={6} value={corrige} maxLength={30000} onChange={(e) => setCorrige(e.target.value)} />

      <div className="flex flex-wrap items-center gap-3">
        <Bouton variante="principal" icone="sparkles" disabled={sujet.trim().length < 20 || Boolean(etat.attente)} onClick={decouper}>
          Découper en questions
        </Bouton>
        {etat.attente && <p className="text-sm text-ink-600 dark:text-ink-300">{etat.attente}</p>}
        {etat.bilan && <p className="text-sm font-semibold text-accent-700 dark:text-accent-300">{etat.bilan}</p>}
      </div>
      {etat.erreur && (
        <p role="alert" className="text-sm text-flame-700 dark:text-flame-400">
          {etat.erreur}
        </p>
      )}
    </section>
  );
}

export function EditeurExamen({ element: x, changer, matieres, motDePasse }) {
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
          {/* Un sujet en PDF peut aussi devenir des questions notées une
              par une : l'IA lit le PDF et relève le barème. */}
          <DecoupageDevoir devoir={x} changer={changer} motDePasse={motDePasse} />
        </>
      ) : (
      <>
      <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
        Parties <span className="font-normal text-ink-500 dark:text-ink-400">· total {total} points</span>
      </h3>
      <div className="space-y-3">
        {parties.map((p, i) => (
          <div key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
            <div className="flex items-start gap-3">
              <span className="mt-8 font-mono text-xs text-ink-500 dark:text-ink-400">{i + 1}</span>
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
      <div className="flex flex-wrap gap-3">
        <Bouton icone="plus" onClick={() => changer({ parties: [...parties, { titre: "", enonce: "", points: 4, corrige: "" }] })}>
          Ajouter une partie
        </Bouton>
      </div>
      <DecoupageDevoir devoir={x} changer={changer} motDePasse={motDePasse} />
      </>
      )}
    </div>
  );
}

export function EditeurAnnale({ element: a, changer, matieres }) {
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
        <legend className="px-1 text-sm font-extrabold text-ink-950 dark:text-white">Autorisation</legend>
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
export function EditeurRessource({ element: r, changer, matieres, motDePasse }) {
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
        <legend className="px-1 text-sm font-extrabold text-ink-950 dark:text-white">Document</legend>
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

      <ChampCouverture r={r} onChange={(couverture) => changer({ couverture })} />

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

/* La couverture : une adresse d'image à coller, ou rien. Vide, le site
   la trouve tout seul (src/couvertures.js : lien du livre, première page
   du PDF, recherche par titre) ; l'aperçu montre ce qu'il trouvera. */
function ChampCouverture({ r, onChange }) {
  const apercu = useCouverture(r);
  const [echec, setEchec] = useState(null);
  return (
    <div className="flex gap-4 rounded-xl border border-ink-200 p-4 dark:border-ink-800">
      <div className="grid h-28 w-20 shrink-0 place-items-center overflow-hidden rounded-md bg-ink-100 text-center text-[11px] text-ink-600 dark:bg-ink-800 dark:text-ink-300">
        {apercu && echec !== apercu ? (
          <img src={apercu} alt="Aperçu de la couverture" onError={() => setEchec(apercu)} className="size-full object-cover" />
        ) : (
          "Couverture composée"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Champ
          label="Couverture (facultatif)"
          placeholder="https://…/couverture.jpg"
          value={r.couverture ?? ""}
          aide="L'adresse https d'une image. Laisse vide : la couverture est trouvée toute seule (lien du livre, première page du PDF, ou titre et auteur)."
          onChange={(e) => onChange(e.target.value.trim() || null)}
        />
      </div>
    </div>
  );
}
