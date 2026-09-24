import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { config } from './config.js';
import { initDatabase } from './db/database.js';
import { handleApiRequest, sendJson } from './routes/apiRouter.js';
import { realtime } from './realtime.js';

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
 * Log a consola y a server.log (junto a la app) para diagnóstico en Windows
 * cuando el servidor corre oculto (sin ventana de consola).
 */
function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(config.appRoot, 'server.log'), `${line}\n`);
  } catch {/* El log a archivo es un extra opcional */}
}

/**
 * Abre el navegador por defecto en la URL del panel (solo Windows).
 */
function openBrowser() {
  const url = `http://localhost:${config.port}`;
  exec(`cmd /c start "" "${url}"`, (err) => {
    if (err) writeLog(`[ERROR] No se pudo abrir el navegador: ${err.message}`);
  });
}

/**
 * Cierre limpio del servidor (Ctrl+C, SIGTERM de la tarea programada, etc.)
 */
function shutdown() {
  writeLog('[Servidor] Deteniéndose...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

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

// Habilitar tiempo real multi-dispositivo sobre el mismo servidor HTTP
realtime.init(server);

// Si el puerto configurado ya está en uso, salir con un mensaje claro
// (la app instalada del navegador apunta a una URL fija, por eso no se
//  cambia de puerto automáticamente).
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    writeLog(`[ERROR] El puerto ${config.port} ya está en uso por otro programa.`);
    writeLog(`        Cierra ese programa o cambia el puerto en config.local.json`);
    writeLog(`        (junto a la aplicación) y vuelve a iniciar el servidor.`);
  } else {
    writeLog(`[ERROR] Fallo del servidor: ${err.message}`);
  }
  process.exit(1);
});

// Arrancar servidor
server.listen(config.port, config.host, () => {
  writeLog(`====================================================`);
  writeLog(`🍰 Panel de Control de Mesas - Pastelería San José`);
  writeLog(`🚀 Servidor ejecutándose en: http://localhost:${config.port}`);
  writeLog(`📱 Diseñado para pantalla táctil (PWA Touch-First)`);
  writeLog(`🌐 WebSocket en: ws://<ip-local>:${config.port}`);
  const ips = getLanAddresses();
  if (ips.length) {
    writeLog(`🔗 Accede desde otros dispositivos de la red con:`);
    ips.forEach((ip) => writeLog(`   http://${ip}:${config.port}`));
  }
  writeLog(`====================================================`);

  // En Windows portable: abrir el navegador automáticamente si está activado
  if (config.autoOpenBrowser && process.platform === 'win32') {
    openBrowser();
  }
});

// Lista las direcciones IPv4 locales para conectar otros dispositivos
function getLanAddresses() {
  const result = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        result.push(net.address);
      }
    }
  }
  return result;
}
