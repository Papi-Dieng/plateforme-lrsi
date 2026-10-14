import { useState } from "react";
import Icon from "./Icon";
import { Logo } from "./Logo";
import { cx } from "./classes";

/* ==================================================================
   La carte étudiant (maquette « 01 · Mon profil », 14 octobre 2026).

   Une carte comme une carte d'étudiant, qui se retourne : devant, qui
   tu es ; derrière, ce que tu as fait cette année. Elle ne vaut rien
   administrativement, et la carte le dit elle-même — c'est un plaisir,
   pas un document.

   Le numéro est le matricule de la fiche profil, ou rien. Le code en
   barres est le matricule écrit en binaire : un clin d'œil à la
   filière, pas un vrai code-barres.
   ================================================================== */

const binaire = (matricule) => {
  const chiffres = String(matricule ?? "").replace(/\D/g, "");
  const n = Number(chiffres.slice(-4) || 0);
  return n ? n.toString(2).padStart(8, "0") : "";
};

export default function CarteEtudiant({ profil, nom, initiales, niveau, filiere, chiffres }) {
  const [verso, setVerso] = useState(false);
  const bits = binaire(profil.matricule);

  return (
    <div className="w-full max-w-sm">
      <div
        className={cx(
          "relative overflow-hidden rounded-[22px] p-5 text-left shadow-[0_24px_60px_-30px_rgba(8,16,54,0.8)] transition-colors",
          verso ? "bg-ink-950 text-white" : "bg-white text-ink-950"
        )}
      >
        {verso ? (
          <>
            <p className="font-mono text-[11px] tracking-[0.18em] text-ink-400">ANNÉE {new Date().getFullYear()}–{new Date().getFullYear() + 1}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {chiffres.map(([valeur, libelle]) => (
                <div key={libelle}>
                  <dt className="sr-only">{libelle}</dt>
                  <dd>
                    <span className="block text-2xl font-extrabold tracking-tight">{valeur}</span>
                    <span className="block text-[11px] text-ink-300">{libelle}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs/5 text-ink-300">
              Cette carte n&apos;existe qu&apos;en ligne. Personne ne te la demandera à l&apos;entrée de l&apos;amphi.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <Logo className="size-8" />
              <span className="font-mono text-[10px] tracking-[0.18em] text-ink-500">CARTE ÉTUDIANT</span>
            </div>
            <div className="mt-5 flex items-center gap-4">
              <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-flame-500 text-xl font-extrabold text-white">
                {initiales}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xl font-extrabold tracking-tight">{nom}</span>
                <span className="block truncate text-sm text-ink-500">
                  {[niveau, filiere].filter(Boolean).join(" · ")}
                </span>
                {profil.matricule && <span className="mt-0.5 block font-mono text-xs text-ink-500">{profil.matricule}</span>}
              </span>
            </div>
            {bits && (
              <p aria-hidden="true" className="mt-5 flex items-end gap-1" title="Ton matricule en binaire">
                {[...bits].map((b, i) => (
                  <span key={i} className={cx("w-1.5 rounded-sm bg-ink-950", b === "1" ? "h-7" : "h-3")} />
                ))}
                <span className="ml-2 font-mono text-[10px] text-ink-500">{bits}</span>
              </p>
            )}
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setVerso((v) => !v)}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/35 px-4 text-sm font-bold text-white transition-colors hover:bg-white/10"
      >
        <Icon name="repeter" className="size-4" />
        Retourner la carte
      </button>
    </div>
  );
}
