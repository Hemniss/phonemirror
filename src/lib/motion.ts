import type { CSSProperties } from "react";
import { flushSync } from "react-dom";

// Mouvement Orga Glass : `og-entering` sur <html> fait jouer les arrivées
// (`og-rise`, `og-fadein`) puis est retiré, pour que les mises à jour
// suivantes (polling des appareils toutes les 2,5 s) ne rejouent rien.
let enteringTimer: number | undefined;

export function markEntering() {
  const root = document.documentElement;
  root.classList.add("og-entering");
  window.clearTimeout(enteringTimer);
  enteringTimer = window.setTimeout(() => root.classList.remove("og-entering"), 1100);
}

type StartViewTransition = (cb: () => void) => unknown;

// Changement de page : view transition quand le WebView la connaît
// (WebView2, WebKit récent), échange direct sinon.
export function withPageTransition(update: () => void) {
  const start = (document as unknown as { startViewTransition?: StartViewTransition })
    .startViewTransition;
  if (!start) {
    markEntering();
    update();
    return;
  }
  start.call(document, () => {
    markEntering();
    flushSync(update);
  });
}

// Délai de cascade : 30 ms par bloc à partir d'une base.
export const delay = (base: number, index = 0) =>
  ({ "--og-delay": `${base + index * 30}ms` }) as CSSProperties;
