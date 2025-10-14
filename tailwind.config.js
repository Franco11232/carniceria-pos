/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./index.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F53B2F",
        background: "#FFFFFF",
        surface: "#E0E0E0",
        textSecondary: "#4A4A4A",
        button: "#000000",
        buttonText: "#FFFFFF",
      },
      borderRadius: { md: 12, lg: 20, '3xl': 30 },
      spacing: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
      screens: { sm: 360, md: 412, lg: 600, xl: 768 },
    },
  },
  plugins: [],
};


