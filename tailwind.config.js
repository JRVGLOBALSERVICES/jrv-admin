/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // ✅ Sets Inter as the default sans-serif font
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        // Keep your signature font if needed
        signature: ["Signature", "cursive"],
      },
    },
  },
  plugins: [],
};
