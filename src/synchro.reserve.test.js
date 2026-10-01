import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { CLE_RESERVE, CLE_SYNCHRO, changementsEnAttente, lancerSynchro, oublierDonneesLocales, oublierReserve } from "./synchro";

/* ==================================================================
   La progression faite sans réseau ne doit jamais se perdre à la
   déconnexion, ni passer dans le compte de quelqu'un d'autre.
   Navigateur et Supabase simulés.
   ================================================================== */

const A = "utilisateur-a";
const B = "utilisateur-b";
const scores = (id, score, date) => ({ [id]: { score, date } });

let valeurs;
beforeEach(() => {
  valeurs = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (c) => (valeurs.has(c) ? valeurs.get(c) : null),
    setItem: (c, v) => valeurs.set(c, String(v)),
    removeItem: (c) => valeurs.delete(c),
  });
  vi.stubGlobal("document", { visibilityState: "visible", addEventListener() {}, removeEventListener() {} });
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const lireScores = () => JSON.parse(valeurs.get("lrsi-scores") ?? "null");
const ecrireScores = (v) => valeurs.set("lrsi-scores", JSON.stringify(v));

/* Une table donnees_etudiants en mémoire ; `horsLigne` fait tout échouer. */
function supabase(lignes = {}) {
  const etat = { lignes, horsLigne: false, envois: [] };
  const reseau = () => {
    if (etat.horsLigne) throw new Error("hors ligne");
  };
  const sb = {
    from: () => ({
      select: () => ({
        eq: (_c, u) => ({
          maybeSingle: async () => (reseau(), { data: etat.lignes[u] ?? null, error: null }),
        }),
      }),
      upsert: ({ utilisateur, donnees }) => ({
        select: () => ({
          single: async () => {
            reseau();
            const mis_a_jour = `t${etat.envois.length + 1}`;
            etat.lignes[utilisateur] = { donnees, mis_a_jour };
            etat.envois.push(utilisateur);
            return { data: { mis_a_jour }, error: null };
          },
        }),
      }),
      update: () => ({ eq: () => ({ eq: () => ({ select: async () => (reseau(), { data: [], error: null }) }) }) }),
    }),
  };
  return { sb, etat };
}

const attendre = () => new Promise((r) => setTimeout(r, 0));

describe("progression faite sans réseau", () => {
  test("synchronisée, rien n'est en attente ; un QCM fait ensuite l'est", async () => {
    const { sb } = supabase();
    ecrireScores(scores("osi", 5, "2026-09-30"));
    const s = lancerSynchro(sb, A);
    await attendre();
    s.arreter();
    expect(changementsEnAttente(A)).toBe(false);
    ecrireScores({ ...lireScores(), ...scores("sql", 7, "2026-10-01") });
    expect(changementsEnAttente(A)).toBe(true);
  });

  test("déconnexion hors ligne : rien n'est perdu, et tout part à la reconnexion du même compte", async () => {
    const { sb, etat } = supabase({ [A]: { donnees: { "lrsi-scores": scores("osi", 5, "2026-09-30") }, mis_a_jour: "t0" } });
    const s = lancerSynchro(sb, A);
    await attendre();
    s.arreter();

    // Hors ligne : un nouveau QCM, puis déconnexion.
    etat.horsLigne = true;
    ecrireScores({ ...lireScores(), ...scores("sql", 9, "2026-10-01") });
    oublierDonneesLocales(A);
    expect(lireScores()).toBeNull(); // l'appareil est vide pour le suivant
    expect(JSON.parse(valeurs.get(CLE_RESERVE))[A].donnees["lrsi-scores"]).toHaveProperty("sql");

    // Retour du réseau, même compte : la réserve rejoint le compte.
    etat.horsLigne = false;
    const s2 = lancerSynchro(sb, A);
    await attendre();
    s2.arreter();
    expect(Object.keys(etat.lignes[A].donnees["lrsi-scores"]).sort()).toEqual(["osi", "sql"]);
    expect(Object.keys(lireScores()).sort()).toEqual(["osi", "sql"]);
    expect(valeurs.has(CLE_RESERVE)).toBe(false);
  });

  test("un autre compte qui se connecte ensuite ne reçoit pas la réserve", async () => {
    const { sb, etat } = supabase();
    ecrireScores(scores("osi", 5, "2026-09-30"));
    oublierDonneesLocales(A); // A n'a jamais pu synchroniser
    const s = lancerSynchro(sb, B);
    await attendre();
    s.arreter();
    expect(etat.lignes[B]).toBeUndefined();
    expect(lireScores()).toBeNull();
    expect(JSON.parse(valeurs.get(CLE_RESERVE))).toHaveProperty(A);
  });

  test("si l'envoi échoue encore, la réserve reste", async () => {
    const { sb, etat } = supabase();
    ecrireScores(scores("osi", 5, "2026-09-30"));
    oublierDonneesLocales(A);
    etat.horsLigne = true;
    const s = lancerSynchro(sb, A);
    await attendre();
    s.arreter();
    expect(JSON.parse(valeurs.get(CLE_RESERVE))).toHaveProperty(A);
  });

  test("rien à envoyer : pas de réserve ; compte supprimé : sa réserve part, pas celle des autres", () => {
    oublierDonneesLocales(A);
    expect(valeurs.has(CLE_RESERVE)).toBe(false);
    valeurs.set(CLE_RESERVE, JSON.stringify({ [A]: { donnees: {} }, [B]: { donnees: {} } }));
    oublierReserve(A);
    expect(Object.keys(JSON.parse(valeurs.get(CLE_RESERVE)))).toEqual([B]);
    expect(valeurs.has(CLE_SYNCHRO)).toBe(false);
  });
});
