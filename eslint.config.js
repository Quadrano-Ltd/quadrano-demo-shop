import js from '@eslint/js';
import { builtinModules } from 'node:module';
import tseslint from 'typescript-eslint';

const builtinImportNames = builtinModules.map((name) => name.replace(/^node:/, ''));
const verdictSelector =
  String.raw`Literal[value=/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i]`;
const templateVerdictSelector =
  String.raw`TemplateElement[value.raw=/[✓✗⚠✅❌]|\b(pass(ed|es)?|fail(ed|s|ure)?|valid|invalid)\b/i]`;
const networkSelectors = [
  "CallExpression[callee.name='fetch']",
  "NewExpression[callee.name='XMLHttpRequest']",
  "NewExpression[callee.name='WebSocket']",
  "NewExpression[callee.name='EventSource']",
  "MemberExpression[property.name='sendBeacon']",
];
const dataLayerRestrictions = {
  'no-restricted-globals': [
    'error',
    {
      name: 'dataLayer',
      message: 'Only site/src/datalayer/push.ts may touch dataLayer (FR-016)',
    },
  ],
  'no-restricted-properties': [
    'error',
    {
      object: 'window',
      property: 'dataLayer',
      message: 'Only site/src/datalayer/push.ts may touch dataLayer (FR-016)',
    },
    {
      object: 'globalThis',
      property: 'dataLayer',
      message: 'Only site/src/datalayer/push.ts may touch dataLayer (FR-016)',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '.git/**',
      'dist/**',
      'node_modules/**',
      '.worktrees/**',
      '.kittify/**',
      'kitty-specs/**',
      '.claude/**',
      '.codex/**',
      '.vibe/**',
      '.pi/**',
      '.letta/**',
      '.opencode/**',
      '.windsurf/**',
      '.gemini/**',
      '.cursor/**',
      '.qwen/**',
      '.kilocode/**',
      '.augment/**',
      '.amazonq/**',
      '.kiro/**',
      '.agent/**',
      '.agents/**',
      '.github/**',
      'kitty-ops/**',
      '.vite/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    ...tseslint.configs.disableTypeChecked,
    files: ['**/*.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['site/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: verdictSelector,
          message: 'Shop text must not contain verdict wording (FR-017)',
        },
        {
          selector: templateVerdictSelector,
          message: 'Shop text must not contain verdict wording (FR-017)',
        },
        ...networkSelectors.map((selector) => ({
          selector,
          message: 'No network requests from shop code (NFR-004)',
        })),
      ],
      ...dataLayerRestrictions,
      'no-restricted-imports': [
        'error',
        {
          paths: builtinImportNames.map((name) => ({
            name,
            message: 'Node built-ins are not available in browser code',
          })),
          patterns: [
            {
              group: ['node:*'],
              message: 'Node built-ins are not available in browser code',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['site/src/datalayer/push.ts'],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
