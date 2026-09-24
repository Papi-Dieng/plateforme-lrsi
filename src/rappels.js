import { matieres } from "./data/matieres";
import { competences } from "./data/competences";
import { exercices } from "./data/exercices";
import { qcms } from "./data/qcm";
import { examens as devoirs } from "./data/examens";
import { analyserCompetences } from "./competences";
import { lireChapitresLus, lireExercicesTravailles, lireScores } from "./progression";
import { ajouterJours, aujourdhui, construirePlan, joursEntre, lirePlanning } from "./planning";
import { lireRevisions, revisionsDues } from "./revisions";

/* ==================================================================
   Rappels de révision, par notification.

   Le site n'a pas de serveur pour envoyer des notifications. Donc :
   - à l'ouverture du site (ou quand l'onglet revient au premier plan),
     une notification par jour au plus résume le programme du jour :
     évaluation proche, tâches du planning, QCM à refaire ;
   - le programme des 14 prochains jours est aussi rangé là où le
     service worker peut le lire (cache « rappels-sunu-cours ») : sur
     Android, application installée, Chrome peut le réveiller une fois
     par jour (`periodicsync`) et afficher le rappel sans ouvrir le site.
     C'est Chrome qui choisit le moment : ce n'est pas garanti.

   Rien ne quitte le navigateur. Préférence : clé `lrsi-rappels`.
   ================================================================== */

const CLE_ACTIFS = "lrsi-rappels";
const CLE_DERNIER = "lrsi-rappels-dernier";
const CACHE = "rappels-sunu-cours";
const JOURS = 14;

const lire = (cle) => {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
};
const ecrire = (cle, valeur) => {
  try {
    if (valeur === null) localStorage.removeItem(cle);
    else localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible */
  }
};

export const notificationsPossibles = () => typeof window !== "undefined" && "Notification" in window;
export const rappelsActifs = () => lire(CLE_ACTIFS) === "1" && notificationsPossibles() && Notification.permission === "granted";

/* ---- Le programme, jour par jour ---- */

const extrait = (titres) => titres.slice(0, 2).join(" ; ") + (titres.length > 2 ? ` (+${titres.length - 2})` : "");

/* [{ jour, titre, corps }] pour les `JOURS` prochains jours ayant quelque chose. */
export function programmeDesRappels(debut = aujourdhui()) {
  const planning = lirePlanning();
  const contexte = {
    aujourdhui: debut,
    matieres,
    competences,
    exercices,
    qcms,
    devoirs,
    analyse: analyserCompetences(lireScores()),
    exercicesTravailles: lireExercicesTravailles(),
    chapitresLus: lireChapitresLus(),
  };
  const plans = planning.evaluations
    .filter((ev) => ev.date > debut)
    .map((ev) => ({ ev, plan: construirePlan(ev, contexte) }));
  const revisions = lireRevisions();

  const resultat = [];
  for (let i = 0; i < JOURS; i++) {
    const jour = ajouterJours(debut, i);
    const taches = [];
    let titre = "";
    for (const { ev, plan } of plans) {
      const restant = joursEntre(jour, ev.date);
      if (restant <= 0) continue;
      const duJour = plan.jours.find((j) => j.jour === jour)?.taches ?? [];
      taches.push(...duJour.filter((t) => !planning.faites[`${ev.id}|${t.cle}`]).map((t) => t.titre));
      if (!titre && restant <= 3) {
        titre = restant === 1 ? `Demain : « ${ev.titre} »` : `« ${ev.titre} » dans ${restant} jours`;
      }
    }
    // Les QCM à refaire ce jour-là (ceux déjà en retard comptent aujourd'hui).
    const aRefaire = revisionsDues(qcms, jour, revisions).aFaire.filter((r) => i === 0 || r.du === jour);
    if (aRefaire.length) taches.push(`QCM à refaire : ${aRefaire.map((r) => r.qcm.titre).join(", ")}`);
    if (taches.length === 0) continue;
    resultat.push({ jour, titre: titre || "Ton programme de révision du jour", corps: extrait(taches) });
  }
  return resultat;
}

/* ---- Afficher ---- */

async function afficher({ titre, corps }) {
  const options = { body: corps, icon: "./icones/icone-192.png", badge: "./icones/icone-192.png", tag: "rappel-du-jour", data: { lien: "./#/planning" } };
  // Sur Android, seule la voie du service worker est permise.
  const inscription = await navigator.serviceWorker?.getRegistration?.();
  if (inscription) return inscription.showNotification(titre, options);
  const n = new Notification(titre, options);
  n.onclick = () => {
    window.focus();
    window.location.hash = "#/planning";
  };
}

/* Range le programme pour le service worker (rappel en arrière-plan). */
async function rangerPourServiceWorker(programme) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put("./rappels.json", new Response(JSON.stringify({ programme, dernier: lire(CLE_DERNIER) })));
  } catch {
    /* pas de cache disponible : seulement les rappels à l'ouverture */
  }
}

/* Le jour du dernier rappel montré par le service worker, en arrière-plan. */
async function dernierEnArrierePlan() {
  try {
    const reponse = await caches.match("./rappels.json", { cacheName: CACHE });
    return (await reponse?.json())?.dernier ?? null;
  } catch {
    return null;
  }
}

/* À l'ouverture du site et au retour au premier plan : une notification
   par jour au plus, s'il y a quelque chose au programme. */
export async function verifierRappels() {
  if (!rappelsActifs()) return;
  const programme = programmeDesRappels();
  const jour = aujourdhui();
  if ((await dernierEnArrierePlan()) === jour) ecrire(CLE_DERNIER, jour);
  if (lire(CLE_DERNIER) !== jour) {
    const duJour = programme.find((p) => p.jour === jour);
    if (duJour) {
      try {
        await afficher(duJour);
        ecrire(CLE_DERNIER, jour);
      } catch {
        /* notification refusée par le système : on réessaiera */
      }
    }
  }
  await rangerPourServiceWorker(programme);
}

export function demarrerRappels() {
  verifierRappels();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") verifierRappels();
  });
}

/* ---- Activer, désactiver ---- */

/* Renvoie "actifs", "refuses" ou "impossibles". */
export async function activerRappels() {
  if (!notificationsPossibles()) return "impossibles";
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return "refuses";
  ecrire(CLE_ACTIFS, "1");
  ecrire(CLE_DERNIER, null);

  // En arrière-plan, là où le navigateur le permet (Chrome, application installée).
  try {
    const inscription = await navigator.serviceWorker?.getRegistration?.();
    if (inscription?.periodicSync) {
      const etat = await navigator.permissions.query({ name: "periodic-background-sync" });
      if (etat.state === "granted") await inscription.periodicSync.register("rappels", { minInterval: 12 * 60 * 60 * 1000 });
    }
  } catch {
    /* pas de réveil en arrière-plan : les rappels passent à l'ouverture */
  }
  await verifierRappels();
  return "actifs";
}

export async function desactiverRappels() {
  ecrire(CLE_ACTIFS, null);
  try {
    const inscription = await navigator.serviceWorker?.getRegistration?.();
    await inscription?.periodicSync?.unregister("rappels");
    if ("caches" in window) await caches.delete(CACHE);
  } catch {
    /* rien à annuler */
  }
}
