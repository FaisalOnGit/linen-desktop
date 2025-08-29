/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#426BA8",
        secondary: "#DEF6FE",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"], // tambah font family
      },
    },
  },
  plugins: [],
};
