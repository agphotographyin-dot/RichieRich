import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

if (fs.existsSync(distDir)) {
  const indexHtmlPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');

    // 1. Create 404.html fallback for static hosts
    fs.writeFileSync(path.join(distDir, '404.html'), htmlContent);

    // 2. Direct route destinations
    const routes = [
      'pos',
      'admin',
      'warehouse',
      'store-admin',
      'store-admin/indents',
      'store-admin/inventory',
      'store-admin/expenses',
      'store-admin/finances',
      'store-admin/orders',
      'storeadmin',
      'customer',
      'order',
      'menu',
    ];

    routes.forEach((route) => {
      // Create .html extension fallback (e.g. dist/pos.html)
      fs.writeFileSync(path.join(distDir, `${route}.html`), htmlContent);

      // Create folder with index.html (e.g. dist/pos/index.html)
      const routeDir = path.join(distDir, route);
      if (!fs.existsSync(routeDir)) {
        fs.mkdirSync(routeDir, { recursive: true });
      }
      fs.writeFileSync(path.join(routeDir, 'index.html'), htmlContent);
    });

    console.log('✓ SPA deep linking fallback pages generated successfully in dist/');
  }
}
