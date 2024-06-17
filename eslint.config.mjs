import { default as js } from "@eslint/js";
import globals from "globals";

export default [
  { languageOptions: { globals: globals.node } },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
    },
  },
];
