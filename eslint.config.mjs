import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.output/**',
      '**/.wxt/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '.context/**',
      'docs/.vitepress/miragon/**',
      '.miragon/brand-lint/**',
      'docs/.vitepress/cache/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    rules: {
      // TypeScript resolves identifiers itself; no-undef only causes false
      // positives on ambient/DOM/browser-extension globals here.
      'no-undef': 'off',
      'max-classes-per-file': ['error', 1],
      // The bpmn-js / diagram-js / moddle APIs are loosely typed; we lean on
      // structural interfaces and `any` at the integration boundary.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/*/src/**/*.ts', 'packages/extension/entrypoints/**/*.ts'],
    ignores: ['**/utils/**', '**/*.d.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...[
          'Program > FunctionDeclaration',
          'Program > ExportNamedDeclaration > FunctionDeclaration',
          'Program > ExportDefaultDeclaration > FunctionDeclaration',
          'Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
          'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
        ].map((selector) => ({
          selector,
          message:
            'Top-level functions belong in a class, or in a utils/ module when they are pure helpers.',
        })),
      ],
    },
  },
  {
    files: ['.miragon/**/*.mjs'],
    languageOptions: {
      globals: { document: 'readonly', scrollBy: 'readonly', innerHeight: 'readonly' },
    },
  },
  {
    // CommonJS config files (dependency-cruiser).
    files: ['**/*.cjs'],
    languageOptions: {
      globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' },
    },
  },
)
