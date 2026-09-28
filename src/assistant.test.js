import { describe, expect, test } from "vitest";
import { detecterIntention, repondre } from "./assistant";

/* Le guide de l'assistant : il reconnaît l'intention d'une question et
   retrouve les contenus de la plateforme qui en parlent (contenu par
   défaut, src/data/). */

const chapitres = (question) => repondre(question).liens.filter((l) => l.type === "chapitre").map((l) => l.titre);

describe("recherche des chapitres", () => {
  test("routeur et commutateur mènent au routage et à la commutation, pas aux processus", () => {
    const trouves = chapitres("Quelle différence entre un routeur et un commutateur ?");
    expect(trouves).toContain("Routage statique et dynamique");
    expect(trouves).toContain("Commutation et VLAN");
    expect(trouves).not.toContain("Processus et threads");
  });

  test("les mots d'une question (quelle, différence, entre, comment…) ne comptent pas", () => {
    expect(chapitres("Quelle est la différence entre les deux ?")).toEqual([]);
    expect(chapitres("Pourquoi et comment, avec un exemple concret ?")).toEqual([]);
  });

  test("un mot au singulier ou au pluriel, en nom ou en verbe, retrouve son chapitre", () => {
    expect(chapitres("Je n'ai pas compris le masque de sous-réseau")).toContain("Adressage IPv4 et sous-réseaux");
    expect(chapitres("les tris")).toContain("Tris et recherches");
    expect(chapitres("comment on normalise une base")).toContain("Normalisation");
    expect(chapitres("la récursivité")).toContain("Fonctions et récursivité");
  });

  test("le chapitre qui parle vraiment du sujet passe en premier", () => {
    expect(chapitres("le routage dynamique")[0]).toBe("Routage statique et dynamique");
    expect(chapitres("les VLAN sur un commutateur")[0]).toBe("Commutation et VLAN");
  });

  test("un sigle compte plus qu'un mot long et vague", () => {
    expect(chapitres("le protocole DHCP")[0]).toBe("Services réseau : DHCP et DNS");
    expect(chapitres("adresse IPv6")[0]).toBe("Introduction à IPv6");
    expect(chapitres("explique le modèle OSI")).toEqual(["Modèles OSI et TCP/IP"]);
  });

  test("rien de pertinent : le guide ne propose rien plutôt qu'un chapitre au hasard", () => {
    expect(chapitres("la photosynthèse des plantes")).toEqual([]);
    // ARP n'est cité nulle part : « table » ne doit pas faire remonter
    // la table de vérité de l'algèbre de Boole.
    expect(repondre("la table ARP").liens).toEqual([]);
  });
});

describe("intentions", () => {
  test.each([
    ["Donne-moi un exercice sur les adresses IP", "exercice"],
    ["Interroge-moi sur les réseaux", "qcm"],
    ["Sur quoi devrais-je travailler en priorité ?", "priorite"],
    ["Explique le modèle OSI", "revision"],
  ])("« %s » → %s", (question, intention) => {
    expect(detecterIntention(question)).toBe(intention);
  });

  test("un raccourci choisi l'emporte sur la phrase", () => {
    expect(repondre("les sous-réseaux", [], "exercice").intention).toBe("exercice");
    expect(repondre("les sous-réseaux", [], "qcm").intention).toBe("qcm");
  });
});
