import { useEffect, useRef, useState } from "react";

/* ==================================================================
   Savoir, sans rien demander à l'étudiant, qu'il a lu un cours.

   Texte : le cours est lu quand l'étudiant a atteint la fin du texte
   (un repère placé tout en bas devient visible, en page ou en plein
   écran) ET qu'il est resté assez longtemps dessus, onglet au premier
   plan et cours déplié. Le temps minimum dépend de la longueur : faire
   défiler un long cours en trois secondes ne compte pas.

   PDF : la page ne voit pas l'intérieur d'un PDF. Il est compté comme lu
   quand il reste ouvert dans la page assez longtemps, ou quand
   l'étudiant l'ouvre ou le télécharge.

   Sans `onLu` (chapitre déjà lu, ou énoncé d'exercice), rien ne tourne.
   ================================================================== */

/* Environ 15 % du temps de lecture (200 mots par minute), entre 10 et
   45 secondes : assez pour écarter un simple défilement, sans faire
   attendre l'étudiant qui lit vraiment. */
export function tempsMinimumTexte(texte) {
  const mots = String(texte ?? "").split(/\s+/).filter(Boolean).length;
  return Math.min(Math.max(Math.round((mots / 200) * 60 * 0.15), 10), 45);
}

export const TEMPS_MINIMUM_PDF = 20;

/* `avecFin` : attendre aussi que le repère `refFin` soit vu (texte) ;
   sans lui, le temps suffit (PDF). */
export function useLectureDetectee({ onLu, tempsMin, ouvertAuDepart = false, avecFin = true }) {
  const [ouvert, setOuvert] = useState(ouvertAuDepart);
  const [secondes, setSecondes] = useState(0);
  const [finVue, setFinVue] = useState(!avecFin);
  const signale = useRef(false);
  const refFin = useRef(null);
  const actif = Boolean(onLu) && ouvert;

  // Le temps ne compte que cours déplié et onglet au premier plan.
  useEffect(() => {
    if (!actif) return undefined;
    const minuteur = setInterval(() => {
      if (document.visibilityState === "visible") setSecondes((s) => s + 1);
    }, 1000);
    return () => clearInterval(minuteur);
  }, [actif]);

  // La fin du texte, vue au moins une fois.
  useEffect(() => {
    if (!actif || finVue || !refFin.current || typeof IntersectionObserver === "undefined") return undefined;
    const observateur = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) setFinVue(true);
    });
    observateur.observe(refFin.current);
    return () => observateur.disconnect();
  }, [actif, finVue]);

  useEffect(() => {
    if (!onLu || signale.current || !finVue || secondes < tempsMin) return;
    signale.current = true;
    onLu();
  }, [onLu, finVue, secondes, tempsMin]);

  const marquerLu = () => {
    if (!onLu || signale.current) return;
    signale.current = true;
    onLu();
  };

  return {
    refFin,
    surBascule: (e) => setOuvert(e.currentTarget.open),
    marquerLu,
    finVue,
    restant: Math.max(tempsMin - secondes, 0),
  };
}

/* Sous le cours : où en est la lecture. `lu` : déjà compté. */
export function EtatLecture({ lu, suivi, finVue, restant, pdf = false }) {
  if (lu) {
    return <p className="mt-3 text-sm font-semibold text-accent-700 dark:text-accent-400">✓ Chapitre lu</p>;
  }
  if (!suivi) return null;
  // Un PDF n'a pas de « fin » visible par la page : seul le temps compte.
  const texte =
    !pdf && !finVue
      ? "Lis jusqu'en bas : le chapitre sera compté comme lu."
      : restant > 0
        ? `Encore ${restant} s de lecture et ce chapitre sera compté comme lu.`
        : "Chapitre compté comme lu.";
  return (
    <p role="status" className="mt-3 text-xs text-ink-500 dark:text-ink-400">
      {texte}
    </p>
  );
}
