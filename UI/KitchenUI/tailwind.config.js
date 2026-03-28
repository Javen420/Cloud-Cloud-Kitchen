/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        kitchen: {
          bg: "#0f1419",
          card: "#1a222d",
          border: "#2d3a4d",
          accent: "#3b82f6",
          success: "#22c55e",
          warn: "#f97316",
        },
      },
    },
  },
  plugins: [],
};
