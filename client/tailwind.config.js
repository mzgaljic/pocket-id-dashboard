/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./node_modules/@nuxt/ui-templates/dist/**/*.{js,ts}",
    "./node_modules/@nuxt/ui/dist/**/*.{js,ts,vue}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  darkMode: 'class'
}
