import { useEffect, useState } from "react";
import Icon from "./Icon";
import { cx } from "./ui";
import { basculerFavori, estFavori } from "../progression";

/* ==================================================================
   Bouton de mise en favori, commun à tous les contenus.

   Chaque bouton se resynchronise quand un autre bouton de la page
   change le même favori : deux cartes du même exercice restent donc
   cohérentes, sans état global.
   ================================================================== */

const variantes = {
  // Sur fond clair : la pastille se remplit quand le favori est posé.
  clair: {
    inactif:
      "text-ink-400 hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-white",
    actif: "text-sun-600 hover:bg-sun-100 dark:text-sun-400 dark:hover:bg-sun-500/15",
  },
  // Sur une carte colorée, où tout est déjà blanc.
  surCouleur: {
    inactif: "text-white/80 hover:bg-white/15 hover:text-white",
    actif: "text-white hover:bg-white/15",
  },
};

const tailles = {
  sm: { bouton: "size-7", icone: "size-4" },
  md: { bouton: "size-8", icone: "size-5" },
};

export default function BoutonFavori({
  type,
  reference,
  libelle,
  variante = "clair",
  taille = "md",
  className,
}) {
  const [actif, setActif] = useState(false);

  useEffect(() => {
    const relire = () => setActif(estFavori(type, reference));
    relire();
    window.addEventListener("lrsi-favoris", relire);
    return () => window.removeEventListener("lrsi-favoris", relire);
  }, [type, reference]);

  const basculer = (e) => {
    // Le bouton vit souvent à l'intérieur d'un lien ou d'une carte
    // cliquable : on empêche la navigation.
    e.preventDefault();
    e.stopPropagation();
    basculerFavori(type, reference);
    // Relu dans le stockage plutôt qu'inversé : `basculerFavori` prévient
    // déjà tous les boutons (événement « lrsi-favoris »), celui-ci
    // compris, et inverser en plus annulait ce changement.
    setActif(estFavori(type, reference));
  };

  const style = variantes[variante] ?? variantes.clair;
  const t = tailles[taille] ?? tailles.md;

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={actif}
      title={actif ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-label={
        actif
          ? `Retirer ${libelle} des favoris`
          : `Ajouter ${libelle} aux favoris`
      }
      className={cx(
        "grid shrink-0 place-items-center rounded-lg transition-colors",
        t.bouton,
        actif ? style.actif : style.inactif,
        className
      )}
    >
      <Icon
        name="bookmark"
        className={t.icone}
        fill={actif ? "currentColor" : "none"}
      />
    </button>
  );
}
