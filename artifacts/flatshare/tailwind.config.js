/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wise: {
          green: "#9FE870",
          dark: "#163300",
          bg: "#F5F7F8",
        },
      },
    },
  },
  plugins: [],
};
