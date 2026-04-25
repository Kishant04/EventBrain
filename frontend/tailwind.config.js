/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "surface": "#f9f9ff",
        "surface-dim": "#d8d9e3",
        "surface-bright": "#f9f9ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3fd",
        "background": "#f9f9ff",
        "on-background": "#191b23",
        "primary": "#0058be",
        "on-primary": "#ffffff",
        "secondary": "#006c49",
        "on-secondary": "#ffffff",
        "outline": "#727785",
        "outline-variant": "#c2c6d6",
        "on-surface": "#191b23",
        "on-surface-variant": "#424754",
        "error": "#ba1a1a",
        "success": "#10B981"
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "sm": "0.25rem",
        "md": "0.75rem",
        "lg": "1rem",
        "xl": "1.5rem",
        "full": "9999px"
      },
      spacing: {
        "base": "4px",
        "xs": "4px",
        "sm": "8px",
        "md": "16px",
        "lg": "24px",
        "xl": "32px",
        "container-max": "1280px",
        "gutter": "20px"
      },
      fontFamily: {
        "h1": ["Inter", "sans-serif"],
        "body-main": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "h2": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
