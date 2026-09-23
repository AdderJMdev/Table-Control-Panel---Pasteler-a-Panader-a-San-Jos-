import http from 'http';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { handleApiRequest, sendJson } from './routes/apiRouter.js';

// Mapa de tipos MIME para archivos estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

/**
 * Servidor de archivos estáticos nativo para frontend Vanilla PWA (RNF-04, RNF-05)
 */
function serveStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  // Normalizar ruta para evitar directory traversal
  const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(config.publicDir, safePath);

  // Asegurar que la ruta permanezca dentro del directorio public
  if (!filePath.startsWith(config.publicDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Acceso Denegado');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback a index.html para soportar navegación PWA si no es un archivo estático con extensión
      if (!path.extname(safePath)) {
        const indexPath = path.join(config.publicDir, 'index.html');
        return fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 No Encontrado');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Archivo No Encontrado');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Headers especiales para Service Worker y PWA
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size
    };

    if (filePath.endsWith('service-worker.js')) {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Service-Worker-Allowed'] = '/';
    }

    res.writeHead(200, headers);
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  });
}

// Inicializar esquema de base de datos SQLite antes de escuchar peticiones
initDatabase();

// Crear servidor HTTP nativo
const server = http.createServer(async (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || `${config.host}:${config.port}`;
  const parsedUrl = new URL(req.url, `${protocol}://${host}`);

  // Habilitar CORS para desarrollo local si fuera necesario
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Rutas de API REST
  if (parsedUrl.pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, parsedUrl);
  }

  // Archivos estáticos del frontend
  serveStaticFile(req, res, parsedUrl.pathname);
});

// Arrancar servidor
server.listen(config.port, config.host, () => {
  console.log(`====================================================`);
  console.log(`🍰 Panel de Control de Mesas - Pastelería San José`);
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${config.port}`);
  console.log(`📱 Diseñado para pantalla táctil (PWA Touch-First)`);
  console.log(`====================================================`);
});
