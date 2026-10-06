/* ==================================================================
   Ce que l'espace admin envoie à l'agent IA : des textes bornés, pour
   ménager le quota (components/AssistantAdmin.jsx).
   ================================================================== */

export const couper = (t, max) => String(t ?? "").slice(0, max);
