/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#EFE7D3",
        cream2: "#E7DCC1",
        ink: "#1C2541",
        ink2: "#141b33",
        seal: "#A32B1F",
        seal2: "#7e2117",
        gold: "#B8912F",
        charcoal: "#2A2A26",
      },
      fontFamily: {
        serif: ["Spectral", "serif"],
        sans: ['"Work Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
