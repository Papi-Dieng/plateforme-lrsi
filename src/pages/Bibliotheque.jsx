import { useState } from "react";
import Icon from "../components/Icon";
import { cx } from "../components/classes";
import { ressources } from "../data/bibliotheque";
import { urlPdf } from "../contenu";
import { useCouverture } from "../couvertures";
import { matieres, nomMatiere } from "../data/matieres";

/* ==================================================================
   Bibliothèque.

   Uniquement des ressources dont la diffusion est autorisée. Mise en
   page d'après la maquette « Bibliothèque » (7 octobre 2026) : chaque
   ressource est un livre posé sur une carte pastel, avec sa vraie
   couverture, trouvée par src/couvertures.js (image du site, lien du
   livre, ou recherche par titre). Sinon, ou si l'image ne vient pas,
   une couverture est composée à partir du titre. Les ressources en
   attente d'autorisation gardent leur place, sans rien publier.
   ================================================================== */

const TEINTES = [
  { carte: "bg-[#ece8ff]", sol: "bg-[#d9d0ff]", point: "bg-[#6b5bd6]", livre: "bg-[#2a2350]" },
  { carte: "bg-[#ffe9dc]", sol: "bg-[#ffd3bd]", point: "bg-[#ef6a3a]", livre: "bg-[#ef5a2a]" },
  { carte: "bg-[#fff4cc]", sol: "bg-[#ffe68f]", point: "bg-[#d9a400]", livre: "bg-[#ffcf3d]" },
  { carte: "bg-[#fbe3f1]", sol: "bg-[#f4c9e2]", point: "bg-[#c2489a]", livre: "bg-[#a83a85]" },
];
const mono = "font-mono text-[11px] font-bold tracking-[0.12em]";
const deux = (n) => String(n).padStart(2, "0");

function Livre({ r, teinte }) {
  const src = useCouverture(r);
  // L'adresse qui a échoué : une autre adresse (trouvée plus tard) sera essayée.
  const [echec, setEchec] = useState(null);
  const composee = !src || echec === src;
  const sombre = ["bg-[#2a2350]", "bg-[#a83a85]"].includes(teinte.livre);

  return (
    <span className="relative block h-36 w-26 rotate-[2deg] shadow-[8px_10px_18px_-6px_#0005] transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-0">
      {composee ? (
        <span className={cx("flex size-full flex-col justify-between rounded-r-md p-2.5", teinte.livre, sombre ? "text-white" : "text-[#1a1530]")}>
          <span className="font-mono text-[7px] uppercase">{r.auteurs}</span>
          <span className="text-[11px]/[1.1] font-extrabold">{r.titre}</span>
        </span>
      ) : (
        <img src={src} alt="" loading="lazy" onError={() => setEchec(src)} className="size-full rounded-r-md bg-white object-cover" />
      )}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 rounded-l-sm bg-black/25" />
    </span>
  );
}

export default function Bibliotheque() {
  const [matiere, setMatiere] = useState("toutes");

  const presentes = matieres.filter((m) => ressources.some((r) => r.matiere === m.id));
  const options = [
    { value: "toutes", label: "Toutes les matières", nombre: ressources.length },
    ...presentes.map((m) => ({ value: m.id, label: m.nom, nombre: ressources.filter((r) => r.matiere === m.id).length })),
  ];
  const garde = (r) => matiere === "toutes" || r.matiere === matiere;
  // Seules les ressources dont la diffusion est autorisée s'affichent.
  const toutesLibres = ressources.filter((r) => r.statut === "libre");
  const libres = toutesLibres.filter(garde);
  const attente = ressources.filter((r) => r.statut === "attente").filter(garde);
  const numero = (r) => deux(ressources.indexOf(r) + 1);

  return (
    <div className="bg-white bg-[radial-gradient(ellipse_at_top_right,#fff1c9_0%,transparent_45%),radial-gradient(ellipse_at_left,#efeaff_0%,transparent_40%)] dark:bg-ink-950 dark:bg-none">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {/* ---- En-tête ---- */}
        <p className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 font-mono text-[11px] font-bold tracking-[0.14em] text-ink-800 uppercase dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200">
          <span className="size-2 rounded-full bg-[#ef5a2a]" />
          Documents
        </p>
        <h1 className="mt-6 flex flex-wrap items-center gap-x-3 text-6xl font-extrabold tracking-[-0.06em] text-[#1a1530] sm:text-8xl dark:text-white">
          <span>Biblio</span>
          <span aria-hidden="true" className="hidden h-[0.7em] w-[1.7em] items-center justify-center gap-1 rounded-full bg-[#ef5a2a] sm:inline-flex">
            {[-8, 0, 8].map((r) => (
              <span key={r} className="h-[0.5em] w-[0.36em] rounded-sm bg-white shadow" style={{ transform: `rotate(${r}deg)` }} />
            ))}
          </span>
          <span className="-ml-3 sm:ml-0">thèque</span>
        </h1>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-b border-ink-200 pb-8 dark:border-ink-800">
          <p className="max-w-lg text-[17px]/7 text-ink-700 dark:text-ink-300">
            <strong className="text-[#1a1530] dark:text-white">Uniquement des ressources dont la diffusion est autorisée par leurs auteurs.</strong>{" "}
            Un document de l'université ou d'un enseignant n'est mis à disposition qu'avec son accord écrit.
          </p>
          <dl className="flex gap-3">
            {[
              [toutesLibres.length, "ressources en accès libre", "bg-[#ece8ff]"],
              [presentes.length, "matières couvertes", "bg-[#fff4cc]"],
              [ressources.length - toutesLibres.length, "en attente d'un accord écrit", "bg-[#ffe9dc]"],
            ].map(([n, l, c]) => (
              <div key={l} className={cx("w-28 rounded-[20px] p-4 text-[#1a1530] sm:w-32", c)}>
                <dd className="text-4xl font-extrabold">{n}</dd>
                <dt className="mt-2 text-xs/4">{l}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* ---- Filtres ---- */}
        <p className={cx(mono, "mt-8 text-ink-600 uppercase dark:text-ink-300")} id="filtre-biblio">Filtrer par matière</p>
        <div role="group" aria-labelledby="filtre-biblio" className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={matiere === o.value}
              onClick={() => setMatiere(o.value)}
              className={cx(
                "inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-sm font-bold",
                matiere === o.value
                  ? "border-[#1a1530] bg-[#1a1530] text-white dark:border-white dark:bg-white dark:text-[#1a1530]"
                  : "border-ink-200 bg-white text-[#1a1530] hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-white dark:hover:bg-ink-800"
              )}
            >
              <span className={cx("grid size-6 place-items-center rounded-full text-[11px]", matiere === o.value ? "bg-white/20" : "bg-[#ece8ff] text-[#2a2350]")}>{o.nombre}</span>
              {o.label}
            </button>
          ))}
        </div>

        {/* ---- Ressources en accès libre ---- */}
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-[-0.04em] text-[#1a1530] dark:text-white">
              Ressources en accès libre
              <span className="rounded-full bg-[#ef5a2a] px-2 py-0.5 text-sm text-white">{libres.length}</span>
            </h2>
            <p className="text-sm text-ink-600 dark:text-ink-300">
              {matiere === "toutes" ? "Toutes les matières" : nomMatiere(matiere)} · {libres.length} document{libres.length > 1 ? "s" : ""}
            </p>
          </div>

          {libres.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-ink-300 p-8 text-center dark:border-ink-700">
              <p className="font-extrabold text-[#1a1530] dark:text-white">Aucune ressource libre pour cette matière</p>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">D'autres références seront ajoutées progressivement.</p>
            </div>
          ) : (
            <ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {libres.map((r, i) => {
                const t = TEINTES[i % TEINTES.length];
                const lien = r.url || (r.pdf ? urlPdf(r.pdf.id) : undefined);
                return (
                  <li key={r.id ?? r.titre}>
                    <a href={lien} target="_blank" rel="noopener noreferrer" className="group flex h-full flex-col">
                      <span className={cx("relative flex h-52 items-center justify-center overflow-hidden rounded-[24px]", t.carte)}>
                        <span aria-hidden="true" className={cx("absolute inset-x-0 bottom-0 h-1/4", t.sol)} />
                        <span className="absolute top-3 left-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#1a1530]">{r.type}</span>
                        <span className={cx(mono, "absolute top-3.5 right-4 text-[#1a1530]/70")}>N° {numero(r)}</span>
                        <Livre r={r} teinte={t} />
                      </span>
                      <span className="mt-4 flex items-center gap-2 text-xs font-bold text-[#1a1530] dark:text-ink-200">
                        <span className={cx("size-2 rounded-full", t.point)} />
                        {nomMatiere(r.matiere)}
                      </span>
                      <span className="mt-1.5 text-lg/6 font-extrabold tracking-[-0.02em] text-[#1a1530] group-hover:underline dark:text-white">{r.titre}</span>
                      <span className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                        {r.auteurs} · {r.langue}
                      </span>
                      <span className="mt-2 flex-1 text-sm/6 text-ink-600 dark:text-ink-300">{r.note}</span>
                      <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-bold text-[#1a1530] dark:bg-ink-800 dark:text-ink-100">
                        <Icon name="check" className="size-3.5 text-[#d9480f]" />
                        {r.licence}
                      </span>
                      <span className="mt-4 inline-flex items-center gap-1.5 border-b-2 border-[#ef5a2a] pb-0.5 text-sm font-extrabold text-[#1a1530] w-fit dark:text-white">
                        {r.url ? "Consulter sur le site de l'auteur" : "Ouvrir le PDF"}
                        <Icon name={r.url ? "external" : "file"} className="size-3.5" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---- En attente d'autorisation ---- */}
        {attente.length > 0 && (
          <section className="mt-16">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="flex items-center gap-2 text-3xl font-extrabold tracking-[-0.04em] text-[#1a1530] dark:text-white">
                En attente d'autorisation
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-sm text-ink-700 dark:bg-ink-800 dark:text-ink-200">{attente.length}</span>
              </h2>
              <p className="max-w-md text-sm text-ink-600 sm:text-right dark:text-ink-300">
                Leur place est gardée. Rien n'est publié sans l'accord écrit du département et des enseignants concernés.
              </p>
            </div>
            <ul className="mt-6 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {attente.map((r) => (
                <li key={r.id ?? r.titre}>
                  <span className="relative flex h-52 items-center justify-center rounded-[24px] border border-dashed border-ink-300 bg-[repeating-linear-gradient(135deg,#f4f4f7_0_10px,#fff_10px_20px)] dark:border-ink-700 dark:bg-none">
                    <span className="absolute top-3 left-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#1a1530]">{r.type}</span>
                    <span className={cx(mono, "absolute top-3.5 right-4 text-ink-600 dark:text-ink-300")}>N° {numero(r)}</span>
                    <span className="flex h-32 w-24 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ink-300 bg-white text-center text-[11px] text-ink-600 dark:border-ink-600 dark:bg-ink-900 dark:text-ink-300">
                      <Icon name="lock" className="size-4" />
                      Place réservée
                    </span>
                  </span>
                  <p className="mt-4 text-xs font-bold text-[#1a1530] dark:text-ink-200">{nomMatiere(r.matiere)}</p>
                  <p className="mt-1.5 text-lg/6 font-extrabold tracking-[-0.02em] text-[#1a1530] dark:text-white">{r.titre}</p>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                    {r.auteurs} · {r.langue}
                  </p>
                  <p className="mt-2 text-sm/6 text-ink-600 dark:text-ink-300">{r.note}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#fde8e4] px-2.5 py-1 text-xs font-bold text-[#a3261a]">
                    <Icon name="lock" className="size-3.5" />
                    {r.licence} · en attente
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
