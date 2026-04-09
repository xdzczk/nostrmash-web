/** @type {import("prettier").Config} */
module.exports = {
  plugins: ["prettier-plugin-tailwindcss"],
  singleQuote: false,
  semi: true,
  trailingComma: "es5",
  printWidth: 100,
  overrides: [
    {
      files: ["package.json", "pnpm-lock.yaml"],
      options: {
        printWidth: 1000,
      },
    },
  ],
};
