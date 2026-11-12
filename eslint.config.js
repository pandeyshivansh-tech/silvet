import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * Design-system guardrails. These exist mainly so AI screen-builders (Replit Agent)
 * cannot drift into generic UI: no raw hex colours or arbitrary pixel values in
 * className strings, and no direct Supabase/motion-library imports from feature code.
 */
const designSystemSyntax = [
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/#[0-9a-fA-F]{3,8}/]",
    message: "Use SILVET colour tokens (bg-ink, text-graphite…) instead of raw hex values.",
  },
  {
    selector: "JSXAttribute[name.name='className'] Literal[value=/\\[[0-9.]+px\\]/]",
    message: "Use the spacing/type scale instead of arbitrary pixel values.",
  },
  {
    selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/#[0-9a-fA-F]{3,8}/]",
    message: "Use SILVET colour tokens instead of raw hex values.",
  },
];

export default tseslint.config(
  { ignores: ["dist", "dist-server", "node_modules", "coverage", ".local/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs["recommended-latest"].rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "error",
      "no-restricted-syntax": ["error", ...designSystemSyntax],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@supabase/supabase-js", message: "Features use the repository hooks in @/data, never Supabase directly." },
            { name: "framer-motion", message: "Import from 'motion/react' and use presets from @/motion/presets." },
            { name: "@radix-ui/react-dialog", message: "Use Sheet / ConfirmDialog from @/ui." },
          ],
        },
      ],
    },
  },
  {
    files: ["vite.config.ts", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
);
