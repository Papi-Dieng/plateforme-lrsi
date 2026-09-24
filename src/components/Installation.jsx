import { useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { installer, useInstallation } from "../installation";
import { site } from "../data/site";

/* ==================================================================
   « Installer l'application » : un bouton quand le navigateur le
   permet, sinon la marche à suivre (iPhone, autres navigateurs).

   `compacte` : la version du tableau de bord, qui se ferme et ne
   s'affiche que si l'installation est possible en un clic ou sur iPhone.
   ================================================================== */

const CLE_MASQUEE = "lrsi-installation-masquee";

function lireMasquee() {
  try {
    return localStorage.getItem(CLE_MASQUEE) === "1";
  } catch {
    return false;
  }
}

export default function Installation({ compacte = false, className }) {
  const etat = useInstallation();
  const [masquee, setMasquee] = useState(lireMasquee);
  const [refus, setRefus] = useState(false);

  // Le fichier hors ligne (un seul HTML) n'est pas installable.
  if (typeof document !== "undefined" && !document.querySelector('link[rel="manifest"]')) return null;
  if (compacte && (masquee || (etat !== "proposable" && etat !== "ios"))) return null;

  const masquer = () => {
    setMasquee(true);
    try {
      localStorage.setItem(CLE_MASQUEE, "1");
    } catch {
      /* stockage indisponible : la carte reviendra à la prochaine visite */
    }
  };

  const bouton =
    "inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700";

  let corps;
  if (etat === "installee") {
    corps = (
      <p className="text-sm font-semibold text-accent-700 dark:text-accent-400">
        ✓ Tu utilises déjà {site.nom} comme une application.
      </p>
    );
  } else if (etat === "proposable") {
    corps = (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={bouton}
          onClick={async () => {
            const ok = await installer();
            if (!ok) setRefus(true);
          }}
        >
          <Icon name="plus" className="size-4" />
          Installer l&apos;application
        </button>
        {refus && <span className="text-xs text-ink-500">Installation annulée. Tu pourras la relancer depuis les paramètres.</span>}
      </div>
    );
  } else if (etat === "ios") {
    corps = (
      <ol className="list-decimal space-y-1 pl-5 text-sm/6 text-ink-700 dark:text-ink-300">
        <li>Ouvre ce site dans <strong>Safari</strong>.</li>
        <li>
          Touche le bouton <strong>Partager</strong> (le carré avec une flèche vers le haut), en bas de l&apos;écran.
        </li>
        <li>
          Choisis <strong>« Sur l&apos;écran d&apos;accueil »</strong>, puis <strong>Ajouter</strong>.
        </li>
      </ol>
    );
  } else {
    corps = (
      <p className="text-sm/6 text-ink-700 dark:text-ink-300">
        Dans le menu de ton navigateur (⋮ ou ⋯), cherche <strong>« Installer l&apos;application »</strong> ou{" "}
        <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong>. Sur Android, Chrome le propose directement.
      </p>
    );
  }

  return (
    <div
      className={cx(
        compacte ? "rounded-3xl bg-brand-50 p-5 dark:bg-brand-500/10" : "",
        "flex gap-4",
        className
      )}
    >
      <img src="./icones/icone-192.png" alt="" className="size-12 shrink-0 rounded-2xl" />
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <p className="font-semibold text-ink-900 dark:text-white">
            {compacte ? `Installe ${site.nom} sur ton téléphone` : "Application sur ton téléphone ou ton ordinateur"}
          </p>
          <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-400">
            Une icône sur ton écran d&apos;accueil, le site en plein écran, et tes cours déjà ouverts
            consultables même sans connexion. Gratuit, sans passer par un magasin d&apos;applications.
          </p>
        </div>
        {corps}
      </div>
      {compacte && (
        <button
          type="button"
          onClick={masquer}
          aria-label="Masquer cette proposition"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-white/60 dark:hover:bg-ink-800"
        >
          <Icon name="close" className="size-4" />
        </button>
      )}
    </div>
  );
}
