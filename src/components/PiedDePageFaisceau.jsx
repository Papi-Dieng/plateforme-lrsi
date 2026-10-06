import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/* ==================================================================
   Pied de page « faisceau » : une section blanche traversée par un lent
   reflet noir en diagonale, avec le nom en très grand, coupé par le
   bas, que le reflet traverse. (Le composant d'origine est bleu nuit ;
   l'équipe a choisi le blanc avec quelques reflets noirs, le 6 octobre
   2026 : les couleurs se règlent par les propriétés ci-dessous.)

   Repris du composant « Beam Wordmark Footer » publié sur 21st.dev
   (https://21st.dev/@kedhareswer), à la demande de l'équipe le
   6 octobre 2026 : réécrit en JavaScript, sans TypeScript, textes et
   liens du site ajoutés. Voir LICENCES-TIERS.md.

   Le faisceau dérive tout seul et se penche vers le pointeur ; les
   lettres s'allument sous le pointeur, se soulèvent au survol et
   sautent au clic ; colonnes et lettres montent à la première
   apparition. Mouvement réduit respecté. Aucune dépendance, rien de
   téléchargé : les icônes sont en SVG, le mot est du vrai texte.
   ================================================================== */

/* ---- Calculs purs : couleur, ajustement, faisceau ---- */

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* « #3d6bff » / « #36f » → « 61, 107, 255 ». */
const hexToRgb = (hex, fallback = "61, 107, 255") => {
  const m = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec((hex || "").trim());
  if (!m) return fallback;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return ((n >> 16) & 255) + ", " + ((n >> 8) & 255) + ", " + (n & 255);
};

/* Taille de police (px) pour qu'un mot mesuré à 100px occupe `target` px. */
const fitSize = (measuredAt100, target, cap) => {
  if (!(measuredAt100 > 0) || !(target > 0)) return 0;
  const size = (100 * target) / measuredAt100;
  return cap > 0 ? Math.min(size, cap) : size;
};

const beamTarget = (u, lo = 30, hi = 82) => lo + (hi - lo) * clamp(Number.isFinite(u) ? u : 0.5, 0, 1);

/* Le balancement au repos : deux sinus lents, pour ne jamais boucler à l'œil. */
const drift = (t, centre = 58, amp = 9) =>
  centre + amp * (0.7 * Math.sin(t * 0.21) + 0.3 * Math.sin(t * 0.077 + 1.3));

const approach = (from, to, k, dt) => to + (from - to) * Math.pow(1 - clamp(k, 0, 1), clamp(dt, 0, 0.1) * 60);

const baselineAt = (ascent, descent) => {
  if (!(ascent > 0) || !(descent >= 0)) return 0.8;
  return clamp(((100 - ascent - descent) / 2 + ascent) / 100, 0.5, 1.2);
};

const wordHeight = (fontSize, baseline, cut) =>
  Math.max(0, fontSize * (baseline + clamp(Number.isFinite(cut) ? cut : 0, -0.4, 0.4)));

const SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const measureBaseline = (family, weight, text) => {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return 0.8;
    ctx.font = weight + " 100px " + family;
    const m = ctx.measureText(text);
    return baselineAt(m.fontBoundingBoxAscent, m.fontBoundingBoxDescent);
  } catch {
    return 0.8;
  }
};

// Une seule feuille de style, entièrement sous .bwf.
const CSS =
  // Les couleurs du site, pour que le pied de page s'y fonde : blanc et
  // reflets noirs en thème clair, fond du site et reflets clairs en sombre.
  ".bwf{--bwf-bg:#ffffff;--bwf-bg-rgb:255,255,255;--bwf-ink:#0d101a;--bwf-ink-rgb:13,16,26;--bwf-muted:#4b5162;--bwf-acc:13,16,26;--bwf-lit:13,16,26;--bwf-wt:#c9cdd6;--bwf-wf:#ffffff}" +
  ".dark .bwf{--bwf-bg:#161a27;--bwf-bg-rgb:22,26,39;--bwf-ink:#eef0f4;--bwf-ink-rgb:238,240,244;--bwf-muted:#a3a9b8;--bwf-acc:238,240,244;--bwf-lit:238,240,244;--bwf-wt:#3a4152;--bwf-wf:#161a27}" +
  ".bwf{position:relative;isolation:isolate;overflow:hidden;container-type:inline-size;background:var(--bwf-bg);color:var(--bwf-ink);font-family:var(--bwf-sans);-webkit-font-smoothing:antialiased;touch-action:pan-y}" +
  ":where(.bwf) a{color:inherit;text-decoration:none}" +
  ":where(.bwf) ul{list-style:none;margin:0;padding:0}" +
  ":where(.bwf) p{margin:0}" +
  ".bwf svg{max-width:none;display:block}" +
  ".bwf .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}" +
  ".bwf-sky{position:absolute;inset:0;z-index:0;pointer-events:none;-webkit-mask-image:linear-gradient(180deg,transparent,#000 40%);mask-image:linear-gradient(180deg,transparent,#000 40%)}" +
  ".bwf-wash{position:absolute;inset:0;background:radial-gradient(120% 90% at 8% 0%,rgba(var(--bwf-acc),.2),transparent 55%),radial-gradient(90% 70% at 92% 8%,rgba(var(--bwf-acc),.14),transparent 60%),linear-gradient(180deg,rgba(var(--bwf-acc),.06),transparent 70%)}" +
  ".bwf-bands{position:absolute;inset:0;background:repeating-linear-gradient(90deg,rgba(var(--bwf-acc),.05) 0 1.6cqw,transparent 1.6cqw 4.2cqw);-webkit-mask-image:linear-gradient(100deg,#000 0%,transparent 55%);mask-image:linear-gradient(100deg,#000 0%,transparent 55%);opacity:.9}" +
  ".bwf-beam{position:absolute;inset:0;filter:blur(calc(1px + 1.6cqw));background:linear-gradient(var(--bwf-ang),transparent calc(var(--bwf-b) - 11%),rgba(var(--bwf-acc),.10) calc(var(--bwf-b) - 5%),rgba(var(--bwf-acc),.34) var(--bwf-b),rgba(var(--bwf-acc),.08) calc(var(--bwf-b) + 4%),transparent calc(var(--bwf-b) + 9%)),linear-gradient(var(--bwf-ang),transparent calc(var(--bwf-b) - 34%),rgba(var(--bwf-acc),.10) calc(var(--bwf-b) - 27%),transparent calc(var(--bwf-b) - 20%))}" +
  ".bwf-glow{position:absolute;inset:0;opacity:var(--bwf-g);background:radial-gradient(circle 26cqw at var(--bwf-px) var(--bwf-py),rgba(var(--bwf-acc),.16),transparent 70%)}" +
  ".bwf-grain{position:absolute;inset:0;opacity:.14;mix-blend-mode:overlay;background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")}" +
  ".bwf-inner{position:relative;z-index:2;box-sizing:border-box;max-width:1120px;margin:0 auto;padding:clamp(48px,8.5cqw,104px) clamp(20px,6cqw,88px) 0;display:grid;grid-template-columns:minmax(0,1.62fr) minmax(0,.86fr) minmax(0,.86fr);column-gap:clamp(24px,4cqw,48px);row-gap:44px}" +
  ".bwf-label{font-size:12px;line-height:1;letter-spacing:.01em;color:rgb(var(--bwf-acc));padding-bottom:13px;position:relative;display:block}" +
  ".bwf-label::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;background:linear-gradient(90deg,rgba(var(--bwf-acc),.55),rgba(var(--bwf-acc),.28));transform-origin:0 50%;transform:scaleX(var(--bwf-line,1));transition:transform 1.1s cubic-bezier(.2,.7,.1,1) var(--bwf-d,0ms)}" +
  ".bwf[data-in='false'] .bwf-label::after{--bwf-line:0}" +
  ".bwf-col{min-width:0}" +
  ".bwf-col:nth-child(1){max-width:420px}" +
  ".bwf-fade{transition:opacity .9s ease var(--bwf-d,0ms),translate .9s cubic-bezier(.2,.7,.1,1) var(--bwf-d,0ms)}" +
  ".bwf[data-in='false'] .bwf-fade{opacity:0;translate:0 14px}" +
  ".bwf-credits{margin-top:21px;font-size:14px;line-height:1.5;color:var(--bwf-muted)}" +
  ".bwf-credits p+p{margin-top:2px}" +
  ".bwf-credits b{font-weight:400;color:var(--bwf-ink)}" +
  ".bwf-extra{margin-top:18px}" +
  ".bwf-links{margin-top:13px;display:flex;flex-direction:column;gap:0}" +
  ".bwf-link{position:relative;display:inline-flex;align-items:center;gap:8px;padding:6px 0;font-size:14.5px;line-height:21px;color:rgba(var(--bwf-ink-rgb),.78);transition:color .25s}" +
  ".bwf-link-t{display:inline-block;transition:translate .35s cubic-bezier(.2,.8,.2,1)}" +
  ".bwf-link::before{content:'';position:absolute;left:0;top:50%;width:6px;height:1px;margin-top:0;background:rgb(var(--bwf-acc));transform:scaleX(0);transform-origin:0 50%;transition:transform .35s cubic-bezier(.2,.8,.2,1)}" +
  ".bwf-link svg{width:12px;height:12px;opacity:0;translate:-6px 0;color:rgb(var(--bwf-acc));transition:opacity .25s,translate .35s cubic-bezier(.2,.8,.2,1)}" +
  ".bwf-link:hover,.bwf-link:focus-visible{color:var(--bwf-ink);outline:none}" +
  ".bwf-link:hover::before,.bwf-link:focus-visible::before{transform:scaleX(1)}" +
  ".bwf-link:hover .bwf-link-t,.bwf-link:focus-visible .bwf-link-t{translate:12px 0}" +
  ".bwf-link:hover svg,.bwf-link:focus-visible svg{opacity:1;translate:10px 0}" +
  ".bwf-link:focus-visible .bwf-link-t{text-decoration:underline;text-underline-offset:4px;text-decoration-color:rgba(var(--bwf-acc),.8)}" +
  ".bwf-word{position:relative;z-index:1;overflow:hidden;margin-top:clamp(28px,7cqw,96px)}" +
  ".bwf-word-box{padding:0 clamp(20px,6cqw,88px);max-width:1120px;margin:0 auto;box-sizing:border-box}" +
  ".bwf-word-in{display:inline-flex;white-space:nowrap;font-weight:var(--bwf-ww);line-height:1;letter-spacing:-.045em;user-select:none;-webkit-user-select:none}" +
  ".bwf-lw{display:inline-block;translate:0 0;transition:translate 1.25s cubic-bezier(.16,.84,.2,1) var(--bwf-d,0ms)}" +
  ".bwf[data-in='false'] .bwf-lw{translate:0 85%}" +
  ".bwf-l{display:inline-block;cursor:pointer;color:transparent;-webkit-background-clip:text;background-clip:text;background-repeat:no-repeat;background-size:var(--bwf-rw) var(--bwf-rh);background-position:calc(var(--bwf-x) * -1) calc(var(--bwf-y) * -1);" +
  "background-image:radial-gradient(circle 22cqw at var(--bwf-px) var(--bwf-py),rgba(var(--bwf-lit),calc(var(--bwf-g) * .85)),transparent 70%)," +
  "linear-gradient(var(--bwf-ang),transparent calc(var(--bwf-b) - 9%),rgba(var(--bwf-lit),.55) calc(var(--bwf-b) - 1.5%),rgba(var(--bwf-lit),.7) var(--bwf-b),rgba(var(--bwf-lit),.2) calc(var(--bwf-b) + 3.5%),transparent calc(var(--bwf-b) + 8%))," +
  "linear-gradient(180deg,var(--bwf-wt) var(--bwf-top),var(--bwf-wf) var(--bwf-bot));" +
  "transition:transform .5s cubic-bezier(.2,.9,.25,1.2),filter .4s;transform-origin:50% 100%}" +
  ".bwf-l:hover{transform:translateY(-.045em);filter:brightness(1.35) saturate(1.1)}" +
  ".bwf-l.is-hop{animation:bwf-hop .75s cubic-bezier(.2,.8,.2,1)}" +
  "@keyframes bwf-hop{0%{transform:translateY(0) scale(1,1)}18%{transform:translateY(.02em) scale(1.06,.9)}45%{transform:translateY(-.14em) scale(.97,1.05)}70%{transform:translateY(.01em) scale(1.02,.97)}100%{transform:translateY(-.045em) scale(1,1)}}" +
  ".bwf-foot{position:absolute;left:0;right:0;bottom:0;height:34%;z-index:2;pointer-events:none;background:linear-gradient(180deg,transparent,rgba(var(--bwf-bg-rgb),.55) 55%,var(--bwf-bg))}" +
  "@container (max-width: 760px){.bwf-inner{grid-template-columns:minmax(0,1fr) minmax(0,1fr);row-gap:40px}.bwf-col:nth-child(1){grid-column:1 / -1;max-width:none}}" +
  "@media (prefers-reduced-motion: reduce){.bwf .bwf-lw,.bwf .bwf-fade,.bwf .bwf-label::after,.bwf .bwf-l,.bwf .bwf-link-t,.bwf .bwf-link svg{transition:none!important;animation:none!important}.bwf[data-in='false'] .bwf-lw,.bwf[data-in='false'] .bwf-fade{translate:none;opacity:1}.bwf[data-in='false'] .bwf-label::after{--bwf-line:1}}";

const Arrow = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2.5 9.5l7-7M4 2.5h5.5V8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* `columns` : [{ title, links: [{ label, href }] }] ; `credits` :
   [{ lead, label, tail }] ; `children` : sous les crédits (le bouton de
   thème, ici). */
export default function PiedDePageFaisceau({
  brand,
  wordmark,
  label,
  credits = [],
  columns = [],
  children,
  cut = 0.14,
  background,
  ink,
  muted,
  accent,
  wordTop,
  wordFoot,
  fontSans = SANS,
  wordWeight = 500,
  animate = true,
  className = "",
}) {
  const word = (wordmark ?? brand).trim() || brand;
  const letters = useMemo(() => Array.from(word), [word]);

  const rootRef = useRef(null);
  const wordRef = useRef(null);
  const innerRef = useRef(null);
  const [size, setSize] = useState(0);
  const [base, setBase] = useState(0.8);
  const [seen, setSeen] = useState(false);

  // Le pointeur vit dans une ref et passe par des variables CSS : le
  // faisceau ne fait jamais recalculer React.
  const ptr = useRef({ u: 0.5, x: 0, y: 0, inside: false });

  // Le mot remplit toute la largeur ; chaque lettre sait où elle est dans
  // la section, pour que sa part du faisceau s'aligne sur le fond.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const box = wordRef.current;
    const inner = innerRef.current;
    if (!root || !box || !inner) return undefined;
    let frame = 0;
    const place = () => {
      const r = root.getBoundingClientRect();
      root.style.setProperty("--bwf-rw", r.width + "px");
      root.style.setProperty("--bwf-rh", r.height + "px");
      const spans = inner.querySelectorAll(".bwf-l");
      let top = 0;
      spans.forEach((s, i) => {
        let x = 0;
        let y = 0;
        let el = s;
        while (el && el !== root) {
          x += el.offsetLeft;
          y += el.offsetTop;
          el = el.offsetParent;
        }
        s.style.setProperty("--bwf-x", x + "px");
        s.style.setProperty("--bwf-y", y + "px");
        if (i === 0) top = y;
      });
      root.style.setProperty("--bwf-top", top + "px");
      root.style.setProperty("--bwf-bot", top + (parseFloat(inner.style.fontSize) || 0) * 0.92 + "px");
    };
    const fit = () => {
      const wb = inner.parentElement ?? box;
      const pad = parseFloat(getComputedStyle(wb).paddingLeft) || 0;
      const target = wb.clientWidth - pad * 2;
      inner.style.fontSize = "100px";
      const measured = inner.offsetWidth;
      setBase(measureBaseline(getComputedStyle(inner).fontFamily, wordWeight, word));
      const next = fitSize(measured, target, target * 0.42);
      inner.style.fontSize = next + "px";
      setSize(next);
      place();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const ro = new ResizeObserver(schedule);
    ro.observe(root);
    let alive = true;
    document.fonts?.ready.then(() => alive && schedule());
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [word, fontSans, wordWeight]);

  // Apparition la première fois que le pied de page est vu ; le faisceau
  // ne bouge que tant qu'il est à l'écran.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        setVisible(e.isIntersecting);
        if (e.isIntersecting) setSeen(true);
      },
      { threshold: 0.12 }
    );
    io.observe(root);
    return () => io.disconnect();
  }, []);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const set = (b, px, py, g) => {
      root.style.setProperty("--bwf-b", b.toFixed(2) + "%");
      root.style.setProperty("--bwf-px", px.toFixed(1) + "px");
      root.style.setProperty("--bwf-py", py.toFixed(1) + "px");
      root.style.setProperty("--bwf-g", g.toFixed(3));
    };
    const still = reduced || !animate;
    if (still || !visible) {
      const p = ptr.current;
      set(58, p.x, p.y, p.inside ? 1 : 0);
      if (!still) return undefined;
      const onMove = () => set(58, ptr.current.x, ptr.current.y, ptr.current.inside ? 1 : 0);
      root.addEventListener("pointermove", onMove);
      root.addEventListener("pointerleave", onMove);
      return () => {
        root.removeEventListener("pointermove", onMove);
        root.removeEventListener("pointerleave", onMove);
      };
    }
    let raf = 0;
    let last = performance.now();
    let t = last / 1000;
    let b = 58;
    let px = ptr.current.x;
    let py = ptr.current.y;
    let g = 0;
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt;
      const p = ptr.current;
      const idle = drift(t);
      const target = p.inside ? beamTarget(p.u) * 0.75 + idle * 0.25 : idle;
      b = approach(b, target, 0.035, dt);
      px = approach(px, p.x, 0.16, dt);
      py = approach(py, p.y, 0.16, dt);
      g = approach(g, p.inside ? 1 : 0, 0.06, dt);
      set(b, px, py, g);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, animate, visible]);

  const onPointer = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = ptr.current;
    p.x = e.clientX - r.left;
    p.y = e.clientY - r.top;
    p.u = r.width ? p.x / r.width : 0.5;
    p.inside = e.type !== "pointerleave";
  };

  const hop = (e) => {
    if (reduced) return;
    const el = e.currentTarget;
    el.classList.remove("is-hop");
    void el.offsetWidth;
    el.classList.add("is-hop");
  };

  // Sans couleur donnée, celles de la feuille de style (thème du site).
  const vars = {
    ...(background && { "--bwf-bg": background, "--bwf-bg-rgb": hexToRgb(background, "255, 255, 255") }),
    ...(ink && { "--bwf-ink": ink, "--bwf-ink-rgb": hexToRgb(ink, "13, 16, 26") }),
    ...(muted && { "--bwf-muted": muted }),
    ...(accent && { "--bwf-acc": hexToRgb(accent), "--bwf-lit": hexToRgb(accent) }),
    ...(wordTop && { "--bwf-wt": wordTop }),
    ...(wordFoot && { "--bwf-wf": wordFoot }),
    "--bwf-sans": fontSans,
    "--bwf-ww": String(wordWeight),
    "--bwf-ang": "118deg",
    "--bwf-b": "58%",
    "--bwf-px": "50%",
    "--bwf-py": "50%",
    "--bwf-g": "0",
    "--bwf-top": "0px",
    "--bwf-bot": "100%",
  };

  // Les éléments apparaissent l'un après l'autre, 70 ms d'écart : le rang
  // de chacun est calculé d'avance, colonne après colonne.
  const delai = (rang) => ({ "--bwf-d": rang * 70 + "ms" });
  const premierRangColonne = columns.reduce(
    (debuts, col, i) => [...debuts, i ? debuts[i - 1] + 1 + columns[i - 1].links.length : 3 + credits.length],
    []
  );

  return (
    <footer
      ref={rootRef}
      className={"bwf " + className}
      style={vars}
      data-in={seen || reduced ? "true" : "false"}
      onPointerMove={onPointer}
      onPointerEnter={onPointer}
      onPointerLeave={onPointer}
    >
      <style>{CSS}</style>
      <div className="bwf-sky" aria-hidden="true">
        <div className="bwf-wash" />
        <div className="bwf-bands" />
        <div className="bwf-beam" />
        <div className="bwf-glow" />
        <div className="bwf-grain" />
      </div>

      <div className="bwf-inner">
        <div className="bwf-col">
          <p className="bwf-label" style={delai(1)}>
            {label}
          </p>
          {credits.length > 0 && (
            <div className="bwf-credits">
              {credits.map((c, i) => (
                <p key={i} className="bwf-fade" style={delai(2 + i)}>
                  {c.lead}
                  <b>{c.label}</b>
                  {c.tail}
                </p>
              ))}
            </div>
          )}
          {children && (
            <div className="bwf-extra bwf-fade" style={delai(2 + credits.length)}>
              {children}
            </div>
          )}
        </div>

        {columns.map((col, ci) => (
          <nav key={col.title + ci} className="bwf-col" aria-label={col.title}>
            <p className="bwf-label" style={delai(premierRangColonne[ci])}>
              {col.title}
            </p>
            <ul className="bwf-links">
              {col.links.map((l, li) => (
                <li key={l.label + li} className="bwf-fade" style={delai(premierRangColonne[ci] + 1 + li)}>
                  <a className="bwf-link" href={l.href}>
                    <span className="bwf-link-t">{l.label}</span>
                    <Arrow />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div
        ref={wordRef}
        className="bwf-word"
        style={{ height: size ? wordHeight(size, base, cut) : "calc(" + (0.8 + cut) * 26 + "cqw)" }}
      >
        <p className="sr-only">{word}</p>
        <div className="bwf-word-box">
          <div ref={innerRef} className="bwf-word-in" aria-hidden="true">
            {letters.map((ch, i) => (
              <span key={i} className="bwf-lw" style={{ "--bwf-d": 260 + i * 75 + "ms" }}>
                <span className="bwf-l" onClick={hop} onAnimationEnd={(e) => e.currentTarget.classList.remove("is-hop")}>
                  {ch === " " ? " " : ch}
                </span>
              </span>
            ))}
          </div>
        </div>
        <div className="bwf-foot" aria-hidden="true" />
      </div>
    </footer>
  );
}
