import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind3,
  transformerVariantGroup,
} from "unocss";

// The Horadric Cube — Vault palette
//
// Mirrors the Horadrim web frontend's palette (hd-crimson, hd-ember, hd-void,
// hd-bone) so the Cube and the Vault feel like the same artifact at different
// distances. The Cube ships only a tray surface and a small settings window;
// the palette here is restrained to match that scale.

export default defineConfig({
  presets: [
    presetWind3({ dark: "class" }),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      cdn: "https://esm.sh/",
    }),
  ],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      "hd-crimson": "#8B0000",
      "hd-ember": "#C17D11",
      "hd-void": "#0D0D0D",
      "hd-bone": "#D4C4A0",
      "hd-shadow": "#1A1410",
      "hd-iron": "#2B2520",
      "hd-rune": "#5A4A3A",
    },
    fontFamily: {
      display: "'Cinzel', 'Times New Roman', serif",
      mono: "'IBM Plex Mono', 'Fira Code', monospace",
      body: "'Inter', system-ui, sans-serif",
    },
    boxShadow: {
      vault: "0 0 0 1px rgba(212, 196, 160, 0.15), 0 8px 24px rgba(0, 0, 0, 0.6)",
      ember: "0 0 0 1px rgba(193, 125, 17, 0.4), 0 0 16px rgba(193, 125, 17, 0.25)",
      crimson: "0 0 0 1px rgba(139, 0, 0, 0.6), 0 0 18px rgba(139, 0, 0, 0.35)",
    },
  },
  shortcuts: {
    "vault-card":
      "bg-hd-shadow border border-hd-rune/40 rounded-sm shadow-vault p-4",
    "vault-label":
      "text-hd-bone/70 font-display tracking-wider uppercase text-xs",
    "vault-rune":
      "text-hd-ember font-mono text-sm",
    "vault-button":
      "px-4 py-2 bg-hd-iron border border-hd-rune/60 text-hd-bone font-display uppercase tracking-wider text-sm hover:border-hd-ember hover:text-hd-ember transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed",
    "vault-button-primary":
      "px-4 py-2 bg-hd-crimson/80 border border-hd-crimson text-hd-bone font-display uppercase tracking-wider text-sm hover:bg-hd-crimson hover:shadow-crimson transition-all duration-150",
    "vault-input":
      "bg-hd-void border border-hd-rune/50 text-hd-bone font-mono text-sm px-3 py-2 focus:outline-none focus:border-hd-ember placeholder:text-hd-rune",
    "vault-divider":
      "h-px bg-gradient-to-r from-transparent via-hd-rune/40 to-transparent",
  },
  preflights: [
    {
      getCSS: () => `
        :root { color-scheme: dark; }
        html, body, #app { height: 100%; }
        body {
          margin: 0;
          background: radial-gradient(ellipse at top, #1A1410 0%, #0D0D0D 65%);
          color: #D4C4A0;
          font-family: 'Inter', system-ui, sans-serif;
          font-feature-settings: "ss01", "cv11";
        }
        ::selection { background: rgba(193, 125, 17, 0.3); color: #D4C4A0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(90, 74, 58, 0.4); border-radius: 0; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(193, 125, 17, 0.6); }
      `,
    },
  ],
});
