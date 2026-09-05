import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export default defineConfig(({mode}) => {
  const appName = escapeHtml(loadEnv(mode, '.', 'VITE_').VITE_APP_NAME?.trim() || 'JustVotes');
  return {
    plugins: [react(), {
      name: 'configured-app-name',
      transformIndexHtml: (html: string) => html.replace('<title>JustVotes</title>', `<title>${appName}</title>`),
    }],
    server: { proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: false, secure: false } } },
  };
});
