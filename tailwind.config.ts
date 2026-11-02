import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // COCOBOD Theme Colors
        forest: '#0B3D2E',
        'forest-deep': '#082C21',
        gold: '#C89B3C',
        'gold-soft': '#E4C77E',
        cream: '#F6F1E4',
        ink: '#1F2420',
        brick: '#A9333A',
        sage: '#E4EBDF',
        line: '#D8CFB8',
        'admin-bg': '#FBFAF6',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'serif'],
        'ibm-plex-sans': ['var(--font-ibm-plex-sans)', 'sans-serif'],
        'ibm-plex-mono': ['var(--font-ibm-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
