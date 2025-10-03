/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts,scss}', './node_modules/primeng/**/*.{js,ts}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', 'sans-serif'] // tu peux mettre ce que tu veux ici
      }
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
//   plugins: [require('tailwindcss-primeui')]
};
