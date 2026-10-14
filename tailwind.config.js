/** Styles are compiled at build time from the class names used in the
 *  source (they used to be compiled in each visitor's browser by the
 *  Tailwind CDN script). Any file that holds class names must be listed. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
