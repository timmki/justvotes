import js from '@eslint/js';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
export default [{ ignores: ['src/shared/api/generated/**', 'dist/**'] }, js.configs.recommended, { files: ['**/*.{ts,tsx}'], languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser, ...globals.node } }, plugins: { 'react-refresh': reactRefresh }, rules: { 'react-refresh/only-export-components': 'warn' } }];
