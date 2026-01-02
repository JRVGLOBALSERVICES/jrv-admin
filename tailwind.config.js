/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ✅ 1. Define the Keyframes (Timeline)
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" }, // Start: Invisible, slightly down
          "100%": { opacity: "1", transform: "translateY(0)" }, // End: Visible, in place
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.8)" }, // Start: Invisible, small
          "100%": { opacity: "1", transform: "scale(1)" }, // End: Visible, normal size
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      // ✅ 2. Define the Animation Utility Classes
      animation: {
        "fade-in-up": "fade-in-up 0.8s ease-out forwards", // Runs for 0.8s
        "scale-in": "scale-in 0.7s ease-out forwards", // Runs for 0.7s
        "fade-out": "fade-out 0.5s ease-in forwards",
      },
    },
  },
  plugins: [],
};
