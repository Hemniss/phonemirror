/** @type {import('tailwindcss').Config} */
// Tokens Orga Glass (src/styles/tokens.css) exposés à Tailwind.
// Les valeurs vivent dans les variables CSS : le thème sombre bascule
// via [data-theme="dark"] sans variante `dark:` dans les composants.
const v = (name) => `var(--${name})`;

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        fg: { DEFAULT: v("fg"), 2: v("fg-2"), 3: v("fg-3") },
        ink: { DEFAULT: v("ink"), on: v("on-ink") },
        hot: { DEFAULT: v("hot"), 2: v("hot-2"), on: v("on-hot") },
        accent: { DEFAULT: v("accent"), soft: v("accent-soft") },
        danger: { DEFAULT: v("danger"), soft: v("danger-soft") },
        glass: { DEFAULT: v("glass"), strong: v("glass-strong"), border: v("glass-border") },
        window: v("window"),
        side: v("side"),
        card: v("card"),
        muted: v("muted"),
        hover: v("hover"),
        "row-hover": v("row-hover"),
        line: v("line"),
        border: v("border"),
        data: {
          1: v("data-1"), 2: v("data-2"), 3: v("data-3"), 4: v("data-4"), 5: v("data-5"),
          6: v("data-6"), 7: v("data-7"), 8: v("data-8"), 9: v("data-9"),
        },
      },
      borderRadius: {
        "pill-s": v("radius-pill-s"),
        control: v("radius-control"),
        row: v("radius-row"),
        quick: v("radius-quick"),
        group: v("radius-group"),
        stat: v("radius-stat"),
        card: v("radius-card"),
        window: v("radius-window"),
      },
      boxShadow: {
        ring: v("shadow-ring"),
        window: v("shadow-window"),
        hot: v("shadow-hot"),
        lift: v("shadow-lift"),
        ink: v("shadow-ink"),
        pill: v("shadow-pill"),
      },
      spacing: {
        "og-1": v("space-1"), "og-2": v("space-2"), "og-3": v("space-3"), "og-4": v("space-4"),
        "og-5": v("space-5"), "og-6": v("space-6"), "og-7": v("space-7"),
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "serif"],
      },
      transitionTimingFunction: {
        "og-out": "cubic-bezier(.23,1,.32,1)",
        "og-in-out": "cubic-bezier(.77,0,.175,1)",
      },
    },
  },
  plugins: [],
};
