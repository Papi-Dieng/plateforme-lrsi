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

/* Environ un quart du temps de lecture (200 mots par minute), entre 15
   secondes et 2 minutes. */
export function tempsMinimumTexte(texte) {
  const mots = String(texte ?? "").split(/\s+/).filter(Boolean).length;
  return Math.min(Math.max(Math.round((mots / 200) * 60 * 0.25), 15), 120);
}

export const TEMPS_MINIMUM_PDF = 60;

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
  };
}
