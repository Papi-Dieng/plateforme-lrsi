import VignetteAvatar from "../components/VignetteAvatar";

/* ==================================================================
   Avatars.

   Six vignettes dessinées en SVG, sans photo et sans dépendance : rien
   n'est téléversé, l'étudiant choisit simplement un motif. `rgb` sert
   à colorer l'anneau autour du grand aperçu, dans la page profil.

   Pour en ajouter un, copier un bloc et changer l'identifiant, les
   trois couleurs et l'identifiant du masque, qui doit rester unique.
   ================================================================== */

export const avatars = [
  {
    id: 1,
    alt: "Corail",
    rgb: "255, 91, 73",
    svg: (
      <VignetteAvatar
        cle="corail"
        alt="Corail"
        fond="#ff5b49"
        accent="#ffb238"
        visage="#0a0310"
        forme={6}
      />
    ),
  },
  {
    id: 2,
    alt: "Océan",
    rgb: "31, 71, 224",
    svg: (
      <VignetteAvatar
        cle="ocean"
        alt="Océan"
        fond="#1f47e0"
        accent="#8eb6ff"
        visage="#0a0310"
        forme={36}
      />
    ),
  },
  {
    id: 3,
    alt: "Menthe",
    rgb: "137, 252, 179",
    svg: (
      <VignetteAvatar
        cle="menthe"
        alt="Menthe"
        fond="#d8fcb3"
        accent="#89fcb3"
        visage="#0a0310"
        forme={6}
      />
    ),
  },
  {
    id: 4,
    alt: "Violet",
    rgb: "124, 58, 237",
    svg: (
      <VignetteAvatar
        cle="violet"
        alt="Violet"
        fond="#7c3aed"
        accent="#f0abfc"
        visage="#0a0310"
        forme={36}
        sourire={false}
      />
    ),
  },
  {
    id: 5,
    alt: "Nuit",
    rgb: "255, 0, 91",
    svg: (
      <VignetteAvatar
        cle="nuit"
        alt="Nuit"
        fond="#0a0310"
        accent="#ff005b"
        visage="#ffffff"
        forme={36}
        sourire={false}
      />
    ),
  },
  {
    id: 6,
    alt: "Safran",
    rgb: "255, 125, 16",
    svg: (
      <VignetteAvatar
        cle="safran"
        alt="Safran"
        fond="#ff7d10"
        accent="#0a0310"
        visage="#ffffff"
        forme={6}
      />
    ),
  },
];

export const getAvatar = (id) =>
  avatars.find((a) => a.id === id) ?? avatars[0];
