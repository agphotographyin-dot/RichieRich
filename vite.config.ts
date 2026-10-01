import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split('/')[1] : '';
  const isUserPage = repoName.toLowerCase().endsWith('.github.io');
  const githubBase = process.env.GITHUB_ACTIONS && repoName && !isUserPage ? `/${repoName}/` : '/';
  const base = process.env.BASE_PATH || process.env.VITE_BASE_PATH || githubBase;

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
